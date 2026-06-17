// ============================================================================
// Game.js — Kontroler pusat. Menyatukan Multi-FSM + seluruh sistem.
// Memegang state persisten (coin, upgrade, level terbuka) dan state per-level.
// ============================================================================

import { EventBus, EV } from './EventBus.js';
import { CONFIG } from '../data/config.js';
import { getLevel, LEVELS } from '../data/levels.js';
import { defaultUpgradeState, UPGRADES } from '../data/upgrades.js';
import { defaultMods } from '../data/events.js';

import { createGameFSM, FLOW } from '../fsm/GameFSM.js';
import { Warehouse } from '../objects/Warehouse.js';
import { Vehicle } from '../objects/Vehicle.js';
import { Staff } from '../objects/Staff.js';
import { PlayerCharacter, stationForPackage, stationLabel } from '../objects/PlayerCharacter.js';

import { ScoreSystem } from '../systems/ScoreSystem.js';
import { KPICalculator } from '../systems/KPICalculator.js';
import { RuleEngine } from '../systems/RuleEngine.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { OrderGenerator } from '../systems/OrderGenerator.js';
import { RandomEventSystem } from '../systems/RandomEventSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';

export class Game {
  constructor() {
    this.bus = new EventBus();
    this.audio = new AudioSystem(this);

    // -- state persisten antar-level --
    this.coins = 0;
    this.unlocked = 1; // level tertinggi yang terbuka
    this.upgrades = defaultUpgradeState();
    this.totalScore = 0;

    this.scenes = null; // di-attach dari main.js
    this.gameFSM = null;
    this.lastResult = null;
    this.toasts = [];

    this._wireToasts();
  }

  // ------------------------------------------------------------------ setup
  attachScenes(sceneManager) { this.scenes = sceneManager; }

  begin() {
    this.gameFSM = createGameFSM(this); // onEnter main_menu → showScene('MainMenu')
  }

  showScene(name) {
    if (this.scenes) this.scenes.show(name);
  }

  get flow() { return this.gameFSM ? this.gameFSM.state : FLOW.MAIN_MENU; }
  isPlaying() { return this.gameFSM && this.gameFSM.is('playing'); }

  // ----------------------------------------------------------- level lifecycle
  startLevel(levelId) {
    this.level = getLevel(levelId);
    this.currentLevelId = this.level.id;

    // reset modifier event & terapkan ulang upgrade kapasitas
    this.mods = defaultMods();
    this._applyUpgrades(); // rebuild turunan upgrade dari daftar owned

    // waktu
    this.duration = this.level.duration;
    this.elapsed = 0;
    this.timeLeft = this.duration;
    this.now = 0;
    this.ended = false;
    this.running = true;
    this.selectedId = null;

    // objek dunia
    this.packages = [];
    this.warehouse = new Warehouse(this);
    this.operator = new PlayerCharacter(this);
    this.staff = Array.from({ length: CONFIG.STAFF.COUNT }, (_, i) => new Staff(i, this));

    // armada: dari level + tambahan dari upgrade Extra Courier
    const fleet = [...this.level.vehicles, ...this.upgrades.extraVehicles].slice(0, CONFIG.DISPATCH_SLOTS + this.upgrades.extraVehicles.length);
    this.vehicles = fleet.map((t) => new Vehicle(t, this));

    // sistem (dibuat baru tiap level, listener lama dibersihkan)
    this.bus.clear();
    this.audio.rewire(); // pertahankan AudioContext, pasang ulang listener
    this.score = new ScoreSystem(this);
    this.kpi = new KPICalculator(this);
    this.rules = new RuleEngine(this);
    this.missions = new MissionSystem(this);
    this.missions.load(this.level.missions || []);
    this.orderGen = new OrderGenerator(this);
    this.events = new RandomEventSystem(this);

    this._wireToasts();
    this.audio.startMusic();

    this.gameFSM.force('playing');
  }

  pause() { if (this.gameFSM.is('playing')) this.gameFSM.transition('paused'); }
  resume() { if (this.gameFSM.is('paused')) this.gameFSM.transition('playing'); }
  togglePause() { this.gameFSM.is('paused') ? this.resume() : this.pause(); }

  quitToMenu() {
    this.running = false;
    this.audio.stopMusic();
    this.gameFSM.force('main_menu');
  }

