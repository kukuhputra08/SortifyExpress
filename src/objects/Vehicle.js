// ============================================================================
// Vehicle.js — Objek Kendaraan. Data + VehicleFSM + logika muat/dispatch.
// ============================================================================

import { createVehicleFSM, VEH_STATE_LABEL } from '../fsm/VehicleFSM.js';
import { VEHICLE_TYPES } from '../data/vehicles.js';
import { ROUTES } from '../data/routes.js';
import { uid, clamp } from '../core/Utils.js';

const OVERSIZE_COST = 3; // paket oversize memakan 3 slot kapasitas

export class Vehicle {
  constructor(typeKey, game) {
    this.game = game;
    this.id = uid('veh');
    this.type = typeKey;
    this.typeData = VEHICLE_TYPES[typeKey];
    this.capacity = this.typeData.capacity;
    this.speedFactor = this.typeData.speedFactor;
    this.packages = [];

    this.tripTime = 0;
    this.tripTimer = 0;
    this.returnTimer = 0;
    this.maintTimer = 0;
    this.delayTimer = 0;
    this.delayRolled = false;
    this.requestDispatch = false;
    this.manualDispatch = false;
    this.manualProgress = 0;

    this.fsm = createVehicleFSM(this, game);
  }

  get state() { return this.fsm.state; }
  get stateLabel() { return VEH_STATE_LABEL[this.state]; }
  get icon() { return this.typeData.icon; }
  get name() { return this.typeData.name; }

  /** Beban terpakai (oversize = 3 slot). */
  get load() {
    return this.packages.reduce((s, p) => s + (p.isOversize() ? OVERSIZE_COST : 1), 0);
  }
  full() { return this.load >= this.capacity; }
  available() { return this.fsm.isAny('idle', 'waiting_load', 'loading'); }

  /** Apakah kendaraan bisa menerima paket ini? + alasan bila tidak. */
  canAccept(pkg) {
    if (!this.available()) return { ok: false, reason: `${this.name} sedang ${this.stateLabel}` };
    if (pkg.isOversize() && !this.typeData.allowsOversize)
      return { ok: false, reason: `${this.name} tak bisa muat oversize — pakai Truck`, misfit: true };
    const cost = pkg.isOversize() ? OVERSIZE_COST : 1;
    if (this.load + cost > this.capacity)
      return { ok: false, reason: `${this.name} penuh (${this.load}/${this.capacity})` };
    return { ok: true };
  }

  /** Muat paket. Mengembalikan {ok, reason}. */
  accept(pkg) {
    const check = this.canAccept(pkg);
    if (!check.ok) return check;
    if (this.fsm.is('idle')) this.fsm.transition('loading');
    else if (this.fsm.is('waiting_load')) this.fsm.transition('loading');
    this.packages.push(pkg);
    pkg.paymentValidated = true; // validasi COD otomatis saat dimuat
    pkg.onLoaded(this);
    return { ok: true };
  }

  /** Player menekan Dispatch. mode: auto | manual. */
  dispatch(mode = 'auto') {
    if (this.fsm.is('loading') && this.packages.length > 0) {
      this.manualDispatch = mode === 'manual';
      this.manualProgress = 0;
      this.requestDispatch = true;
      return true;
    }
    return false;
  }

  /** Mode manual selesai saat pemain mencapai tujuan terakhir di peta. */
  completeManualDispatch() {
    if (!this.manualDispatch || !this.fsm.is('delivering')) return false;
    this.manualProgress = 1;
    this.tripTimer = 0;
    this.manualDispatch = false;
    return this.fsm.transition('arrived');
  }

  /** Kembali ke sistem otomatis dari mode manual, memakai sisa progress. */
  continueAutoFromManual(progress = this.manualProgress) {
    if (!this.manualDispatch) return false;
    this.manualProgress = clamp(progress, 0, 0.95);
    if (this.tripTime) this.tripTimer = Math.max(1, this.tripTime * (1 - this.manualProgress));
    this.manualDispatch = false;
    return true;
  }

  /** Hitung waktu tempuh = rute terjauh × faktor kendaraan × event × upgrade. */
  computeTripTime() {
    const maxBase = Math.max(...this.packages.map((p) => p.routeData.baseTime), 6);
    const t = maxBase * this.speedFactor * this.game.mods.deliveryFactor * this.game.upgrades.deliverySpeed;
    this.tripTime = t;
    this.tripTimer = t;
  }

  /** Risiko delay = rata-rata risiko rute paket yang dimuat. */
  routeDelayRisk() {
    if (!this.packages.length) return 0;
    const avg = this.packages.reduce((s, p) => s + p.routeData.delayRisk, 0) / this.packages.length;
    return clamp(avg + (this.game.mods.deliveryFactor > 1 ? 0.1 : 0), 0, 0.6);
  }

  /** Masuk maintenance (dipicu event Kendaraan Rusak). */
  breakDown(duration) {
    if (this.packages.length > 0) return false; // jangan rusak saat membawa paket
    this.maintTimer = duration;
    this.fsm.force('maintenance');
    return true;
  }

  resetTrip() {
    this.packages = [];
    this.tripTime = 0;
    this.tripTimer = 0;
    this.delayRolled = false;
    this.requestDispatch = false;
    this.manualDispatch = false;
    this.manualProgress = 0;
  }

  update(dt) { this.fsm.update(dt); }
}
