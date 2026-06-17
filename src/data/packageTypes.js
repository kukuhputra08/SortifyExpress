// ============================================================================
// packageTypes.js — Jenis paket & karakteristiknya (GDD 5.1 & 5.4)
// MVP fokus: Reguler, Express, Fragile. Sisanya disiapkan untuk pengembangan.
// ============================================================================

export const PACKAGE_TYPES = {
  regular: {
    id: 'regular',
    name: 'Reguler',
    color: '#4f8cff',
    icon: 'box',
    deadline: 90, // detik (GDD 5.4)
    baseScoreOnTime: 300,
    fragile: false,
    oversize: false,
    needsPaymentValidation: false,
    desc: 'Paket normal dengan deadline standar.',
  },
  express: {
    id: 'express',
    name: 'Express',
    color: '#ff7a45',
    icon: 'bolt',
    deadline: 45,
    baseScoreOnTime: 500,
    fragile: false,
    oversize: false,
    needsPaymentValidation: false,
    desc: 'Deadline cepat, nilai tinggi. Prioritaskan!',
  },
  fragile: {
    id: 'fragile',
    name: 'Fragile',
    color: '#ff4d6d',
    icon: 'glass',
    deadline: 120,
    baseScoreOnTime: 350,
    fragile: true,
    oversize: false,
    needsPaymentValidation: false,
    desc: 'Mudah rusak. Pack hati-hati, hindari overload.',
  },

  // --- Fitur pengembangan (tersedia di level lanjut) ---------------------
  cod: {
    id: 'cod',
    name: 'COD',
    color: '#22c55e',
    icon: 'cash',
    deadline: 100,
    baseScoreOnTime: 380,
    fragile: false,
    oversize: false,
    needsPaymentValidation: true,
    desc: 'Butuh validasi pembayaran sebelum dispatch.',
  },
  oversize: {
    id: 'oversize',
    name: 'Oversize',
    color: '#a855f7',
    icon: 'crate',
    deadline: 110,
    baseScoreOnTime: 400,
    fragile: false,
    oversize: true,
    needsPaymentValidation: false,
    desc: 'Besar. Wajib truck & makan kapasitas lebih.',
  },
};

export const PACKAGE_TYPE_LIST = Object.values(PACKAGE_TYPES);
