// ============================================================================
// routes.js — Tujuan pengiriman & rute (GDD 5.6)
// baseTime = waktu kirim dasar (detik) sebelum faktor kendaraan/event.
// delayRisk = peluang terkena delay tambahan saat Delivering.
// ============================================================================

export const ROUTES = {
  surabaya: { id: 'surabaya', name: 'Surabaya', distance: 'Dekat', baseTime: 8, delayRisk: 0.05 },
  sidoarjo: { id: 'sidoarjo', name: 'Sidoarjo', distance: 'Dekat', baseTime: 9, delayRisk: 0.05 },
  malang: { id: 'malang', name: 'Malang', distance: 'Sedang', baseTime: 15, delayRisk: 0.15 },
  gresik: { id: 'gresik', name: 'Gresik', distance: 'Sedang', baseTime: 14, delayRisk: 0.15 },
  jember: { id: 'jember', name: 'Jember', distance: 'Jauh', baseTime: 22, delayRisk: 0.28 },
  banyuwangi: { id: 'banyuwangi', name: 'Banyuwangi', distance: 'Sangat jauh', baseTime: 30, delayRisk: 0.32 },
};

export const ROUTE_LIST = Object.values(ROUTES);

// Subset rute "dekat" untuk level awal agar lebih mudah
export const EASY_ROUTES = ['surabaya', 'sidoarjo', 'gresik'];
