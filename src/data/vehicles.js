// ============================================================================
// vehicles.js — Jenis kendaraan (GDD 5.5)
// speedFactor < 1 = lebih cepat (waktu kirim berkurang), > 1 = lebih lambat.
// ============================================================================

export const VEHICLE_TYPES = {
  motor: {
    id: 'motor',
    name: 'Motor',
    icon: 'motorcycle',
    capacity: 3,
    speedFactor: 0.7, // cepat
    allowsOversize: false,
    desc: 'Cepat, kapasitas kecil. Cocok express & jarak dekat.',
  },
  van: {
    id: 'van',
    name: 'Van',
    icon: 'van',
    capacity: 10,
    speedFactor: 1.0, // sedang
    allowsOversize: false,
    desc: 'Seimbang. Paket campuran & rute sedang.',
  },
  truck: {
    id: 'truck',
    name: 'Truck',
    icon: 'truck',
    capacity: 25,
    speedFactor: 1.35, // lambat
    allowsOversize: true,
    desc: 'Banyak paket, oversize, rute jauh.',
  },
};

export const VEHICLE_TYPE_LIST = Object.values(VEHICLE_TYPES);
