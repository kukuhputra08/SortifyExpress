// ============================================================================
// upgrades.js — Sistem upgrade antar-level (GDD 6.5)
// effect() memodifikasi game.upgrades flags yang dibaca sistem proses.
// ============================================================================

export const UPGRADES = {
  barcode_scanner: {
    id: 'barcode_scanner',
    name: 'Barcode Scanner',
    icon: 'scanner',
    cost: 120,
    desc: 'Scan lebih cepat & kurangi error.',
    apply: (u) => { u.scanSpeed *= 0.6; },
  },
  packing_machine: {
    id: 'packing_machine',
    name: 'Packing Machine',
    icon: 'machine',
    cost: 150,
    desc: 'Waktu packing lebih singkat & risiko damage turun.',
    apply: (u) => { u.packSpeed *= 0.65; u.packingMachine = true; },
  },
  warehouse_expansion: {
    id: 'warehouse_expansion',
    name: 'Warehouse Expansion',
    icon: 'expand',
    cost: 180,
    desc: 'Kapasitas tiap area gudang +40%.',
    apply: (u) => { u.capacityMult *= 1.4; },
  },
  extra_courier: {
    id: 'extra_courier',
    name: 'Extra Courier',
    icon: 'courier',
    cost: 200,
    desc: 'Tambah 1 slot kendaraan aktif (van).',
    apply: (u) => { u.extraVehicles.push('van'); },
  },
  staff_training: {
    id: 'staff_training',
    name: 'Staff Training',
    icon: 'training',
    cost: 140,
    desc: 'Stamina staff lebih awet, proses lebih cepat.',
    apply: (u) => { u.staffSpeed *= 0.8; u.staffStamina *= 1.5; },
  },
  route_optimizer: {
    id: 'route_optimizer',
    name: 'Route Optimizer',
    icon: 'route',
    cost: 160,
    desc: 'Waktu pengiriman berkurang 20%.',
    apply: (u) => { u.deliverySpeed *= 0.8; },
  },
};

export const UPGRADE_LIST = Object.values(UPGRADES);

// State upgrade default (dibaca di seluruh sistem)
export function defaultUpgradeState() {
  return {
    scanSpeed: 1,
    packSpeed: 1,
    staffSpeed: 1,
    staffStamina: 1,
    deliverySpeed: 1,
    capacityMult: 1,
    packingMachine: false,
    extraVehicles: [],
    owned: [], // id upgrade yang sudah dibeli
  };
}
