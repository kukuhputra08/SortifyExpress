// ============================================================================
// characters.js — Sprite karakter 2D & kendaraan tampak-samping (SVG).
// Bagian yang dianimasikan diberi class agar bisa digerakkan via CSS:
//   .arm (lengan pekerja), .wheel (roda), .lid (penutup box), dst.
// ============================================================================

// -- Pekerja gudang (operator) ---------------------------------------------
// Grup .arm-r / .arm-l berputar di sendi bahu saat state .working.
export const WORKER_SVG = `
<svg class="char" viewBox="0 0 64 84" xmlns="http://www.w3.org/2000/svg">
  <ellipse class="char-shadow" cx="32" cy="80" rx="20" ry="4"/>
  <!-- kaki -->
  <rect x="24" y="56" width="7" height="20" rx="3.5" fill="#27406b"/>
  <rect x="33" y="56" width="7" height="20" rx="3.5" fill="#27406b"/>
  <rect x="22" y="73" width="10" height="6" rx="2" fill="#16223c"/>
  <rect x="32" y="73" width="10" height="6" rx="2" fill="#16223c"/>
  <!-- lengan kiri (di belakang box) -->
  <g class="arm arm-l">
    <rect x="16" y="36" width="8" height="20" rx="4" fill="#ff7a45"/>
    <circle cx="20" cy="56" r="4.5" fill="#f1c27d"/>
  </g>
  <!-- badan + rompi safety -->
  <rect x="19" y="33" width="26" height="26" rx="9" fill="#ff7a45"/>
  <rect x="29.5" y="33" width="5" height="26" fill="#ffd166" opacity=".9"/>
  <rect x="19" y="42" width="26" height="4" fill="#ffd166" opacity=".9"/>
  <!-- lengan kanan (depan) -->
  <g class="arm arm-r">
    <rect x="40" y="36" width="8" height="20" rx="4" fill="#ff8c5c"/>
    <circle cx="44" cy="56" r="4.5" fill="#f1c27d"/>
  </g>
  <!-- kepala -->
  <circle cx="32" cy="22" r="12" fill="#f1c27d"/>
  <circle cx="27.5" cy="22" r="1.7" fill="#22304d"/>
  <circle cx="36.5" cy="22" r="1.7" fill="#22304d"/>
  <path class="mouth" d="M28 27 q4 3 8 0" stroke="#9a6b3f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <!-- helm proyek -->
  <path d="M20 18 a12 12 0 0 1 24 0 z" fill="#4f8cff"/>
  <rect x="18" y="17" width="28" height="4" rx="2" fill="#3b6fd6"/>
  <rect x="30" y="7" width="4" height="6" rx="2" fill="#3b6fd6"/>
  <!-- tetes keringat (muncul saat tired via CSS) -->
  <circle class="sweat" cx="46" cy="18" r="2.6" fill="#7fd4ff"/>
</svg>`;

// -- Avatar staff mini (kepala+bahu) untuk panel staff ----------------------
export function staffAvatar() {
  return `
  <svg class="mini-char" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="15" r="9" fill="#f1c27d"/>
    <path d="M11 12 a9 9 0 0 1 18 0 z" fill="#4f8cff"/>
    <circle cx="16.5" cy="15" r="1.4" fill="#22304d"/>
    <circle cx="23.5" cy="15" r="1.4" fill="#22304d"/>
    <path d="M8 38 a12 11 0 0 1 24 0 z" fill="#ff7a45"/>
    <rect x="18" y="27" width="4" height="11" fill="#ffd166" opacity=".9"/>
    <circle class="sweat" cx="30" cy="11" r="2" fill="#7fd4ff"/>
  </svg>`;
}

