// ============================================================================
// icons.js — Pustaka aset visual (SVG inline)
// Semua sprite/ikon digambar prosedural sebagai SVG → tanpa file gambar
// eksternal, tetap tajam di segala resolusi & mudah diberi warna (currentColor).
// ============================================================================

const I = {
  // -- Ikon paket ---------------------------------------------------------
  box: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4z" fill="currentColor" opacity=".9"/><path d="M3 7v10l9 4V11L3 7z" fill="currentColor" opacity=".55"/><path d="M21 7v10l-9 4V11l9-4z" fill="currentColor" opacity=".75"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor"/></svg>`,
  glass: `<svg viewBox="0 0 24 24" fill="none"><path d="M8 2h8l-1 7a3 3 0 01-6 0L8 2z" fill="currentColor" opacity=".85"/><path d="M12 12v7M9 21h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  cash: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" fill="currentColor" opacity=".85"/><circle cx="12" cy="12" r="3" fill="#0c1322"/></svg>`,
  crate: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity=".8"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="#0c1322" stroke-width="1.4"/></svg>`,

  // -- Ikon kendaraan -----------------------------------------------------
  motorcycle: `<svg viewBox="0 0 24 24" fill="none"><circle cx="5.5" cy="17" r="3" stroke="currentColor" stroke-width="2"/><circle cx="18.5" cy="17" r="3" stroke="currentColor" stroke-width="2"/><path d="M5.5 17l4-6h5l3 6M9 11l-1-3h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  van: `<svg viewBox="0 0 24 24" fill="none"><path d="M2 7h11v8H2zM13 9h4l3 3v3h-7z" fill="currentColor" opacity=".85"/><circle cx="7" cy="17" r="2" fill="#0c1322" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="17" r="2" fill="#0c1322" stroke="currentColor" stroke-width="1.6"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" fill="none"><path d="M1 6h13v9H1zM14 9h4l4 3v3h-8z" fill="currentColor" opacity=".85"/><circle cx="6" cy="17" r="2" fill="#0c1322" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="17" r="2" fill="#0c1322" stroke="currentColor" stroke-width="1.6"/></svg>`,

  // -- Ikon area gudang ---------------------------------------------------
  inbound: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v4h16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  scanner: `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="16" height="12" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M7 9v6M10 9v6M13 9v6M16 9v6" stroke="currentColor" stroke-width="1.6"/><path d="M3 3l18 18" stroke="#ff5d73" stroke-width="0" /></svg>`,
  scan: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  sorting: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 6h13l-3-3M3 6l3 3M21 18H8l3 3M21 18l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  packing: `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="8" width="16" height="12" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M4 8l8-5 8 5M12 3v17" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  qc: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  loading: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="11" height="9" rx="1" stroke="currentColor" stroke-width="1.8"/><path d="M14 13h3l4 3v3h-7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 3v6m0 0l-2-2m2 2l2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  dispatch: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 12h12M11 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,

  // -- Ikon aksi & status -------------------------------------------------
  pack: `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="7" width="16" height="13" rx="1.5" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="1.8"/><path d="M9 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.8"/></svg>`,
  load: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l10 18H2L12 3z" fill="currentColor" opacity=".9"/><path d="M12 9v5M12 17.5v.5" stroke="#0c1322" stroke-width="2" stroke-linecap="round"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 22s7-7 7-12a7 7 0 10-14 0c0 5 7 12 7 12z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.5" fill="currentColor"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l3 6.5 7 .7-5.2 4.8L18.5 21 12 17.3 5.5 21l1.7-7L2 9.2l7-.7L12 2z" fill="currentColor"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".85"/><path d="M12 7v10M9.5 9.5h3.5a1.5 1.5 0 010 3H10a1.5 1.5 0 000 3h4" stroke="#0c1322" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // -- Ikon event ---------------------------------------------------------
  rain: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 12a4 4 0 010-8 5 5 0 019.6-1A4 4 0 0117 12H6z" fill="currentColor" opacity=".8"/><path d="M8 16l-1 3M12 16l-1 3M16 16l-1 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  busy: `<svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="8" r="3" fill="currentColor" opacity=".85"/><circle cx="16" cy="8" r="3" fill="currentColor" opacity=".6"/><path d="M2 19a5 5 0 0110 0M12 19a5 5 0 0110 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  broken: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 13h8l4 4h6v3H3z" fill="currentColor" opacity=".8"/><path d="M7 9l2 2-2 2M11 7l2 2-2 2" stroke="#ff5d73" stroke-width="1.8" stroke-linecap="round"/></svg>`,

  // -- Ikon upgrade -------------------------------------------------------
  machine: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="11" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M7 8V5h6v3M8 13h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  courier: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M5 21a7 7 0 0114 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="14" y="11" width="6" height="5" rx="1" fill="currentColor" opacity=".7"/></svg>`,
  training: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l9 5-9 5-9-5 9-5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 11v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5" stroke="currentColor" stroke-width="1.8"/></svg>`,
  route: `<svg viewBox="0 0 24 24" fill="none"><circle cx="6" cy="18" r="2.5" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="6" r="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M8 18h6a3 3 0 003-3V9" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 3" stroke-linecap="round"/></svg>`,

  // -- Lain-lain ----------------------------------------------------------
  play: `<svg viewBox="0 0 24 24" fill="none"><path d="M7 4l13 8-13 8V4z" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 5a2 2 0 012-2h6v16H6a2 2 0 00-2 2V5zM20 5a2 2 0 00-2-2h-6v16h6a2 2 0 012 2V5z" stroke="currentColor" stroke-width="1.6"/></svg>`,
  gauge: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 18a8 8 0 1116 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 18l4-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  staff: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M5 20a7 7 0 0114 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
};

// Logo lockup untuk Main Menu / header
export const LOGO_SVG = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="4" y="6" width="56" height="52" rx="10" fill="url(#lg)"/>
  <path d="M14 40l18-9 18 9-18 9-18-9z" fill="#0c1322" opacity=".35"/>
  <path d="M32 14l16 8-16 8-16-8 16-8z" fill="#ffd166"/>
  <path d="M16 22v12l16 8V30L16 22z" fill="#ff7a45"/>
  <path d="M48 22v12l-16 8V30l16-8z" fill="#4f8cff"/>
  <defs><linearGradient id="lg" x1="4" y1="6" x2="60" y2="58" gradientUnits="userSpaceOnUse">
    <stop stop-color="#1b2740"/><stop offset="1" stop-color="#0c1322"/></linearGradient></defs>
</svg>`;

/** Ambil markup SVG ikon. name -> string SVG (atau ikon box bila tak ada). */
export function icon(name) {
  return I[name] || I.box;
}

/** Bungkus ikon dengan span agar bisa diberi class/warna. */
export function iconEl(name, cls = '') {
  return `<span class="ico ${cls}" aria-hidden="true">${icon(name)}</span>`;
}

export const ICONS = I;
