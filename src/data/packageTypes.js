// ============================================================================
// packageTypes.js — Jenis paket & karakteristiknya (GDD 5.1 & 5.4)
// MVP fokus: Reguler, Express, Fragile. Sisanya disiapkan untuk pengembangan.
// ============================================================================

export const PACKAGE_TYPES = {
  regular: {
    id: 'regular',
    name: 'Reguler',
    color: '#4ea7a0',
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
    color: '#e07a3c',
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
    color: '#cc5340',
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
    color: '#97ad55',
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
    color: '#b07aa0',
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