// -- Kendaraan tampak samping (untuk jalan pengiriman) ----------------------
// .wheel berputar saat .moving; bak/atap diberi warna jenis paket netral.
function motorSide() {
  return `
  <svg class="veh-side motor" viewBox="0 0 70 50" xmlns="http://www.w3.org/2000/svg">
    <circle class="wheel" cx="16" cy="38" r="9" fill="none" stroke="#1b2740" stroke-width="4"/>
    <circle class="wheel" cx="54" cy="38" r="9" fill="none" stroke="#1b2740" stroke-width="4"/>
    <circle cx="16" cy="38" r="2.4" fill="#93a0bd"/><circle cx="54" cy="38" r="2.4" fill="#93a0bd"/>
    <path d="M16 38 L34 24 H46 L54 38" stroke="#ff7a45" stroke-width="4" fill="none" stroke-linejoin="round"/>
    <rect x="40" y="14" width="14" height="12" rx="2" fill="#4f8cff"/>
    <path d="M44 24 l-4 -7 h6" stroke="#ff8c5c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="33" cy="18" r="5" fill="#f1c27d"/>
    <path d="M28 17 a5 5 0 0 1 10 0 z" fill="#22304d"/>
  </svg>`;
}
function vanSide() {
  return `
  <svg class="veh-side van" viewBox="0 0 84 50" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="14" width="50" height="22" rx="4" fill="#4f8cff"/>
    <path d="M56 20 h12 l10 9 v7 h-22 z" fill="#3b6fd6"/>
    <rect x="58" y="22" width="9" height="8" rx="1.5" fill="#bcd4ff"/>
    <rect x="12" y="18" width="10" height="8" rx="1.5" fill="#bcd4ff"/>
    <rect x="6" y="33" width="72" height="4" fill="#22304d"/>
    <circle class="wheel" cx="22" cy="40" r="8" fill="#16223c" stroke="#5b6e94" stroke-width="3"/>
    <circle class="wheel" cx="64" cy="40" r="8" fill="#16223c" stroke="#5b6e94" stroke-width="3"/>
    <circle cx="22" cy="40" r="2.2" fill="#93a0bd"/><circle cx="64" cy="40" r="2.2" fill="#93a0bd"/>
  </svg>`;
}
function truckSide() {
  return `
  <svg class="veh-side truck" viewBox="0 0 96 50" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="8" width="56" height="28" rx="3" fill="#7c8db5"/>
    <rect x="10" y="12" width="48" height="20" rx="2" fill="#5b6e94"/>
    <path d="M62 16 h12 l14 12 v8 h-26 z" fill="#4f8cff"/>
    <rect x="66" y="19" width="11" height="9" rx="1.5" fill="#bcd4ff"/>
    <rect x="6" y="33" width="82" height="4" fill="#16223c"/>
    <circle class="wheel" cx="24" cy="41" r="8" fill="#16223c" stroke="#9aa8cc" stroke-width="3"/>
    <circle class="wheel" cx="46" cy="41" r="8" fill="#16223c" stroke="#9aa8cc" stroke-width="3"/>
    <circle class="wheel" cx="74" cy="41" r="8" fill="#16223c" stroke="#9aa8cc" stroke-width="3"/>
  </svg>`;
}

export function vehicleSide(type) {
  if (type === 'motor') return motorSide();
  if (type === 'truck') return truckSide();
  return vanSide();
}

// -- Bangunan kecil untuk dekorasi jalan ------------------------------------
export const DEPOT_SVG = `
<svg viewBox="0 0 48 44" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="18" width="40" height="24" rx="2" fill="#22304d"/>
  <path d="M4 18 L24 6 L44 18 Z" fill="#34507f"/>
  <rect x="10" y="26" width="8" height="16" fill="#16223c"/>
  <rect x="22" y="26" width="8" height="8" fill="#4f8cff"/>
  <rect x="32" y="26" width="8" height="8" fill="#4f8cff"/>
</svg>`;

export const CITY_SVG = `
<svg viewBox="0 0 56 48" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="20" width="14" height="26" fill="#2a3b5e"/>
  <rect x="20" y="10" width="14" height="36" fill="#34507f"/>
  <rect x="36" y="24" width="14" height="22" fill="#2a3b5e"/>
  <rect x="7" y="24" width="4" height="4" fill="#ffd166"/><rect x="13" y="24" width="4" height="4" fill="#ffd166"/>
  <rect x="23" y="15" width="4" height="4" fill="#ffd166"/><rect x="29" y="15" width="4" height="4" fill="#ffd166"/>
  <rect x="23" y="23" width="4" height="4" fill="#ffd166"/><rect x="39" y="28" width="4" height="4" fill="#ffd166"/>
</svg>`;
