// ============================================================================
// RuleEngine.js — Aturan main: Customer Satisfaction & kondisi kalah.
// (GDD 5.3, 6.6, 13) Mengatur naik/turun satisfaction dari event & overload.
// ============================================================================

import { EV } from '../core/EventBus.js';
import { CONFIG } from '../data/config.js';
import { clamp } from '../core/Utils.js';

export class RuleEngine {
  constructor(game) {
    this.game = game;
    this.bus = game.bus;
    this.satisfaction = CONFIG.SAT.START;
    this.lost = false;
    this._wire();
  }

  adjust(delta, reason) {
    this.satisfaction = clamp(this.satisfaction + delta, CONFIG.SAT.MIN, CONFIG.SAT.MAX);
    if (delta < 0 && reason) this.bus.emit(EV.TOAST, { text: reason, kind: 'bad' });
  }

  _wire() {
    const S = CONFIG.SAT;
    this.bus.on(EV.DELIVERY_SUCCESS, ({ pkg }) =>
      this.adjust(pkg.isExpress() ? S.EXPRESS_ONTIME_GAIN : S.ONTIME_GAIN));
    this.bus.on(EV.DELIVERY_LATE, () => this.adjust(-S.LATE_LOSS, 'Paket terlambat 😟'));
    this.bus.on(EV.WRONG_SORT, () => this.adjust(-S.WRONG_SORT_LOSS, 'Salah sortir!'));
    this.bus.on(EV.PACKAGE_DAMAGED, () => this.adjust(-S.DAMAGE_LOSS, 'Paket fragile rusak! 💥'));
    this.bus.on(EV.DELIVERY_FAILED, () => this.adjust(-S.FAILED_LOSS, 'Paket gagal dikirim'));
  }

  update(dt) {
    const ws = this.game.warehouse.fsm.state;
    const C = CONFIG.WAREHOUSE;
    if (ws === 'overload') this.adjust(-C.SAT_DRAIN_OVERLOAD * dt);
    else if (ws === 'bottleneck') this.adjust(-C.SAT_DRAIN_BOTTLENECK * dt);

    if (this.satisfaction <= 0 && !this.lost) {
      this.lost = true;
      this.game.endLevel('lose', 'Customer satisfaction habis!');
    }
  }
}
