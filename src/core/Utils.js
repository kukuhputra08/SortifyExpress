// ============================================================================
// Utils.js — Helper umum (RNG, format, id, clamp)
// ============================================================================

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function chance(p) {
  return Math.random() < p;
}

let _idCounter = 0;
export function uid(prefix = 'id') {
  _idCounter += 1;
  return `${prefix}_${_idCounter}`;
}

// Kode paket gaya resi: SE-AB1234
export function packageCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const a = letters[randInt(0, letters.length - 1)] + letters[randInt(0, letters.length - 1)];
  const n = randInt(1000, 9999);
  return `SE-${a}${n}`;
}

export function formatTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function pct(value, total) {
  if (!total) return 0;
  return clamp((value / total) * 100, 0, 100);
}

// Debounce sederhana untuk resize, dsb.
export function debounce(fn, ms = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
