// ============================================================================
// GameScene.js — Gameplay utama. Alur dibuat "langkah demi langkah" ala
// simulasi nyata: tiap tahap (Scan → Sortir → Packing → Loading → Dispatch)
// membuka POP-UP PROSES yang MEMBEKUKAN WAKTU, menjelaskan apa yang terjadi,
// dan memberi kontrol pilih (bukan ketik). Operator otomatis ditempatkan di
// station yang tepat saat pop-up dibuka.
// ============================================================================

import { icon, iconEl } from '../ui/icons.js';
import { StageView } from '../ui/StageView.js';
import { vehicleSide } from '../ui/characters.js';
import { CONFIG } from '../data/config.js';
import { ROUTES } from '../data/routes.js';
import { DELIVERY_MAP, DELIVERY_ROADS, deliveryStop } from '../data/deliveryMap.js';
import { formatTime, clamp } from '../core/Utils.js';

// Penjelasan tiap langkah (edukasi proses logistik nyata)
const STEP_INFO = {
  scan: {
    icon: 'scan', sub: 'Scan & Verifikasi', station: 'pickup',
    title: 'Stasiun Scan',
    desc: 'Setiap paket masuk wajib diverifikasi. Cocokkan label resi fisik dengan data di manifest — scan yang benar membuka kota tujuan paket sehingga bisa disortir.',
  },
  sort: {
    icon: 'sorting', sub: 'Sorting Rute', station: 'sorting',
    title: 'Sorting Line',
    desc: 'Arahkan paket ke jalur kota tujuannya. Salah jalur menurunkan akurasi sortir, memutus combo, dan membuat paket naik armada yang keliru.',
  },
  pack: {
    icon: 'pack', sub: 'Pengemasan', station: 'packing',
    title: 'Packing Bench',
    desc: 'Kemas paket agar aman selama perjalanan. Paket fragile butuh penanganan ekstra hati-hati supaya tidak rusak saat quality check.',
  },
  load: {
    icon: 'load', sub: 'Muat Armada', station: 'loading',
    title: 'Loading Dock',
    desc: 'Pilih kendaraan yang kapasitas dan jenisnya cocok. Oversize wajib truck; express paling cepat lewat motor/van.',
  },
  dispatch: {
    icon: 'dispatch', sub: 'Berangkatkan', station: null,
    title: 'Dispatch',
    desc: 'Kirim kendaraan ke kota tujuan. Jangan menunggu terlalu penuh ketika ada express — deadline-nya pendek.',
  },
};

export class GameScene {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this._acc = 0;
    this._interval = 1 / CONFIG.RENDER_HZ;
    this.keys = new Set();
    this.joy = { x: 0, y: 0 };
    this._joyPointer = null;
    this._touchAbort = null;