  /** Akhiri level: forced='lose' untuk kalah langsung, atau evaluasi otomatis. */
  endLevel(forced = null, reason = '') {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    this.audio.stopMusic();

    const snap = this.kpiSnapshot();
    const need = {
      satisfaction: this.level.pass?.satisfaction ?? CONFIG.PASS.SATISFACTION_MIN,
      accuracy: this.level.pass?.accuracy ?? CONFIG.PASS.SORTING_ACCURACY_MIN,
      ontime: this.level.pass?.ontime ?? CONFIG.PASS.ONTIME_MIN,
      damageMax: this.level.pass?.damageMax ?? 100,
    };

    let win;
    if (forced === 'lose') win = false;
    else win =
      snap.delivered >= this.level.targetDelivered &&
      snap.satisfaction >= need.satisfaction &&
      snap.sortingAccuracy >= need.accuracy &&
      snap.ontimeRate >= need.ontime &&
      snap.damageRate <= need.damageMax;

    const gradeBonus = { A: 80, B: 50, C: 25, D: 10 }[snap.grade] || 0;
    let coins = Math.floor(this.score.score / 40) + gradeBonus;
    if (!win) coins = Math.floor(coins * 0.4);

    this.lastResult = {
      win, reason, need,
      snapshot: snap,
      missions: this.missions.evaluate(snap),
      score: this.score.score,
      maxCombo: this.score.maxCombo,
      level: this.level,
      coins,
      isLastLevel: this.level.id >= LEVELS.length,
      insights: this._buildOperationalInsights(snap, need, win),
    };

    this.coins += coins;
    this.totalScore += this.score.score;
    if (win) this.unlocked = Math.max(this.unlocked, Math.min(this.level.id + 1, LEVELS.length));

    this.gameFSM.transition(win ? 'level_complete' : 'game_over');
  }

  // ----------------------------------------------------------------- upgrades
  buyUpgrade(id) {
    const up = UPGRADES[id];
    if (!up || this.upgrades.owned.includes(id) || this.coins < up.cost) return false;
    this.coins -= up.cost;
    this.upgrades.owned.push(id);
    this._applyUpgrades();
    return true;
  }

  _applyUpgrades() {
    const owned = this.upgrades.owned.slice();
    const fresh = defaultUpgradeState();
    fresh.owned = owned;
    for (const id of owned) UPGRADES[id]?.apply(fresh);
    this.upgrades = fresh;
  }

  goToUpgrade() { if (this.gameFSM.is('level_complete')) this.gameFSM.transition('upgrade'); }
  nextLevel() {
    const next = Math.min(this.currentLevelId + 1, LEVELS.length);
    this.startLevel(next);
  }
  replayLevel() { this.startLevel(this.currentLevelId); }

  // ------------------------------------------------------------- aksi player
  select(id) { this.selectedId = id; }
  getSelected() { return this.packages.find((p) => p.id === this.selectedId) || null; }

  selectedTaskStation() {
    return stationForPackage(this.getSelected());
  }

  moveOperatorTo(stationId) {
    if (!this.operator) return false;
    const ok = this.operator.setWaypoint(stationId);
    if (ok) {
      this.bus.emit(EV.TOAST, { text: `Marker tujuan: ${stationLabel(stationId)}`, kind: 'info' });
      this.audio.play('click');
    }
    return ok;
  }

  moveOperatorToSelectedTask() {
    const station = this.selectedTaskStation();
    if (!station) {
      this.bus.emit(EV.TOAST, { text: 'Tahap ini belum butuh station manual.', kind: 'info' });
      return false;
    }
    return this.moveOperatorTo(station);
  }

  operatorReadyFor(pkg) {
    const station = stationForPackage(pkg);
    return !station || this.operator?.at(station);
  }

  _requireOperatorAt(pkg, actionName) {
    const station = stationForPackage(pkg);
    if (!station || this.operator?.at(station)) return true;
    const label = stationLabel(station);
    this.bus.emit(EV.TOAST, {
      text: `Dekati ${label} dulu untuk ${actionName}.`,
      kind: 'bad',
    });
    this.audio.play('error');
    return false;
  }

  actScan(code = null) {
    const p = this.getSelected();
    if (!p || !this._requireOperatorAt(p, 'scan')) return;
    if (code == null) {
      this.bus.emit(EV.TOAST, { text: 'Masukkan kode barcode dulu di scanner terminal.', kind: 'bad' });
      this.audio.play('error');
      return;
    }
    const clean = String(code).trim().toUpperCase();
    const expected = p.code.toUpperCase();
    if (clean !== expected && clean !== expected.slice(-5)) {
      this.bus.emit(EV.TOAST, { text: 'Barcode tidak cocok dengan paket aktif.', kind: 'bad' });
      this.audio.play('error');
      return;
    }
    p.scanValidated = true;
    if (p.beginScan()) this.audio.play('click');
  }

  actSort(routeId) {
    const p = this.getSelected();
    if (!p || !this._requireOperatorAt(p, 'sortir')) return;
    if (p && p.chooseSort(routeId)) this.audio.play('click');
  }

  actPack() {
    const p = this.getSelected();
    if (!p || !this._requireOperatorAt(p, 'packing')) return;
    if (p.beginPack()) this.audio.play('click');
  }

