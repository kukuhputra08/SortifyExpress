// ============================================================================
// ScoreSystem.js — Skor, Combo & Streak (GDD 6.1 & 6.2)
// Mendengarkan event proses paket dan menghitung skor + pengali combo.
// ============================================================================

import { EV } from '../core/EventBus.js';
import { CONFIG } from '../data/config.js';

export class ScoreSystem {
  constructor(game) {
    this.game = game;
    this.bus = game.bus;
    this.score = 0;
    this.combo = 0; // jumlah paket sukses berturut-turut
    this.maxCombo = 0;
    this.superMode = false; // Super Dispatch Mode (combo ≥ 10)
    this.floaters = []; // teks skor mengambang untuk UI
    this._wire();
  }

  get multiplier() {
    const C = CONFIG.COMBO;
    if (this.combo >= C.SUPER_AT) return C.SUPER_MULT;
    if (this.combo >= C.X3_AT) return 3;
    if (this.combo >= C.X2_AT) return 2;
    return 1;
  }

  add(base, label) {
    const amount = base > 0 ? Math.round(base * this.multiplier) : base;
    this.score = Math.max(0, this.score + amount);
    this.floaters.push({ amount, label, t: performance.now() });
    if (this.floaters.length > 6) this.floaters.shift();
    this.bus.emit(EV.SCORE_CHANGED, { score: this.score, amount });
  }

  bumpCombo() {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const wasSuper = this.superMode;
    this.superMode = this.combo >= CONFIG.COMBO.SUPER_AT;
    this.bus.emit(EV.COMBO_CHANGED, { combo: this.combo, multiplier: this.multiplier });
    if (this.superMode && !wasSuper) this.bus.emit(EV.TOAST, { text: '🔥 SUPER DISPATCH MODE!', kind: 'super' });
  }

  resetCombo() {
    if (this.combo > 0) this.bus.emit(EV.COMBO_CHANGED, { combo: 0, multiplier: 1 });
    this.combo = 0;
    this.superMode = false;
  }

  _wire() {
    const S = CONFIG.SCORE;
    this.bus.on(EV.PACKAGE_SCANNED, () => this.add(S.SCAN_CORRECT, 'Scan benar'));
    this.bus.on(EV.PACKAGE_SORTED, () => this.add(S.SORT_CORRECT, 'Sortir benar'));
    this.bus.on(EV.PACKAGE_PACKED, () => this.add(S.PACK_CORRECT, 'Packing benar'));

    this.bus.on(EV.WRONG_SORT, () => { this.add(S.WRONG_SORT, 'Salah sortir'); this.resetCombo(); });
    this.bus.on(EV.PACKAGE_DAMAGED, () => { this.add(S.FRAGILE_DAMAGED, 'Fragile rusak'); this.resetCombo(); });

    this.bus.on(EV.DELIVERY_SUCCESS, ({ pkg }) => {
      const base = pkg.isExpress() ? S.DELIVER_EXPRESS_ONTIME : S.DELIVER_ONTIME;
      this.add(base, pkg.isExpress() ? 'Express tepat waktu' : 'Tepat waktu');
      this.bumpCombo();
    });
    this.bus.on(EV.DELIVERY_LATE, () => { this.add(S.LATE, 'Terlambat'); this.resetCombo(); });
    this.bus.on(EV.DELIVERY_FAILED, () => { this.resetCombo(); });

    this.bus.on(EV.AREA_BOTTLENECK, ({ penalty }) => {
      if (penalty) this.add(S.OVERLOAD_TOO_LONG, 'Overload terlalu lama');
    });
  }
}
