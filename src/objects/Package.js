// ============================================================================
// Package.js — Objek Paket. Membungkus data + PackageFSM + aksi player.
// ============================================================================

import { createPackageFSM, PKG_FINAL, PKG_STATE_LABEL } from '../fsm/PackageFSM.js';
import { PACKAGE_TYPES } from '../data/packageTypes.js';
import { ROUTES } from '../data/routes.js';
import { CONFIG } from '../data/config.js';
import { uid, packageCode, clamp, chance } from '../core/Utils.js';

export class Package {
  constructor(typeKey, routeId, game) {
    this.game = game;
    this.id = uid('pkg');
    this.code = packageCode();
    this.type = typeKey;
    this.typeData = PACKAGE_TYPES[typeKey];
    this.route = routeId;
    this.routeData = ROUTES[routeId];
    this.destName = this.routeData.name;

    this.deadline = this.typeData.deadline;
    this.timeLeft = this.deadline;
    this.createdAt = game.now;

    // -- flag proses --
    this.scanInitiated = false;
    this.scanValidated = false;
    this.scanned = false;
    this.sortChoice = null;
    this.wrongSort = false;
    this.packed = false;
    this.careful = true; // dipack hati-hati? (fragile)
    this.damaged = false;
    this.vehicle = null;
    this.proc = 0; // timer proses berjalan
    this.result = null; // delivered | late | damaged | failed
    this.paymentValidated = !this.typeData.needsPaymentValidation;

    this.fsm = createPackageFSM(this, game);
  }

  // ---- akses ringkas ----------------------------------------------------
  get state() { return this.fsm.state; }
  get stateLabel() { return PKG_STATE_LABEL[this.state]; }
  get color() { return this.typeData.color; }
  isFinal() { return PKG_FINAL.includes(this.state); }
  isExpress() { return this.type === 'express'; }
  isFragile() { return this.typeData.fragile; }
  isOversize() { return this.typeData.oversize; }

  /** Area gudang tempat paket dihitung untuk kapasitas. */
  get area() {
    switch (this.state) {
      case 'created':
      case 'waiting_scan':
      case 'scanned': return 'inbound';
      case 'sorting':
      case 'sorted': return 'sorting';
      case 'packing': return 'packing';
      case 'quality_check': return 'qc';
      case 'ready_to_load': return 'loading';
      default: return null; // loaded/stored/shipping/final tidak dihitung
    }
  }

  /** Progress 0..1 untuk state berproses (untuk progress bar). */
  get progress() {
    let target = 0;
    if (this.state === 'waiting_scan' && this.scanInitiated) target = this.scanDuration();
    else if (this.state === 'sorting') target = this.sortDuration();
    else if (this.state === 'packing') target = this.packDuration();
    else if (this.state === 'quality_check') target = CONFIG.PROCESS.QC_TIME;
    else return 0;
    return target ? clamp(this.proc / target, 0, 1) : 0;
  }

  // ---- durasi proses (dipengaruhi upgrade, event, overload, staff) ------
  scanDuration() {
    const u = this.game.upgrades, m = this.game.mods;
    return CONFIG.PROCESS.SCAN_TIME * u.scanSpeed * m.scanFactor * this.game.slowFactor();
  }
  sortDuration() {
    return CONFIG.PROCESS.SORT_TIME * this.game.slowFactor();
  }
  packDuration() {
    const base = this.isFragile()
      ? CONFIG.PROCESS.PACK_TIME_FRAGILE
      : this.isExpress() ? CONFIG.PROCESS.PACK_TIME_EXPRESS : CONFIG.PROCESS.PACK_TIME_REGULAR;
    return base * this.game.upgrades.packSpeed * this.game.slowFactor();
  }

  // ---- aksi player ------------------------------------------------------
  beginScan() {
    if (this.state !== 'waiting_scan' || this.scanInitiated) return false;
    this.scanInitiated = true;
    this.proc = 0;
    return true;
  }

  chooseSort(routeId) {
    if (this.state !== 'scanned') return false;
    this.sortChoice = routeId;
    this.fsm.transition('sorting');
    return true;
  }

  beginPack() {
    if (this.state !== 'sorted') return false;
    this.fsm.transition('packing');
    return true;
  }

  /** Dipanggil saat berhasil dimuat ke kendaraan. */
  onLoaded(vehicle) {
    this.vehicle = vehicle;
    this.fsm.transition('loaded');
    // langsung simpan di kendaraan sambil menunggu dispatch
    this.fsm.transition('stored');
  }

  /** Dipanggil VehicleFSM saat kendaraan berangkat. */
  onDeparted() {
    if (this.state === 'stored') this.fsm.transition('shipping');
  }

  /** Dipanggil VehicleFSM saat tiba: tentukan on-time / late. */
  finishDelivery() {
    if (this.state !== 'shipping') return;
    if (this.timeLeft >= 0) { this.result = 'delivered'; this.fsm.transition('delivered'); }
    else { this.result = 'late'; this.fsm.transition('late'); }
  }

  // ---- penilaian damage QC (fragile) ------------------------------------
  rollDamage() {
    if (!this.isFragile()) return chance(CONFIG.DAMAGE.NONFRAGILE);
    let p = CONFIG.DAMAGE.FRAGILE_BASE;
    const ws = this.game.warehouse.fsm.state;
    if (ws === 'overload' || ws === 'bottleneck') p += CONFIG.DAMAGE.OVERLOAD_ADD;
    if (this.game.staffTired()) p += CONFIG.DAMAGE.TIRED_STAFF_ADD;
    if (!this.careful) p += CONFIG.DAMAGE.RUSHED_ADD;
    if (this.game.upgrades.packingMachine) p *= CONFIG.DAMAGE.PACKING_MACHINE_MULT;
    return chance(clamp(p, 0, 0.95));
  }

  // ---- update per frame -------------------------------------------------
  update(dt) {
    if (!this.isFinal()) this.timeLeft -= dt;
    this.fsm.update(dt);

    // Paket sangat lewat deadline & belum masuk kendaraan → gagal (bersihkan)
    if (!this.isFinal() && this.timeLeft < -25 &&
        ['created', 'waiting_scan', 'scanned', 'sorting', 'sorted', 'packing', 'quality_check', 'ready_to_load'].includes(this.state)) {
      this.result = 'failed';
      this.fsm.force('failed');
    }
  }
}
