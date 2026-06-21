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
    // filter low-pass lembut → menghangatkan bunyi (karakter "vintage" analog)
    this.warmth = this.ctx.createBiquadFilter();
    this.warmth.type = 'lowpass';
    this.warmth.frequency.value = 5200;
    this.warmth.Q.value = 0.4;
    this.master.connect(this.warmth);
    this.warmth.connect(this.ctx.destination);
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
      // klik UI lembut: dua harmonik triangle → terasa "empuk" bukan beep kasar
      case 'click': this.tone(380, 0.05, 'triangle', 0.2); this.tone(560, 0.05, 'triangle', 0.1, 0.015); break;
      case 'pickup': this.tone(300, 0.06, 'sine', 0.22); this.tone(450, 0.08, 'sine', 0.18, 0.04); break;
      case 'scan': this.tone(880, 0.05, 'square', 0.16); this.tone(1320, 0.06, 'sine', 0.13, 0.05); break;
      // sukses: arpeggio mayor naik yang hangat
      case 'success': this.tone(587, 0.1, 'triangle', 0.26); this.tone(740, 0.12, 'sine', 0.22, 0.07); this.tone(880, 0.14, 'sine', 0.2, 0.14); break;
      // deliver: fanfare tiga nada + oktaf bawah biar berisi
      case 'deliver': this.tone(523, 0.12, 'triangle', 0.28); this.tone(659, 0.12, 'sine', 0.24, 0.1); this.tone(784, 0.2, 'sine', 0.24, 0.2); this.tone(392, 0.22, 'sine', 0.16, 0.2); break;
      case 'error': this.tone(196, 0.18, 'sawtooth', 0.24); this.tone(147, 0.24, 'sawtooth', 0.2, 0.07); break;
      case 'warning': this.tone(415, 0.12, 'triangle', 0.2); this.tone(415, 0.12, 'triangle', 0.2, 0.18); break;
      // super: arpeggio cerah lima nada
      case 'super': this.tone(523, 0.1, 'triangle', 0.24); this.tone(659, 0.1, 'triangle', 0.22, 0.07); this.tone(784, 0.1, 'sine', 0.22, 0.14); this.tone(1046, 0.22, 'sine', 0.2, 0.21); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, k) => this.tone(f, 0.16, 'triangle', 0.22, k * 0.09)); break;
      default: this.tone(440, 0.08, 'sine', 0.2);
    }
  }

  // -- musik latar: lo-fi groove gudang yang hangat (tema vintage) ---------
  startMusic() {
    if (!this.musicOn) return;
    this.init();
    if (!this.ctx || this._musicTimer) return;
    // progresi mellow Am–F–C–G (akar) + melodi blip yang santai
    const bass = [110, 110, 87.3, 87.3, 130.8, 130.8, 98, 98];
    const chord = [
      [220, 261.6, 329.6], [220, 261.6, 329.6],
      [174.6, 220, 261.6], [174.6, 220, 261.6],
      [196, 261.6, 329.6], [196, 261.6, 329.6],
      [196, 246.9, 293.7], [196, 246.9, 293.7],
    ];
    const blips = [659.3, 0, 587.3, 0, 523.2, 0, 587.3, 0];
    let i = 0;
    const step = () => {
      if (this.muted || !this.musicOn) return;
      const b = bass[i % bass.length];
      this.tone(b, 0.34, 'triangle', 0.32, 0, this.musicGain);    // bassline
      if (i % 2 === 0) this.tone(55, 0.12, 'sine', 0.26, 0, this.musicGain); // kick rendah
      if (i % 4 === 2) this.tone(220, 0.05, 'triangle', 0.08, 0.02, this.musicGain); // hihat-ish
      // pad akor pelan biar terasa "warm room"
      chord[i % chord.length].forEach((f) => this.tone(f, 0.42, 'sine', 0.05, 0, this.musicGain));
      const hi = blips[i % blips.length];
      if (hi) this.tone(hi, 0.06, 'sine', 0.07, 0.1, this.musicGain);
      i += 1;
    };
    this._musicTimer = setInterval(step, 330);
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