  actLoad(vehicleId) {
    const p = this.getSelected();
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (!p || !this._requireOperatorAt(p, 'loading')) return;
    if (!p || !v || p.state !== 'ready_to_load') return;
    const res = v.accept(p);
    if (res.ok) {
      this.audio.play('click');
      this.bus.emit(EV.PACKAGE_LOADED, { pkg: p, veh: v });
      this.selectedId = null;
    } else {
      if (res.misfit) this.bus.emit(EV.VEHICLE_MISFIT, { pkg: p, veh: v });
      this.bus.emit(EV.TOAST, { text: res.reason, kind: 'bad' });
      this.audio.play('error');
    }
  }

  actDispatch(vehicleId) {
    const v = this.vehicles.find((x) => x.id === vehicleId);
    if (v && v.dispatch()) this.audio.play('click');
  }

  // -------------------------------------------------------------- helper sim
  /** Pengali durasi proses gabungan: overload gudang × kelelahan staff × upgrade. */
  slowFactor() {
    const tiredRatio = this.staff.filter((s) => s.isTired()).length / Math.max(1, this.staff.length);
    const staffFactor = (1 + tiredRatio * (CONFIG.STAFF.TIRED_SLOW_FACTOR - 1)) * this.upgrades.staffSpeed;
    return this.warehouse.slowFactor * staffFactor;
  }
  staffTired() { return this.staff.some((s) => s.isTired()); }

  kpiSnapshot() { return this.kpi.snapshot(); }

  // ------------------------------------------------------------------- toasts
  _wireToasts() {
    this.bus.on(EV.TOAST, ({ text, kind }) => {
      this.toasts.push({ text, kind: kind || 'info', t: performance.now() });
      if (this.toasts.length > 5) this.toasts.shift();
    });
  }

  // -------------------------------------------------------------------- loop
  update(dt) {
    if (!this.isPlaying() || !this.running) return;

    this.now += dt;
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.duration - this.elapsed);

    this.orderGen.update(dt);
    this.events.update(dt);
    for (const p of this.packages) p.update(dt);
    this.warehouse.update(dt);
    this.operator.update(dt);
    for (const v of this.vehicles) v.update(dt);
    for (const s of this.staff) s.update(dt);
    this.rules.update(dt);

    this._cleanup();

    if (this.timeLeft <= 0 && this._allTripsSettled()) this.endLevel();
  }

  _cleanup() {
    const now = this.now;
    for (const p of this.packages) {
      if (p.isFinal() && p.finalAt == null) p.finalAt = now;
    }
    // buang paket final yang sudah ditampilkan sebentar; jaga selection valid
    this.packages = this.packages.filter((p) => !(p.isFinal() && now - p.finalAt > 1.2));
    if (this.selectedId && !this.packages.find((p) => p.id === this.selectedId)) this.selectedId = null;
  }

  /** Saat waktu habis, tunggu kendaraan yang masih mengirim selesai dulu. */
  _allTripsSettled() {
    return !this.vehicles.some((v) => v.fsm.isAny('departing', 'delivering', 'delayed', 'arrived'));
  }

  _buildOperationalInsights(snap, need, win) {
    const tips = [];
    const add = (kind, title, body) => tips.push({ kind, title, body });

    if (snap.sortingAccuracy < need.accuracy) {
      add('bad', 'Akurasi sortir perlu dijaga',
        'Salah rute membuat paket masuk armada yang tidak optimal dan langsung menurunkan combo. Cocokkan kota tujuan setelah scan sebelum memilih jalur sortir.');
    }

    if (snap.ontimeRate < need.ontime || snap.expressLate > 0) {
      add('warn', 'Dispatch jangan terlalu menunggu penuh',
        'Paket express punya deadline pendek. Kirim motor/van lebih cepat saat ada express, meskipun kapasitas kendaraan belum penuh.');
    }

    if (snap.damageRate > need.damageMax || snap.damaged > 0) {
      add('bad', 'Fragile butuh gudang yang tidak padat',
        'Risiko damage naik saat gudang overload atau staff lelah. Proses fragile lebih awal dan kurangi antrian sebelum masuk quality check.');
    }

    if (snap.overloadSeconds >= 8) {
      add('warn', 'Overload memperlambat seluruh proses',
        'Saat area gudang penuh, durasi scan, sorting, dan packing ikut melambat. Prioritaskan paket yang hampir deadline untuk mengosongkan bottleneck.');
    }

    if (snap.vehicleMisfit > 0) {
      add('warn', 'Kendaraan harus sesuai karakter paket',
        'Oversize wajib memakai truck, sedangkan express lebih cocok ke motor atau van yang cepat. Cek kapasitas sebelum loading.');
    }

    if (!tips.length) {
      add(win ? 'good' : 'warn', win ? 'Operasi sudah stabil' : 'Fondasi sudah benar',
        win
          ? 'Alur pickup, scan, sortir, packing, loading, dan dispatch berjalan rapi. Tantangan berikutnya adalah menjaga konsistensi saat event acak aktif.'
          : 'Mulai dari satu paket prioritas, bawa operator ke station yang benar, lalu dispatch lebih awal untuk menaikkan on-time delivery.');
    }

    return tips.slice(0, 4);
  }
}
