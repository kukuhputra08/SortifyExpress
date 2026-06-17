// ============================================================================
// AudioSystem.js — Efek suara & musik latar (GDD 10.1)
// Semua bunyi disintesis via Web Audio API → tanpa file audio eksternal.
// Diinisialisasi pada interaksi pertama (kebijakan autoplay browser).
// ============================================================================

import { EV } from '../core/EventBus.js';

export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.bus = game.bus;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicOn = true;
    this._musicTimer = null;
    this._wire();
  }

  /** Pasang ulang listener setelah EventBus dibersihkan (ganti level). */
  rewire() { this._wire(); }

  init() {
    if (this.ctx) return;
    if (typeof window === 'undefined') return; // aman di lingkungan non-browser (test)
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.14;
    this.musicGain.connect(this.master);
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // -- nada dasar ---------------------------------------------------------
  tone(freq, dur = 0.12, type = 'sine', gain = 0.3, when = 0, dest = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  play(name) {
    this.init();
    switch (name) {
      case 'click': this.tone(420, 0.06, 'triangle', 0.22); break;
      case 'scan': this.tone(880, 0.05, 'square', 0.18); this.tone(1320, 0.06, 'square', 0.14, 0.05); break;
      case 'success': this.tone(660, 0.1, 'sine', 0.28); this.tone(880, 0.12, 'sine', 0.24, 0.09); break;
      case 'deliver': this.tone(523, 0.1, 'sine', 0.28); this.tone(659, 0.1, 'sine', 0.26, 0.08); this.tone(784, 0.16, 'sine', 0.24, 0.16); break;
      case 'error': this.tone(200, 0.18, 'sawtooth', 0.26); this.tone(150, 0.22, 'sawtooth', 0.22, 0.06); break;
      case 'warning': this.tone(440, 0.1, 'square', 0.2); this.tone(440, 0.1, 'square', 0.2, 0.16); break;
      case 'super': this.tone(523, 0.1, 'square', 0.24); this.tone(784, 0.1, 'square', 0.22, 0.08); this.tone(1046, 0.18, 'square', 0.2, 0.16); break;
      default: this.tone(440, 0.08, 'sine', 0.2);
    }
  }

  // -- musik latar: groove warehouse rendah + blip scanner ----------------
  startMusic() {
    if (!this.musicOn) return;
    this.init();
    if (!this.ctx || this._musicTimer) return;
    const bass = [98, 98, 130.8, 98, 146.8, 130.8, 98, 73.4];
    const blips = [392, 0, 523.2, 0, 440, 0, 587.3, 0];
    let i = 0;
    const step = () => {
      if (this.muted || !this.musicOn) return;
      const b = bass[i % bass.length];
      this.tone(b, 0.18, 'triangle', 0.34, 0, this.musicGain);
      if (i % 2 === 0) this.tone(48, 0.08, 'sine', 0.28, 0, this.musicGain);
      if (i % 4 === 2) this.tone(185, 0.06, 'square', 0.12, 0.03, this.musicGain);
      const hi = blips[i % blips.length];
      if (hi) this.tone(hi, 0.05, 'sine', 0.09, 0.08, this.musicGain);
      i += 1;
    };
    this._musicTimer = setInterval(step, 280);
  }

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  _wire() {
    this.bus.on(EV.PACKAGE_SCANNED, () => this.play('scan'));
    this.bus.on(EV.PACKAGE_SORTED, () => this.play('success'));
    this.bus.on(EV.PACKAGE_PACKED, () => this.play('success'));
    this.bus.on(EV.DELIVERY_SUCCESS, () => this.play('deliver'));
    this.bus.on(EV.VEHICLE_DEPARTED, () => this.play('click'));
    this.bus.on(EV.WRONG_SORT, () => this.play('error'));
    this.bus.on(EV.PACKAGE_DAMAGED, () => this.play('error'));
    this.bus.on(EV.DELIVERY_LATE, () => this.play('error'));
    this.bus.on(EV.AREA_OVERLOAD, () => this.play('warning'));
    this.bus.on(EV.AREA_BOTTLENECK, () => this.play('warning'));
    this.bus.on(EV.RANDOM_EVENT_START, () => this.play('warning'));
  }
}
