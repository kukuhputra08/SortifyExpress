// ============================================================================
// EventBus.js — Event Controller antar-FSM (GDD 7.6)
// Pub/sub sederhana. Satu FSM mem-publish event, FSM/sistem lain bereaksi.
// Contoh: 'package_ready_to_load' (Paket) → VehicleFSM Idle→Waiting Load.
// ============================================================================

export class EventBus {
  constructor() {
    this._listeners = new Map(); // event -> Set<fn>
    this.log = []; // riwayat event terbaru (untuk debug/tutorial)
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn); // unsubscribe
  }

  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
  }

  emit(event, payload = {}) {
    this.log.push({ event, t: performance.now() });
    if (this.log.length > 60) this.log.shift();
    const set = this._listeners.get(event);
    if (set) for (const fn of [...set]) fn(payload, event);
    // wildcard listener
    const all = this._listeners.get('*');
    if (all) for (const fn of [...all]) fn(payload, event);
  }

  clear() {
    this._listeners.clear();
    this.log = [];
  }
}

// Nama event standar (dokumentasi Event Controller)
export const EV = {
  PACKAGE_CREATED: 'package_created',
  PACKAGE_SCANNED: 'package_scanned',
  PACKAGE_SORTED: 'package_sorted',
  WRONG_SORT: 'wrong_sort',
  PACKAGE_PACKED: 'package_packed',
  PACKAGE_QC_PASS: 'package_qc_pass',
  PACKAGE_DAMAGED: 'package_damaged',
  PACKAGE_READY_TO_LOAD: 'package_ready_to_load',
  PACKAGE_LOADED: 'package_loaded',
  VEHICLE_DEPARTED: 'vehicle_departed',
  VEHICLE_ARRIVED: 'vehicle_arrived',
  VEHICLE_RETURNED: 'vehicle_returned',
  VEHICLE_BROKEN: 'vehicle_broken',
  DELIVERY_SUCCESS: 'delivery_success',
  DELIVERY_LATE: 'delivery_late',
  DELIVERY_FAILED: 'delivery_failed',
  AREA_OVERLOAD: 'area_overload',
  AREA_BOTTLENECK: 'area_bottleneck',
  AREA_RECOVERY: 'area_recovery',
  RANDOM_EVENT_START: 'random_event_start',
  RANDOM_EVENT_END: 'random_event_end',
  SCORE_CHANGED: 'score_changed',
  COMBO_CHANGED: 'combo_changed',
  STAFF_TIRED: 'staff_tired',
  STAFF_READY: 'staff_ready',
  VEHICLE_MISFIT: 'vehicle_misfit',
  TOAST: 'toast', // pesan UI generik
};
