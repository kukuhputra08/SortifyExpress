// ============================================================================
// levels.js — Desain level / "Day" (GDD 8)
// MVP realistis = Day 1–3. Day 4–7 disiapkan & ikut playable.
// ----------------------------------------------------------------------------
// Field penting:
//   duration       : durasi operasional level (detik)
//   targetDelivered: target jumlah paket terkirim untuk lulus
//   packageTypes   : jenis paket yang muncul di level ini
//   spawnInterval  : [min,max] jeda kemunculan paket (detik)
//   routes         : id rute yang dipakai
//   vehicles       : armada awal yang tersedia (urutan = slot)
//   events         : random event aktif (kosong = nonaktif)
//   pass           : override threshold KPI khusus level (opsional)
//   missions       : id misi opsional (lihat missions.js)
// ============================================================================

export const LEVELS = [
  {
    id: 1,
    name: 'Basic Warehouse Training',
    subtitle: 'Day 1',
    brief: 'Pelajari alur dasar: scan → sortir → packing → loading → dispatch.',
    feature: 'Paket reguler & sorting dasar',
    duration: 150,
    targetDelivered: 10,
    packageTypes: ['regular'],
    spawnInterval: [9, 12],
    routes: ['surabaya', 'sidoarjo', 'gresik'],
    vehicles: ['van', 'motor'],
    events: [],
    missions: ['deliver_target', 'accuracy_85'],
  },
  {
    id: 2,
    name: 'Express Rush',
    subtitle: 'Day 2',
    brief: 'Paket express muncul. Deadline cepat (45s) — dahulukan!',
    feature: 'Paket express & deadline cepat',
    duration: 180,
    targetDelivered: 15,
    packageTypes: ['regular', 'express'],
    spawnInterval: [7.5, 10],
    routes: ['surabaya', 'sidoarjo', 'malang', 'gresik'],
    vehicles: ['van', 'motor', 'motor'],
    events: [],
    pass: { ontime: 80 },
    missions: ['deliver_target', 'ontime_80', 'express_priority'],
  },
  {
    id: 3,
    name: 'Fragile Handling',
    subtitle: 'Day 3',
    brief: 'Paket fragile berisiko rusak. Pack hati-hati, hindari overload.',
    feature: 'Paket fragile & risiko damage',
    duration: 195,
    targetDelivered: 16,
    packageTypes: ['regular', 'express', 'fragile'],
    spawnInterval: [7, 9],
    routes: ['surabaya', 'sidoarjo', 'malang', 'gresik', 'jember'],
    vehicles: ['van', 'motor', 'motor'],
    events: [],
    pass: { damageMax: 12 },
    missions: ['deliver_target', 'safety_nodamage', 'accuracy_85'],
  },
  {
    id: 4,
    name: 'Vehicle Management',
    subtitle: 'Day 4',
    brief: 'Tiga jenis kendaraan + paket oversize. Pilih kendaraan sesuai kapasitas.',
    feature: 'Motor, van, truck & oversize',
    duration: 210,
    targetDelivered: 20,
    packageTypes: ['regular', 'express', 'fragile', 'oversize'],
    spawnInterval: [6.8, 8.8],
    routes: ['surabaya', 'sidoarjo', 'malang', 'gresik', 'jember'],
    vehicles: ['truck', 'van', 'motor'],
    events: [],
    missions: ['deliver_target', 'vehicle_fit', 'ontime_80'],
  },
  {
    id: 5,
    name: 'Rainy Delivery',
    subtitle: 'Day 5',
    brief: 'Hujan deras memperlambat kendaraan. Jaga satisfaction di atas 65%.',
    feature: 'Random event: hujan',
    duration: 210,
    targetDelivered: 20,
    packageTypes: ['regular', 'express', 'fragile'],
    spawnInterval: [6.8, 8.8],
    routes: ['surabaya', 'sidoarjo', 'malang', 'gresik', 'jember'],
    vehicles: ['van', 'van', 'motor'],
    events: ['rain', 'scanner_error', 'vehicle_broken'],
    pass: { satisfaction: 65 },
    missions: ['deliver_target', 'satisfaction_65'],
  },
  {
    id: 6,
    name: 'Peak Season',
    subtitle: 'Day 6',
    brief: 'Paket masuk lebih cepat. Hindari overload terlalu lama!',
    feature: 'Lonjakan paket masuk',
    duration: 225,
    targetDelivered: 26,
    packageTypes: ['regular', 'express', 'fragile', 'cod'],
    spawnInterval: [5.4, 7],
    routes: ['surabaya', 'sidoarjo', 'malang', 'gresik', 'jember', 'banyuwangi'],
    vehicles: ['truck', 'van', 'motor'],
    events: ['busy', 'rain', 'express_rush'],
    missions: ['deliver_target', 'efficiency_overload', 'ontime_80'],
  },
  {
    id: 7,
    name: 'Final Logistic Audit',
    subtitle: 'Day 7',
    brief: 'Semua fitur aktif. Capai grade minimal A untuk lulus audit!',
    feature: 'Semua fitur aktif',
    duration: 240,
    targetDelivered: 30,
    packageTypes: ['regular', 'express', 'fragile', 'cod', 'oversize'],
    spawnInterval: [5.2, 6.8],
    routes: ['surabaya', 'sidoarjo', 'malang', 'gresik', 'jember', 'banyuwangi'],
    vehicles: ['truck', 'van', 'van', 'motor'],
    events: ['busy', 'rain', 'scanner_error', 'vehicle_broken', 'express_rush'],
    pass: { ontime: 85, accuracy: 90, satisfaction: 80, damageMax: 10 },
    missions: ['deliver_target', 'grade_a', 'safety_nodamage'],
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}