    this.modal = null;        // id paket yang pop-up prosesnya terbuka
    this.guiding = null;      // id paket yang sedang dipandu langkah-demi-langkah
    this.scanOptions = null;  // { pkg, list } cache opsi barcode
    this.scanWrong = null;    // kode yang salah dipilih (umpan balik)
    this.manualRun = null;    // sesi dispatch manual di peta antar-wilayah
    this.driveButtons = new Set();
  }

  mount() {
    this.root.innerHTML = `
      <div class="scene game-scene">
        <div id="hud"></div>
        <div class="sim-shell">
          <main class="warehouse-screen">
            <div id="event-banner"></div>
            <div class="stage-frame">
              <div id="stage"></div>
            </div>
            <section class="fleet-panel">
              <header class="fleet-head">
                <div>
                  <span class="command-eyebrow">Fleet Control</span>
                  <h2>Kendaraan Ekspedisi</h2>
                </div>
                <span class="dock-hint">R dispatch kendaraan siap</span>
              </header>
              <div id="board" class="fleet-board"></div>
            </section>
          </main>

          <aside class="command-terminal">
            <header class="command-head">
              <div>
                <span class="command-eyebrow">Command Terminal</span>
                <h2>Operasi Paket</h2>
              </div>
              <span class="terminal-live">LIVE</span>
            </header>
            <div id="coach"></div>
            <div id="panel" class="panel"></div>
          </aside>
        </div>
        <div id="toasts" class="toasts"></div>
        <div class="touch-controls">
          <div class="stick-zone" aria-label="Analog gerak">
            <span class="stick-knob"></span>
          </div>
          <div class="touch-actions">
            <button class="touch-btn" data-action="context-action">Proses</button>
            <button class="touch-btn" data-action="next-package">Paket</button>
            <button class="touch-btn" data-action="dispatch-ready">Kirim</button>
          </div>
        </div>
        <div id="overlay" class="overlay hidden"></div>
      </div>`;
    this.root.onclick = (e) => this.onClick(e);
    this._pointerDown = (e) => this.onPointerDown(e);
    this._pointerUp = (e) => this.onPointerUp(e);
    this.root.addEventListener('pointerdown', this._pointerDown);
    this.root.addEventListener('pointerup', this._pointerUp);
    this.root.addEventListener('pointercancel', this._pointerUp);
    this._keyDown = (e) => this.onKeyDown(e);
    this._keyUp = (e) => this.onKeyUp(e);
    document.addEventListener('keydown', this._keyDown);
    document.addEventListener('keyup', this._keyUp);

    this.stage = new StageView(this.game);
    this.stage.mount(this.$('stage'));
    this.setupTouchControls();

    this.render();
  }

  unmount() {
    this.root.onclick = null;
    this.root.removeEventListener('pointerdown', this._pointerDown);
    this.root.removeEventListener('pointerup', this._pointerUp);
    this.root.removeEventListener('pointercancel', this._pointerUp);
    document.removeEventListener('keydown', this._keyDown);
    document.removeEventListener('keyup', this._keyUp);
    this._touchAbort?.abort();
    if (this.manualRun) this.continueManualAsAuto(false);
    this.game.operator?.clearMoveInput();
    this.game.modalPaused = false;
    this.stage?.destroy();
    this.stage = null;
  }

  refresh() { this.render(); }

  update(dt) {
    this.applyMovementInput();
    this.autoGuide();
    if (this.stage) {
      this.stage.setPaused(this.game.gameFSM.is('paused') || this.game.modalPaused);
      this.stage.update();
    }
    this.updateManualDelivery(dt);
    // pop-up proses terbuka → tampilan statis (waktu beku). Jangan re-render
    // periodik agar animasi modal tidak ter-replay; interaksi tetap render manual.
    if (this.game.modalPaused) return;
    this._acc += dt;
    if (this._acc >= this._interval) { this._acc = 0; this.render(); }
  }

  /** Pandu otomatis: saat paket yang dipandu mencapai langkah baru, buka pop-up. */
  autoGuide() {
    const g = this.game;
    if (this.modal || g.gameFSM.is('paused') || !g.isPlaying()) return;
    if (!this.guiding) return;
    const p = g.packages.find((x) => x.id === this.guiding);
    if (!p || p.isFinal()) { this.guiding = null; return; }
    if (this.stepFor(p)) this.openProcess(p.id, true);
  }

  // ----------------------------------------------------------------- render
  render() {
    const g = this.game;
    if (!g.warehouse) return;
    this.$('hud').innerHTML = this.renderHUD();
    this.$('coach').innerHTML = this.renderCoach();
    this.$('board').innerHTML = this.renderBoard();
    this.$('panel').innerHTML = this.renderPanel();
    this.$('event-banner').innerHTML = this.renderEventBanner();
    this.$('toasts').innerHTML = this.renderToasts();
    this.renderOverlay();
  }

  $(id) { return this.root.querySelector('#' + id); }

  // ------------------------------------------------------- langkah / proses
  /** Langkah aktif untuk paket (null bila sedang otomatis diproses / final). */
  stepFor(p) {
    if (!p || p.isFinal()) return null;
    if (p.state === 'waiting_scan') return p.scanInitiated ? null : 'scan';
    if (p.state === 'scanned') return 'sort';
    if (p.state === 'sorted') return 'pack';
    if (p.state === 'ready_to_load') return 'load';
    if (p.state === 'loaded' || p.state === 'stored') return 'dispatch';
    return null;
  }

  openProcess(pkgId = null, guide = true) {
    const g = this.game;
    const p = pkgId ? g.packages.find((x) => x.id === pkgId) : g.getSelected();
    if (!p) return;
    g.select(p.id);
    if (guide) this.guiding = p.id;
    this.scanOptions = null;
    this.scanWrong = null;

    const step = this.stepFor(p);
    if (!step) { this.render(); return; } // belum bisa diproses (mis. sedang berjalan)

    const info = STEP_INFO[step];
    if (info.station) g.operator?.snapTo(info.station); // operator hadir di station
    this.modal = p.id;
    g.modalPaused = true; // ⏸ waktu berhenti selama pop-up terbuka
    this.render();
  }

  closeProcess(stopGuide = false) {
    this.modal = null;
    this.game.modalPaused = false;
    this.scanOptions = null;
    this.scanWrong = null;
    if (stopGuide) this.guiding = null;
    this.render();
  }

  // ----- opsi barcode untuk langkah scan (pilih, bukan ketik) --------------
  buildScanOptions(p) {
    if (this.scanOptions && this.scanOptions.pkg === p.id) return this.scanOptions.list;
    const real = p.code;
    const set = new Set([real]);
    let guard = 0;
    while (set.size < 4 && guard++ < 40) set.add(this.mutateCode(real));
    const list = [...set];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    this.scanOptions = { pkg: p.id, list };
    return list;
  }

  /** Ubah satu karakter alfanumerik kode (lewati prefiks "SE-") jadi decoy mirip. */
  mutateCode(code) {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const chars = code.split('');
    const start = code.indexOf('-') + 1 || 0;
    const idx = start + Math.floor(Math.random() * (code.length - start));
    const c = chars[idx];
    if (/[0-9]/.test(c)) {
      let d; do { d = String(Math.floor(Math.random() * 10)); } while (d === c);
      chars[idx] = d;
    } else if (/[A-Z]/i.test(c)) {
      let l; do { l = letters[Math.floor(Math.random() * letters.length)]; } while (l === c);
      chars[idx] = l;
    } else {
      chars[idx] = String(Math.floor(Math.random() * 10));
    }
    return chars.join('');
  }

  pickScan(code) {
    const g = this.game;
    const p = g.getSelected();
    if (!p) return;
    g.audio.resume();
    if (code === p.code) {
      g.actScan(p.code);   // lolos verifikasi → mulai proses scan
      g.audio.play('scan');
      this.closeProcess(false); // tetap dipandu ke langkah berikutnya
    } else {
      this.scanWrong = code;
      g.bus.emit('toast', { text: 'Barcode tidak cocok dengan label. Periksa lagi!', kind: 'bad' });
      g.audio.play('error');
      this.render();
    }
  }

  // ----------------------------------------------------------------- HUD
  renderHUD() {
    const g = this.game;
    const snap = g.kpiSnapshot();
    const wh = g.warehouse;
    const sat = snap.satisfaction;
    const satClass = sat < 35 ? 'bad' : sat < 60 ? 'warn' : 'good';
    const whRatio = clamp(wh.ratio, 0, 1.2);
    const timeUrgent = g.timeLeft <= 20 ? 'urgent' : '';
    const mult = g.score.multiplier;

    const missions = g.missions.evaluate(snap).map((m) =>
      `<span class="mchip ${m.done ? 'done' : ''}" title="${m.label}">${m.done ? '✓' : '•'} ${m.type}: ${m.progress}</span>`
    ).join('');

    const floaters = g.score.floaters
      .filter((f) => performance.now() - f.t < 1100)
      .slice(-3)
      .map((f) => `<span class="floater ${f.amount >= 0 ? 'pos' : 'neg'}">${f.amount >= 0 ? '+' : ''}${f.amount} <i>${f.label}</i></span>`)
      .join('');

    return `
      <header class="hud">
        <div class="hud-left">
          <div class="hud-level">
            <span class="hud-day">${g.level.subtitle}</span>
            <span class="hud-lname">${g.level.name}</span>
          </div>
          <div class="hud-timer ${timeUrgent}">${iconEl('clock')} ${formatTime(g.timeLeft)}</div>
        </div>

        <div class="hud-center">
          <div class="stat score">
            <span class="stat-k">Score</span>
            <span class="stat-v">${g.score.score.toLocaleString('id-ID')}</span>
            <span class="combo ${g.score.superMode ? 'super' : ''}">${mult > 1 ? `Combo x${mult}` : ''} ${g.score.combo > 0 ? `(${g.score.combo})` : ''}</span>
          </div>
          <div class="floaters">${floaters}</div>
        </div>

        <div class="hud-right">
          <div class="gauge-block">
            <span class="gauge-k">${iconEl('star')} Satisfaction</span>
            <div class="bar ${satClass}"><i style="width:${sat}%"></i><b>${Math.round(sat)}%</b></div>
          </div>
          <div class="gauge-block">
            <span class="gauge-k">${iconEl('gauge')} Gudang: <em class="wh-${wh.state}">${wh.stateLabel}</em></span>
            <div class="bar wh ${wh.isOverloaded() ? 'bad' : whRatio > 0.6 ? 'warn' : 'good'}"><i style="width:${Math.min(100, whRatio * 100)}%"></i></div>
          </div>
          <div class="hud-controls">
            <button class="iconbtn" data-action="pause" title="Pause (Esc)">${iconEl(g.gameFSM.is('paused') ? 'play' : 'pause')}</button>
            <button class="iconbtn" data-action="mute" title="Mute">${g.audio.muted ? '🔇' : '🔊'}</button>
          </div>
        </div>
      </header>
      <div class="mission-bar">
        <span class="mb-target">🎯 Terkirim ${snap.delivered}/${g.level.targetDelivered}</span>
        ${missions}
      </div>`;
  }

  // ----------------------------------------------------- coach (ringkas)
  renderCoach() {
    const g = this.game;
    const p = g.getSelected();
    const step = this.stepFor(p);

    let primary;
    if (!p) {
      primary = `<button class="btn btn-primary coach-primary" data-action="next-package">${iconEl('box')} Ambil Paket Berikutnya</button>`;
    } else if (step) {
      const info = STEP_INFO[step];
      primary = `<button class="btn btn-accent coach-primary" data-action="proc-open">${iconEl(info.icon)} Buka Proses · ${info.sub}</button>`;
    } else {
      primary = `<button class="btn coach-primary" disabled>${iconEl('clock')} Sedang diproses…</button>`;
    }

    let objective;
    if (!p) objective = 'Tekan tombol untuk mengambil paket paling mendesak, lalu jalankan prosesnya satu per satu.';
    else if (step) objective = `Langkah berikutnya: <b>${STEP_INFO[step].title}</b>. Buka pop-up proses — waktu akan berhenti agar bisa fokus.`;
    else objective = 'Paket sedang melewati proses otomatis. Tunggu sebentar hingga langkah berikutnya siap.';

    const active = p
      ? `<b>${p.code}</b><span>${p.typeData.name} · ${p.stateLabel}</span>`
      : `<b>Tidak ada paket aktif</b><span>Pilih paket di map atau tekan Q</span>`;

    return `
      <div class="action-console ${step ? 'ready' : 'idle'}">
        <div class="console-top">
          <div>
            <span class="console-label">Operator</span>
            <b>${g.operator?.stationLabel}</b>
          </div>
          <div>
            <span class="console-label">Paket Aktif</span>
            ${active}
          </div>
        </div>
        <div class="console-objective"><span>${objective}</span></div>
        <div class="console-actions">${primary}</div>
      </div>`;
  }

  // ----------------------------------------------------- board (fleet)
  renderBoard() {
    const g = this.game;
    const vehicles = g.vehicles.map((v) => this.vcard(v)).join('');
    const snap = g.kpiSnapshot();
    return `
      <div class="fleet-summary">
        <span>${iconEl('box')} Aktif: <b>${g.packages.length}</b></span>
        <span>${iconEl('check')} Terkirim: <b>${snap.delivered}/${g.level.targetDelivered}</b></span>
        <span>${iconEl('warning')} Salah sortir: <b>${snap.wrongSorts}</b></span>
      </div>
      <div class="vehicles">${vehicles}</div>`;
  }

  vcard(v) {
    const st = v.state;
    let extra = '';
    if (st === 'loading') {
      extra = `<div class="dispatch-actions">
        <button class="btn btn-sm btn-accent" data-action="dispatch" data-veh="${v.id}" ${v.packages.length ? '' : 'disabled'}>${iconEl('dispatch')} Auto</button>
        <button class="btn btn-sm btn-primary" data-action="dispatch-manual" data-veh="${v.id}" ${v.packages.length ? '' : 'disabled'}>${iconEl('route')} Manual</button>
      </div>`;
    } else if (st === 'delivering' || st === 'delayed') {
      const prog = v.tripTime ? 1 - clamp(v.tripTimer / v.tripTime, 0, 1) : 0;
      extra = `<span class="vbar ${st === 'delayed' ? 'delay' : ''}"><i style="width:${prog * 100}%"></i></span>`;
    } else if (st === 'returning') {
      const tot = v.tripTime * 0.5 || 1;
      const prog = 1 - clamp(v.returnTimer / tot, 0, 1);
      extra = `<span class="vbar ret"><i style="width:${prog * 100}%"></i></span>`;
    } else if (st === 'maintenance') {
      extra = `<span class="vmaint">🔧 ${Math.ceil(v.maintTimer)}s</span>`;
    } else if (st === 'idle') {
      extra = `<span class="v-hint">siap</span>`;
    }
    return `
      <div class="vcard v-${st}">
        <span class="v-ic">${iconEl(v.icon)}</span>
        <div class="v-body">
          <span class="v-name">${v.name}</span>
          <span class="v-state v-st-${st}">${v.stateLabel}</span>
        </div>
        <span class="v-load">${v.load}/${v.capacity}</span>
        <div class="v-extra">${extra}</div>
      </div>`;
  }

  // ----------------------------------------------------- panel (detail)
  renderPanel() {
    const g = this.game;
    const p = g.getSelected();
    if (!p) {
      return `<div class="panel-empty">
        <div class="pe-ic">${iconEl('box')}</div>
        <h3>Pilih paket</h3>
        <p>Klik paket ber-barcode di map gudang atau tekan <b>Q</b> untuk mengambil paket paling mendesak. Tiap langkah akan muncul sebagai pop-up proses yang menghentikan waktu.</p>
      </div>`;
    }

    const dlPct = clamp((p.timeLeft / p.deadline) * 100, 0, 100);
    const dlClass = p.timeLeft < 10 ? 'bad' : p.timeLeft < 20 ? 'warn' : 'good';
    const step = this.stepFor(p);

    let action;
    if (step) {
      const info = STEP_INFO[step];
      action = `<button class="btn btn-primary btn-block" data-action="proc-open">${iconEl(info.icon)} Buka Proses · ${info.title}</button>`;
    } else if (p.isFinal()) {
      action = `<p class="pd-note ${p.state === 'delivered' ? 'ok' : 'bad'}">${this.finalNote(p)}</p>`;
    } else {
      action = this.progressNote(this.procLabel(p), p.progress);
    }

    return `
      <div class="pd" style="--c:${p.color}">
        <header class="pd-head">
          <span class="pd-ic">${icon(p.typeData.icon)}</span>
          <div>
            <span class="pd-code">${p.code}</span>
            <span class="pd-type">${p.typeData.name}</span>
          </div>
          <span class="pd-state">${p.stateLabel}</span>
        </header>

        <div class="pd-barcode" aria-label="Barcode paket">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
          <b>${p.code}</b>
        </div>

        <div class="pd-rows">
          <div class="pd-row"><span>Tujuan</span><b>${p.scanned ? p.destName : '🔒 scan dulu'}</b></div>
          <div class="pd-row"><span>Jarak</span><b>${p.scanned ? p.routeData.distance : '—'}</b></div>
          <div class="pd-row"><span>Deadline</span><b class="${dlClass}">${formatTime(Math.max(0, p.timeLeft))}</b></div>
        </div>
        <div class="bar ${dlClass} pd-dl"><i style="width:${dlPct}%"></i></div>

        <div class="pd-actions">${action}</div>
      </div>`;
  }

  procLabel(p) {
    if (p.state === 'waiting_scan') return 'Memindai…';
    if (p.state === 'sorting') return 'Menyortir…';
    if (p.state === 'packing') return 'Mengemas…';
    if (p.state === 'quality_check') return 'Quality Check…';
    if (p.state === 'loaded') return 'Menunggu dispatch…';
    if (p.state === 'shipping') return 'Dalam perjalanan…';
    return 'Memproses…';
  }

  finalNote(p) {
    if (p.state === 'delivered') return `${iconEl('check')} Terkirim tepat waktu!`;
    if (p.state === 'late') return `${iconEl('clock')} Terkirim terlambat.`;
    if (p.state === 'damaged') return `${iconEl('cross')} Paket rusak saat QC.`;
    return `${iconEl('cross')} Paket gagal diproses.`;
  }

  progressNote(text, prog) {
    return `<div class="proc-note"><span>${text}</span><div class="bar good proc"><i style="width:${(prog || 0) * 100}%"></i></div></div>`;
  }

  // ----------------------------------------------------- POP-UP PROSES
  renderProcessModal(p) {
    const step = this.stepFor(p);
    if (!step) return '';
    const info = STEP_INFO[step];
    const dlClass = p.timeLeft < 10 ? 'bad' : p.timeLeft < 20 ? 'warn' : 'good';
    const badge = p.isExpress() ? 'EXPRESS' : p.isFragile() ? 'FRAGILE' : p.isOversize() ? 'OVERSIZE' : 'REGULAR';

    return `
      <div class="modal proc-modal step-${step}" style="--c:${p.color}">
        <button class="proc-x" data-action="proc-close" title="Tutup — waktu berjalan lagi">${iconEl('cross')}</button>
        <div class="proc-banner">
          <span class="proc-ic">${iconEl(info.icon)}</span>
          <div class="proc-head-txt">
            <span class="proc-eyebrow">Langkah · ${info.sub}</span>
            <h2>${info.title}</h2>
          </div>
          <span class="proc-frozen">${iconEl('clock')} Waktu beku</span>
        </div>

        <p class="proc-desc">${info.desc}</p>

        <div class="proc-pkg">
          <span class="proc-pkg-ic">${icon(p.typeData.icon)}</span>
          <div class="proc-pkg-info">
            <b>${p.code}</b>
            <span class="proc-badge ${p.type}">${badge}</span>
          </div>
          <div class="proc-pkg-meta">
            <span>Tujuan: <b>${p.scanned ? p.destName : '🔒 belum discan'}</b></span>
            <span>Deadline: <b class="${dlClass}">${formatTime(Math.max(0, p.timeLeft))}</b></span>
          </div>
        </div>

        <div class="proc-controls">${this.renderStepControls(step, p)}</div>
      </div>`;
  }

  renderStepControls(step, p) {
    const g = this.game;

    if (step === 'scan') {
      const opts = this.buildScanOptions(p).map((code) => {
        const wrong = this.scanWrong === code ? 'wrong' : '';
        return `<button class="scan-opt ${wrong}" data-action="pick-scan" data-code="${code}">
          <span class="scan-opt-bars"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="scan-opt-code">${code}</span>
        </button>`;
      }).join('');
      return `
        <div class="scan-label">
          <span class="scan-label-k">Label resi pada paket</span>
          <div class="scan-label-tag">
            <span class="bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
            <b>${p.code}</b>
          </div>
        </div>
        <p class="proc-prompt">Pilih kode di manifest yang <b>sama persis</b> dengan label:</p>
        <div class="scan-opts">${opts}</div>`;
    }

    if (step === 'sort') {
      const routes = g.level.routes.map((rid) => {
        const r = ROUTES[rid];
        return `<button class="btn btn-route" data-action="sort" data-route="${rid}">
          ${iconEl('pin')} ${r.name} <em>${r.distance}</em>
        </button>`;
      }).join('');
      return `
        <p class="proc-prompt">Kota tujuan paket: <b>${p.destName}</b>. Pilih jalur sortir yang cocok:</p>
        <div class="route-grid">${routes}</div>`;
    }

    if (step === 'pack') {
      const note = p.isFragile()
        ? `<p class="pd-note bad">${iconEl('warning')} Paket fragile — kemas hati-hati, hindari gudang overload agar tidak rusak.</p>`
        : `<p class="pd-note">${iconEl('pack')} Pengemasan standar. Tekan untuk mulai mengemas.</p>`;
      return `${note}
        <button class="btn btn-primary btn-block" data-action="pack">${iconEl('pack')} Kemas Paket</button>`;
    }

    if (step === 'load') {
      const opts = g.vehicles.map((v) => {
        const c = v.canAccept(p);
        return `<button class="btn btn-veh ${c.ok ? '' : 'disabled'}" data-action="load" data-veh="${v.id}" ${c.ok ? '' : 'disabled'} title="${c.ok ? 'Muat' : c.reason}">
          ${iconEl(v.icon)} <span>${v.name}</span> <em>${v.load}/${v.capacity}</em>
          ${c.ok ? '' : `<small>${c.reason}</small>`}
        </button>`;
      }).join('');
      return `
        <p class="proc-prompt">Pilih armada yang sesuai kapasitas & jenis paket:</p>
        <div class="veh-grid">${opts}</div>`;
    }

    if (step === 'dispatch') {
      const v = p.vehicle;
      if (!v) return `<p class="pd-note bad">Kendaraan tidak ditemukan.</p>`;
      return `
        <p class="proc-prompt">Paket berada di <b>${v.name}</b> (${v.load}/${v.capacity}). Berangkatkan menuju <b>${p.destName}</b>:</p>
        <div class="dispatch-choice">
          <button class="btn btn-accent btn-block" data-action="dispatch" data-veh="${v.id}">${iconEl('dispatch')} Kirim Otomatis</button>
          <button class="btn btn-primary btn-block" data-action="dispatch-manual" data-veh="${v.id}">${iconEl('route')} Antar Manual di Peta</button>
        </div>`;
    }

    return '';
  }

  renderEventBanner() {
    const ev = this.game.events?.activeEvent;
    if (!ev) return '';
    const t = this.game.events.active.timer;
    return `<div class="event-banner ev-${ev.id}">${iconEl(ev.icon)} <b>${ev.name}</b> — ${ev.desc} <span class="ev-timer">${Math.ceil(t)}s</span></div>`;
  }

  renderToasts() {
    return this.game.toasts
      .filter((t) => performance.now() - t.t < 2600)
      .map((t) => `<div class="toast toast-${t.kind}">${t.text}</div>`)
      .join('');
  }

  renderOverlay() {
    const ov = this.$('overlay');
    const g = this.game;

    if (this.manualRun) {
      ov.className = 'overlay manual-overlay';
      ov.innerHTML = this.renderManualDelivery();
      return;
    }

    if (g.gameFSM.is('paused')) {
      ov.className = 'overlay';
      ov.innerHTML = `
        <div class="modal">
          <h2>${iconEl('pause')} Jeda</h2>
          <p>Operasional dijeda. Lanjutkan atau kembali ke menu.</p>
          <div class="modal-actions">
            <button class="btn btn-primary btn-lg" data-action="resume">${iconEl('play')} Lanjut</button>
            <button class="btn btn-ghost" data-action="quit">Keluar ke Menu</button>
          </div>
        </div>`;
      return;
    }

    const p = this.modal ? g.packages.find((x) => x.id === this.modal) : null;
    if (p && this.stepFor(p)) {
      ov.className = 'overlay';
      ov.innerHTML = this.renderProcessModal(p);
    } else {
      // paket pindah ke proses otomatis / hilang → tutup pop-up
      if (this.modal) { this.modal = null; g.modalPaused = false; }
      ov.className = 'overlay hidden';
      ov.innerHTML = '';
    }
  }

  // ------------------------------------------------------ dispatch manual
  manualVehicle() {
    return this.manualRun
      ? this.game.vehicles.find((v) => v.id === this.manualRun.vehicleId)
      : null;
  }

  startManualDispatch(vehicleId) {
    const g = this.game;
    const v = g.vehicles.find((x) => x.id === vehicleId);
    if (!v || v.state !== 'loading' || !v.packages.length) {
      g.bus.emit('toast', { text: 'Kendaraan belum siap untuk dispatch manual.', kind: 'bad' });
      g.audio.play('error');
      return;
    }

    if (!g.actDispatch(vehicleId, 'manual')) return;
    this.modal = null;
    this.guiding = null;
    g.modalPaused = false;

    const depot = DELIVERY_MAP.depot;
    this.manualRun = {
      vehicleId,
      x: depot.x,
      y: depot.y,
      heading: 1,
      stops: this.buildManualStops(v),
      stopIndex: 0,
      reached: new Set(),
      roadDistance: 0,
      note: 'Keluar dock',
    };
    this.driveButtons.clear();
    this.render();
  }

  buildManualStops(vehicle) {
    const routeIds = [...new Set(vehicle.packages.map((p) => p.route))].filter((id) => deliveryStop(id));
    const remaining = routeIds.length ? routeIds : ['surabaya'];
    const ordered = [];
    let cur = DELIVERY_MAP.depot;

    while (remaining.length) {
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const st = deliveryStop(remaining[i]);
        const d = Math.hypot(st.x - cur.x, st.y - cur.y);
        if (d < bestD) { best = i; bestD = d; }
      }
      const [id] = remaining.splice(best, 1);
      const stop = deliveryStop(id);
      ordered.push(stop);
      cur = stop;
    }

    return ordered;
  }

  manualInputVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft') || this.driveButtons.has('left')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright') || this.driveButtons.has('right')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup') || this.driveButtons.has('up')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown') || this.driveButtons.has('down')) y += 1;
    const len = Math.hypot(x, y);
    return len ? { x: x / len, y: y / len } : { x: 0, y: 0 };
  }

  updateManualDelivery(dt) {
    const run = this.manualRun;
    if (!run) return;
    const v = this.manualVehicle();
    if (!v) { this.manualRun = null; this.render(); return; }
    if (!this.game.isPlaying() || this.game.gameFSM.is('paused')) return;

    if (!v.manualDispatch) {
      this.manualRun = null;
      this.driveButtons.clear();
      this.render();
      return;
    }

    const target = run.stops[run.stopIndex];
    if (!target) { this.finishManualDelivery(); return; }

    const distToTarget = Math.hypot(target.x - run.x, target.y - run.y);
    v.manualProgress = clamp((run.stopIndex + (1 - clamp(distToTarget / 520, 0, 1))) / run.stops.length, 0, 0.98);

    if (v.state !== 'delivering') {
      run.note = v.state === 'departing' ? 'Keluar dock' : v.stateLabel;
      return;
    }

    const input = this.manualInputVector();
    if (!input.x && !input.y) {
      run.note = `Target: ${target.name}`;
      return;
    }

    const speed = 155 / Math.max(0.55, v.speedFactor);
    const candidate = {
      x: run.x + input.x * speed * dt,
      y: run.y + input.y * speed * dt,
    };
    const snap = this.nearestRoadPoint(candidate.x, candidate.y);
    run.x = snap.x;
    run.y = snap.y;
    run.roadDistance = snap.distance;
    if (input.x) run.heading = input.x > 0 ? 1 : -1;

    this.checkManualStop();
  }

  nearestRoadPoint(x, y) {
    let best = { x: DELIVERY_MAP.depot.x, y: DELIVERY_MAP.depot.y, distance: Infinity };
    for (const seg of DELIVERY_ROADS) {
      const vx = seg.x2 - seg.x1;
      const vy = seg.y2 - seg.y1;
      const len2 = vx * vx + vy * vy || 1;
      const t = clamp(((x - seg.x1) * vx + (y - seg.y1) * vy) / len2, 0, 1);
      const px = seg.x1 + vx * t;
      const py = seg.y1 + vy * t;
      const d = Math.hypot(x - px, y - py);
      if (d < best.distance) best = { x: px, y: py, distance: d };
    }
    return best;
  }

  checkManualStop() {
    const run = this.manualRun;
    const target = run?.stops[run.stopIndex];
    if (!target) return;
    const d = Math.hypot(target.x - run.x, target.y - run.y);
    if (d > 46) return;

    run.reached.add(target.id);
    this.game.bus.emit('toast', { text: `${target.name} tercapai.`, kind: 'good' });
    if (run.stopIndex >= run.stops.length - 1) {
      this.finishManualDelivery();
    } else {
      run.stopIndex += 1;
      run.note = `Target: ${run.stops[run.stopIndex].name}`;
    }
  }

  finishManualDelivery() {
    const v = this.manualVehicle();
    if (!v) { this.manualRun = null; return; }
    if (this.game.completeManualDispatch(v.id)) {
      this.game.bus.emit('toast', { text: `${v.name} tiba. Semua paket di armada diselesaikan.`, kind: 'good' });
    }
    this.manualRun = null;
    this.driveButtons.clear();
    this.render();
  }

  continueManualAsAuto(showToast = true) {
    const run = this.manualRun;
    const v = this.manualVehicle();
    if (v && run) {
      this.game.continueManualDispatchAuto(v.id, v.manualProgress);
      if (showToast) this.game.bus.emit('toast', { text: `${v.name} dilanjutkan oleh sistem otomatis.`, kind: 'info' });
    }
    this.manualRun = null;
    this.driveButtons.clear();
    if (showToast) this.render();
  }

  renderManualDelivery() {
    const run = this.manualRun;
    const v = this.manualVehicle();
    if (!run || !v) return '';
    const target = run.stops[run.stopIndex] || run.stops[0];
    const minLeft = Math.min(...v.packages.map((p) => p.timeLeft));
    const urgent = minLeft < 10 ? 'bad' : minLeft < 20 ? 'warn' : 'good';
    const mapW = DELIVERY_MAP.width;
    const mapH = DELIVERY_MAP.height;
    const left = (run.x / mapW) * 100;
    const top = (run.y / mapH) * 100;
    const stops = Object.values(DELIVERY_MAP.stops).map((s) => {
      const isRoute = run.stops.some((st) => st.id === s.id);
      const done = run.reached.has(s.id);
      const active = target?.id === s.id;
      return `<div class="region-stop tone-${s.tone} ${isRoute ? 'in-route' : ''} ${done ? 'done' : ''} ${active ? 'target' : ''}"
        style="left:${(s.x / mapW) * 100}%;top:${(s.y / mapH) * 100}%">
        <span>${iconEl(done ? 'check' : 'pin')}</span><b>${s.name}</b>
      </div>`;
    }).join('');
    const roadLines = DELIVERY_ROADS.map((r) => `<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" />`).join('');
    const progress = clamp((v.manualProgress || 0) * 100, 0, 100);
    const status = v.state === 'departing' ? 'Keluar dock' : `Target: ${target?.name || '-'}`;

    return `
      <div class="manual-map-modal">
        <header class="manual-map-head">
          <div>
            <span class="command-eyebrow">Dispatch Manual</span>
            <h2>Peta Antar Wilayah</h2>
          </div>
          <div class="manual-map-stats">
            <span>${iconEl(v.icon)} ${v.name}</span>
            <span>${iconEl('box')} ${v.packages.length} paket</span>
            <span class="${urgent}">${iconEl('clock')} ${formatTime(minLeft)}</span>
          </div>
          <button class="btn btn-ghost" data-action="manual-auto">${iconEl('dispatch')} Lanjut Otomatis</button>
        </header>

        <div class="manual-map-board">
          <svg class="region-map-svg" viewBox="0 0 ${mapW} ${mapH}" aria-hidden="true">
            <rect class="map-paper" x="0" y="0" width="${mapW}" height="${mapH}" rx="28" />
            <g class="map-greenery">
              <ellipse cx="120" cy="88" rx="92" ry="48" />
              <ellipse cx="332" cy="172" rx="86" ry="44" />
              <ellipse cx="640" cy="104" rx="108" ry="46" />
              <ellipse cx="882" cy="432" rx="76" ry="118" />
              <ellipse cx="272" cy="554" rx="130" ry="52" />
              <ellipse cx="622" cy="526" rx="112" ry="48" />
            </g>
            <g class="map-blocks">
              <rect x="180" y="170" width="96" height="70" rx="8" />
              <rect x="596" y="236" width="104" height="76" rx="9" />
              <rect x="790" y="92" width="118" height="78" rx="10" />
              <rect x="676" y="488" width="96" height="66" rx="8" />
              <rect x="210" y="438" width="122" height="70" rx="10" />
            </g>
            <g class="manual-roads base">${roadLines}</g>
            <circle class="manual-roundabout" cx="${DELIVERY_MAP.roundabout.x}" cy="${DELIVERY_MAP.roundabout.y}" r="${DELIVERY_MAP.roundabout.r}" />
            <circle class="manual-roundabout-inner" cx="${DELIVERY_MAP.roundabout.x}" cy="${DELIVERY_MAP.roundabout.y}" r="62" />
            <g class="manual-roads dash">${roadLines}</g>
            <circle class="manual-roundabout-dash" cx="${DELIVERY_MAP.roundabout.x}" cy="${DELIVERY_MAP.roundabout.y}" r="${DELIVERY_MAP.roundabout.r}" />
            <g class="zebra-crossings">
              <rect x="442" y="102" width="56" height="36" rx="2" />
              <rect x="92" y="510" width="56" height="36" rx="2" />
              <rect x="734" y="448" width="52" height="34" rx="2" />
            </g>
          </svg>

          <div class="region-depot" style="left:${(DELIVERY_MAP.depot.x / mapW) * 100}%;top:${(DELIVERY_MAP.depot.y / mapH) * 100}%">
            ${iconEl('loading')} <b>${DELIVERY_MAP.depot.name}</b>
          </div>
          ${stops}
          <div class="manual-vehicle ${v.state === 'delivering' ? 'moving' : ''}" data-facing="${run.heading < 0 ? 'left' : 'right'}"
            style="left:${left}%;top:${top}%">
            <span class="manual-veh-label">${status}</span>
            ${vehicleSide(v.type)}
          </div>
        </div>

        <footer class="manual-map-foot">
          <div class="manual-route-progress">
            <span>${iconEl('route')} Stop ${Math.min(run.stopIndex + 1, run.stops.length)}/${run.stops.length}</span>
            <div class="bar good"><i style="width:${progress}%"></i></div>
          </div>
          <div class="drive-pad">
            <button class="drive-btn up" data-drive="up">↑</button>
            <button class="drive-btn left" data-drive="left">←</button>
            <button class="drive-btn right" data-drive="right">→</button>
            <button class="drive-btn down" data-drive="down">↓</button>
          </div>
        </footer>
      </div>`;
  }

  // ------------------------------------------------------------------ input
  onKeyDown(e) {
    const k = e.key.toLowerCase();
    const moveKey = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(k);
    if (moveKey) { this.keys.add(k); e.preventDefault(); return; }

    if (e.repeat) return;
    if (k === 'escape') {
      if (this.manualRun) { this.continueManualAsAuto(true); return; }
      if (this.modal) { this.closeProcess(true); return; }
      this.game.togglePause(); return;
    }
    if (k === 'e' || k === ' ' || k === 'enter') { e.preventDefault(); this.contextAction(); return; }
    if (k === 'q') { e.preventDefault(); this.selectNextPackage(); return; }
    if (k === 'r') { e.preventDefault(); this.dispatchReady(); return; }
    if (/^[1-9]$/.test(k)) { this.sortByNumber(parseInt(k, 10)); }
  }

  onKeyUp(e) { this.keys.delete(e.key.toLowerCase()); }

  onPointerDown(e) {
    const el = e.target.closest('[data-drive]');
    if (!el) return;
    e.preventDefault();
    this.driveButtons.add(el.dataset.drive);
    el.setPointerCapture?.(e.pointerId);
  }

  onPointerUp(e) {
    const el = e.target.closest('[data-drive]');
    if (el) this.driveButtons.delete(el.dataset.drive);
    else if (this.driveButtons.size) this.driveButtons.clear();
  }

  applyMovementInput() {
    const op = this.game.operator;
    if (!op) return;
    if (!this.game.isPlaying() || this.game.gameFSM.is('paused') || this.game.modalPaused || this.manualRun) {
      op.clearMoveInput();
      return;
    }
    let x = this.joy.x;
    let y = this.joy.y;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    op.setMoveInput(x, y);
  }

  contextAction() {
    const g = this.game;
    let p = g.getSelected();
    if (!p) { this.selectNextPackage(); return; }
    if (this.modal) return; // pop-up sudah terbuka
    if (this.stepFor(p)) this.openProcess(p.id, true);
    else g.bus.emit('toast', { text: 'Paket sedang diproses otomatis, tunggu sebentar.', kind: 'info' });
  }

  selectNextPackage() {
    const list = this.game.packages
      .filter((p) => !p.isFinal() && this.stepFor(p))
      .sort((a, b) => a.timeLeft - b.timeLeft);
    if (!list.length) {
      this.game.bus.emit('toast', { text: 'Belum ada paket yang menunggu aksi.', kind: 'info' });
      this.render();
      return;
    }
    this.openProcess(list[0].id, true);
  }

  dispatchReady() {
    const v = this.game.vehicles.find((x) => x.state === 'loading' && x.packages.length > 0);
    if (v) this.game.actDispatch(v.id);
    else this.game.bus.emit('toast', { text: 'Belum ada kendaraan siap dispatch.', kind: 'info' });
    this.render();
  }

  sortByNumber(n) {
    const p = this.game.getSelected();
    if (!p || p.state !== 'scanned') return;
    const route = this.game.level.routes[n - 1];
    if (route) { this.game.actSort(route); this.closeProcess(false); }
  }

  setupTouchControls() {
    const zone = this.root.querySelector('.stick-zone');
    const knob = this.root.querySelector('.stick-knob');
    if (!zone || !knob) return;
    this._touchAbort = new AbortController();
    const signal = this._touchAbort.signal;
    const reset = () => {
      this._joyPointer = null;
      this.joy = { x: 0, y: 0 };
      knob.style.transform = 'translate(-50%, -50%)';
    };
    const update = (e) => {
      if (this._joyPointer !== e.pointerId) return;
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const max = rect.width * 0.34;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      this.joy = { x: dx / max, y: dy / max };
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    zone.addEventListener('pointerdown', (e) => {
      this._joyPointer = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      update(e);
    }, { signal });
    zone.addEventListener('pointermove', update, { signal });
    zone.addEventListener('pointerup', reset, { signal });
    zone.addEventListener('pointercancel', reset, { signal });
  }

  onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const g = this.game;
    const a = el.dataset.action;
    g.audio.resume();

    switch (a) {
      case 'select': this.openProcess(el.dataset.id, true); break;
      case 'proc-open': this.openProcess(el.dataset.id || null, true); break;
      case 'proc-close': this.closeProcess(true); break;
      case 'pick-scan': this.pickScan(el.dataset.code); break;

      case 'sort':
        g.actSort(el.dataset.route);
        if (this.modal) this.closeProcess(false); else this.render();
        break;

      case 'pack':
        g.actPack();
        if (this.modal) this.closeProcess(false); else this.render();
        break;

      case 'load': {
        const p = g.getSelected();
        const before = p?.state;
        g.actLoad(el.dataset.veh);
        // sukses bila state berpindah dari ready_to_load → loaded
        if (p && before === 'ready_to_load' && p.state === 'loaded') {
          this.guiding = p.id;       // lanjut dipandu ke dispatch
          this.closeProcess(false);
        } else {
          this.render();             // gagal (mis. kapasitas) → pop-up tetap
        }
        break;
      }

      case 'dispatch':
        g.actDispatch(el.dataset.veh);
        if (this.modal) this.closeProcess(true); else this.render();
        break;

      case 'dispatch-manual':
        this.startManualDispatch(el.dataset.veh);
        break;

      case 'manual-auto':
        this.continueManualAsAuto(true);
        break;

      case 'context-action': this.contextAction(); break;
      case 'next-package': this.selectNextPackage(); break;
      case 'dispatch-ready': this.dispatchReady(); break;
      case 'pause': g.togglePause(); this.render(); break;
      case 'resume': g.resume(); this.render(); break;
      case 'mute': g.audio.toggleMute(); this.render(); break;
      case 'quit': g.quitToMenu(); break;
      default: this.render();
    }
  }
}
