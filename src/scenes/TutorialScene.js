// ============================================================================
// TutorialScene.js — Tutorial singkat alur kerja (GDD 7.5 & 4.3).
// ============================================================================

import { iconEl } from '../ui/icons.js';

const STEPS = [
  { ic: 'inbound', t: 'Pilih Paket', d: 'Klik paket ber-barcode di map (atau tekan Q untuk yang paling mendesak). Operator otomatis hadir di station yang tepat.' },
  { ic: 'scan', t: 'Scan & Verifikasi', d: 'Pop-up proses terbuka & WAKTU BERHENTI. Cocokkan label resi paket dengan memilih kode yang sama dari manifest — tinggal klik, tanpa mengetik.' },
  { ic: 'sorting', t: 'Sortir', d: 'Pilih jalur kota tujuan yang sesuai hasil scan. Salah jalur menurunkan akurasi. Desktop bisa pakai angka 1-9.' },
  { ic: 'pack', t: 'Packing', d: 'Klik "Kemas Paket". Fragile butuh penanganan hati-hati dan lebih aman saat gudang tidak overload.' },
  { ic: 'qc', t: 'Quality Check', d: 'Pengecekan akhir otomatis. Paket lolos → siap dimuat, atau rusak bila apes (terutama fragile saat gudang padat).' },
  { ic: 'load', t: 'Loading', d: 'Pilih kendaraan yang kapasitas & jenisnya cocok. Oversize wajib Truck; express paling cepat lewat Motor/Van.' },
  { ic: 'dispatch', t: 'Dispatch', d: 'Pilih kirim otomatis atau antar manual lewat peta wilayah. Paket harus tiba sebelum deadline agar dihitung tepat waktu.' },
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

      <p class="tut-intro">Kamu adalah <b>operator gudang ekspedisi Sortify Express</b>. Setiap paket diproses <b>langkah demi langkah</b>: tiap tahap membuka <b>pop-up proses yang menghentikan waktu</b>, menjelaskan apa yang terjadi, dan memberi pilihan untuk diklik. Pahami prosesnya, jaga kapasitas gudang, dan kirim tepat waktu untuk KPI tinggi.</p>

      <div class="tut-controls">
        <span><b>Klik / Q</b> ambil paket</span>
        <span><b>E / Space</b> buka proses</span>
        <span><b>1-9</b> pilih jalur sortir</span>
        <span><b>R</b> dispatch otomatis cepat</span>
        <span><b>Esc</b> tutup pop-up / jeda</span>
      </div>

      <div class="tut-flow">${steps}</div>

      <div class="tut-legend">
        <h3>Jenis Paket</h3>
        <div class="legend-row">
          <span class="pill" style="--c:#4ea7a0">${iconEl('box')} Reguler · 90s</span>
          <span class="pill" style="--c:#e07a3c">${iconEl('bolt')} Express · 45s (prioritas!)</span>
          <span class="pill" style="--c:#cc5340">${iconEl('glass')} Fragile · 120s (hati-hati)</span>
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
