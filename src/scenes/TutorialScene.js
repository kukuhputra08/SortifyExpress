// ============================================================================
// TutorialScene.js — Tutorial singkat alur kerja (GDD 7.5 & 4.3).
// ============================================================================

import { iconEl } from '../ui/icons.js';

const STEPS = [
  { ic: 'inbound', t: 'Ambil & Scan', d: 'Gerakkan operator dengan WASD/arrow atau analog mobile ke Inbound, pilih paket ber-barcode, lalu scan.' },
  { ic: 'sorting', t: 'Sortir', d: 'Dekati Sorting Line dan pilih jalur tujuan yang SAMA dengan hasil scan. Desktop bisa pakai angka 1-9.' },
  { ic: 'pack', t: 'Packing', d: 'Dekati Packing Bench lalu tekan Aksi/E. Fragile butuh waktu lebih dan lebih aman saat gudang tidak overload.' },
  { ic: 'qc', t: 'Quality Check', d: 'Pengecekan akhir otomatis. Paket lolos → siap dimuat, atau rusak bila apes.' },
  { ic: 'load', t: 'Loading', d: 'Bawa operator ke Loading, lalu muat paket ke kendaraan sesuai kapasitas. Oversize wajib Truck.' },
  { ic: 'dispatch', t: 'Dispatch', d: 'Berangkatkan kendaraan. Paket harus tiba sebelum deadline agar tepat waktu.' },
];

export class TutorialScene {
  constructor(game, root) { this.game = game; this.root = root; }

  mount() {
    this.root.innerHTML = this.render();
    this.root.onclick = (e) => this.onClick(e);
  }
  unmount() { this.root.onclick = null; }

  render() {
    const steps = STEPS.map((s, i) => `
      <div class="tut-step">
        <div class="tut-num">${i + 1}</div>
        <div class="tut-ic">${iconEl(s.ic)}</div>
        <div class="tut-body"><h3>${s.t}</h3><p>${s.d}</p></div>
      </div>`).join('<div class="tut-arrow">▾</div>');

    return `
    <div class="scene tutorial-scene">
      <header class="scene-head">
        <button class="btn btn-ghost" data-action="back">‹ Menu</button>
        <h2>Cara Bermain</h2>
        <span></span>
      </header>

      <p class="tut-intro">Kamu adalah <b>operator gudang ekspedisi</b>. Gerakkan karakter di map gudang, baca barcode paket, dekati station yang benar, jaga kapasitas gudang, dan kirim tepat waktu untuk KPI tinggi.</p>

      <div class="tut-controls">
        <span><b>WASD / Arrow</b> gerak</span>
        <span><b>E / Space</b> aksi</span>
        <span><b>Q</b> paket urgent</span>
        <span><b>R</b> dispatch</span>
        <span><b>Mobile</b> analog + tombol aksi</span>
      </div>

      <div class="tut-flow">${steps}</div>

      <div class="tut-legend">
        <h3>Jenis Paket</h3>
        <div class="legend-row">
          <span class="pill" style="--c:#4f8cff">${iconEl('box')} Reguler · 90s</span>
          <span class="pill" style="--c:#ff7a45">${iconEl('bolt')} Express · 45s (prioritas!)</span>
          <span class="pill" style="--c:#ff4d6d">${iconEl('glass')} Fragile · 120s (hati-hati)</span>
        </div>
        <h3>Kendaraan</h3>
        <div class="legend-row">
          <span class="pill">${iconEl('motorcycle')} Motor · 3 · cepat</span>
          <span class="pill">${iconEl('van')} Van · 10 · sedang</span>
          <span class="pill">${iconEl('truck')} Truck · 25 · lambat</span>
        </div>
      </div>

      <div class="tut-cta">
        <button class="btn btn-primary btn-lg" data-action="start">${iconEl('play')} Mulai Day 1</button>
      </div>
    </div>`;
  }

  onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    this.game.audio.play('click');
    if (el.dataset.action === 'back') this.game.gameFSM.transition('main_menu');
    else if (el.dataset.action === 'start') this.game.startLevel(1);
  }
}
