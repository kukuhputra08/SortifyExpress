// ============================================================================
// PackageFSM.js — FSM Paket (GDD 7.1)
// Created → Waiting Scan → Scanned → Sorting → Sorted → Packing →
// Quality Check → Ready to Load → Loaded → Stored → Shipping → Delivered/Late/Damaged/Failed
//
// Aksi player MEMULAI proses (scan/sort/pack/load); proses bertimer dijalankan
// di onUpdate dan otomatis transisi saat selesai. QC otomatis menilai damage.
// ============================================================================

import { FSM } from '../core/FSM.js';
import { EV } from '../core/EventBus.js';
import { CONFIG } from '../data/config.js';
import { chance } from '../core/Utils.js';

// Label tampilan untuk tiap state
export const PKG_STATE_LABEL = {
  created: 'Created',
  waiting_scan: 'Waiting Scan',
  scanned: 'Scanned',
  sorting: 'Sorting',
  sorted: 'Sorted',
  packing: 'Packing',
  quality_check: 'Quality Check',
  ready_to_load: 'Ready to Load',
  loaded: 'Loaded',
  stored: 'Stored in Vehicle',
  shipping: 'Shipping',
  delivered: 'Delivered',
  late: 'Late',
  damaged: 'Damaged',
  failed: 'Failed',
};

export const PKG_FINAL = ['delivered', 'late', 'damaged', 'failed'];

export function createPackageFSM(pkg, game) {
  const bus = game.bus;

  const states = {
    created: {
      transitions: ['waiting_scan'],
      onEnter: () => bus.emit(EV.PACKAGE_CREATED, { pkg }),
      onUpdate: (c, fsm) => {
        // langsung tersedia untuk di-scan
        if (fsm.timeInState >= 0.05) fsm.transition('waiting_scan');
      },
    },

    waiting_scan: {
      transitions: ['scanned'],
      onUpdate: (c, fsm, dt) => {
        if (!pkg.scanInitiated) return; // tunggu player menekan Scan
        pkg.proc += dt; // progress hanya berjalan setelah diinisiasi
        if (pkg.proc >= pkg.scanDuration()) {
          pkg.proc = 0;
          pkg.scanned = true;
          fsm.transition('scanned');
          bus.emit(EV.PACKAGE_SCANNED, { pkg });
        }
      },
    },

    scanned: {
      transitions: ['sorting'],
      // menunggu player memilih tujuan sortir (pkg.sortChoice di-set lalu beginSort)
    },

    sorting: {
      transitions: ['sorted'],
      onEnter: () => {
        pkg.proc = 0;
        // benar/salah ditentukan dari pilihan player vs tujuan asli
        pkg.wrongSort = pkg.sortChoice !== pkg.route;
        if (pkg.wrongSort) bus.emit(EV.WRONG_SORT, { pkg });
      },
      onUpdate: (c, fsm, dt) => {
        pkg.proc += dt;
        if (pkg.proc >= pkg.sortDuration()) {
          pkg.proc = 0;
          fsm.transition('sorted');
          if (!pkg.wrongSort) bus.emit(EV.PACKAGE_SORTED, { pkg });
        }
      },
    },

    sorted: {
      transitions: ['packing'],
      // menunggu player menekan Pack
    },

    packing: {
      transitions: ['quality_check'],
      onEnter: () => { pkg.proc = 0; },
      onUpdate: (c, fsm, dt) => {
        pkg.proc += dt;
        if (pkg.proc >= pkg.packDuration()) {
          pkg.proc = 0;
          pkg.packed = true;
          fsm.transition('quality_check');
          bus.emit(EV.PACKAGE_PACKED, { pkg });
        }
      },
    },

    quality_check: {
      transitions: ['ready_to_load', 'damaged'],
      onEnter: () => { pkg.proc = 0; },
      onUpdate: (c, fsm, dt) => {
        pkg.proc += dt;
        if (pkg.proc < CONFIG.PROCESS.QC_TIME) return;
        // hitung peluang damage (khusus fragile)
        if (pkg.rollDamage()) {
          pkg.damaged = true;
          pkg.result = 'damaged';
          fsm.transition('damaged');
          bus.emit(EV.PACKAGE_DAMAGED, { pkg });
        } else {
          fsm.transition('ready_to_load');
          bus.emit(EV.PACKAGE_READY_TO_LOAD, { pkg });
        }
      },
    },

    ready_to_load: {
      transitions: ['loaded', 'failed'],
      // menunggu player memuat ke kendaraan
    },

    loaded: {
      transitions: ['stored', 'failed'],
      // paket dimuat ke kendaraan, menunggu kendaraan dispatch
    },

    stored: {
      transitions: ['shipping', 'failed'],
      // paket tersimpan di kendaraan, menunggu kendaraan berangkat (VehicleFSM emit vehicle_departed)
    },

    shipping: {
      transitions: ['delivered', 'late', 'failed'],
      // hasil ditentukan oleh Vehicle saat tiba (pkg.finishDelivery)
    },

    delivered: { onEnter: () => bus.emit(EV.DELIVERY_SUCCESS, { pkg }) },
    late: { onEnter: () => bus.emit(EV.DELIVERY_LATE, { pkg }) },
    damaged: {},
    failed: { onEnter: () => bus.emit(EV.DELIVERY_FAILED, { pkg }) },
  };

  return new FSM({
    name: 'Package',
    states,
    initial: 'created',
    context: pkg,
    onTransition: (from, to) => { pkg.lastTransition = `${from}→${to}`; },
  });
}

export { chance };
