// ============================================================================
// RandomEventSystem.js — Random Event (GDD 5.7)
// Menjadwalkan event acak sesuai daftar level, menerapkan & mengembalikan
// modifier global (game.mods), serta menangani kendaraan rusak.
// ============================================================================

import { RANDOM_EVENTS } from '../data/events.js';
import { EV } from '../core/EventBus.js';
import { randRange, pick } from '../core/Utils.js';
import { CONFIG } from '../data/config.js';

export class RandomEventSystem {
  constructor(game) {
    this.game = game;
    this.pool = (game.level.events || []).map((id) => RANDOM_EVENTS[id]).filter(Boolean);
    this.active = null; // { def, timer }
    this.cooldown = randRange(CONFIG.EVENTS.MIN_GAP, CONFIG.EVENTS.MAX_GAP);
  }

  get activeEvent() { return this.active ? this.active.def : null; }

  trigger(def) {
    this.active = { def, timer: def.duration };
    if (def.breaksVehicle) {
      const target = this.game.vehicles.find((v) => v.fsm.is('idle'));
      if (target) target.breakDown(def.duration);
    } else {
      def.apply(this.game.mods);
    }
    this.bus().emit(EV.RANDOM_EVENT_START, { event: def });
    this.bus().emit(EV.TOAST, { text: `⚠ ${def.name}: ${def.desc}`, kind: 'event' });
  }

  end() {
    const def = this.active.def;
    if (!def.breaksVehicle) def.revert(this.game.mods);
    this.bus().emit(EV.RANDOM_EVENT_END, { event: def });
    this.active = null;
    this.cooldown = randRange(CONFIG.EVENTS.MIN_GAP, CONFIG.EVENTS.MAX_GAP);
  }

  bus() { return this.game.bus; }

  update(dt) {
    if (!this.pool.length) return;

    if (this.active) {
      this.active.timer -= dt;
      if (this.active.timer <= 0) this.end();
      return;
    }

    // jangan picu event di akhir level
    if (this.game.timeLeft <= 15) return;
    this.cooldown -= dt;
    if (this.cooldown <= 0) this.trigger(pick(this.pool));
  }
}
