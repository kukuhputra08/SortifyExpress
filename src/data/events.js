// ============================================================================
// events.js — Definisi Random Event (GDD 5.7)
// Tiap event memiliki apply()/revert() yang mengubah modifier global game.mods.
// ============================================================================

export const RANDOM_EVENTS = {
  rain: {
    id: 'rain',
    name: 'Hujan Deras',
    icon: 'rain',
    desc: 'Kecepatan kendaraan turun 25%.',
    duration: 30,
    apply: (m) => { m.deliveryFactor *= 1.25; },
    revert: (m) => { m.deliveryFactor /= 1.25; },
  },
  busy: {
    id: 'busy',
    name: 'Gudang Ramai',
    icon: 'busy',
    desc: 'Paket masuk lebih cepat.',
    duration: 45,
    apply: (m) => { m.spawnFactor *= 0.55; },
    revert: (m) => { m.spawnFactor /= 0.55; },
  },
  scanner_error: {
    id: 'scanner_error',
    name: 'Scanner Error',
    icon: 'warning',
    desc: 'Scan lebih lambat.',
    duration: 20,
    apply: (m) => { m.scanFactor *= 2.0; },
    revert: (m) => { m.scanFactor /= 2.0; },
  },
  vehicle_broken: {
    id: 'vehicle_broken',
    name: 'Kendaraan Rusak',
    icon: 'broken',
    desc: 'Satu kendaraan masuk maintenance.',
    duration: 40,
    breaksVehicle: true, // ditangani khusus oleh RandomEventSystem
    apply: () => {},
    revert: () => {},
  },
  express_rush: {
    id: 'express_rush',
    name: 'Express Rush',
    icon: 'bolt',
    desc: 'Kemunculan paket express meningkat.',
    duration: 30,
    apply: (m) => { m.expressBias = 0.65; },
    revert: (m) => { m.expressBias = 0; },
  },
};

// Modifier global default yang dipengaruhi event
export function defaultMods() {
  return {
    deliveryFactor: 1, // pengali waktu kirim
    spawnFactor: 1, // pengali interval spawn (kecil = lebih cepat)
    scanFactor: 1, // pengali waktu scan
    expressBias: 0, // peluang paksa jenis express (0..1)
  };
}
