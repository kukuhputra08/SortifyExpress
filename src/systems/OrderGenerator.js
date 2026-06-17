// ============================================================================
// OrderGenerator.js — Spawn paket otomatis (Event Controller / GDD diagram).
// Interval & jenis paket mengikuti level; dipengaruhi event (busy/express_rush).
// ============================================================================

import { Package } from '../objects/Package.js';
import { randRange, pick, chance } from '../core/Utils.js';

export class OrderGenerator {
  constructor(game) {
    this.game = game;
    this.timer = 0;
    this.next = 0;
    this.spawned = 0;
    this._schedule();
  }

  _schedule() {
    const [min, max] = this.game.level.spawnInterval;
    this.next = randRange(min, max) * this.game.mods.spawnFactor;
    this.timer = 0;
  }

  _chooseType() {
    const types = this.game.level.packageTypes;
    // bias express bila event Express Rush aktif
    if (this.game.mods.expressBias > 0 && types.includes('express') && chance(this.game.mods.expressBias)) {
      return 'express';
    }
    return pick(types);
  }

  spawnOne() {
    const type = this._chooseType();
    const route = pick(this.game.level.routes);
    const pkg = new Package(type, route, this.game);
    this.game.packages.push(pkg);
    this.spawned += 1;
  }

  update(dt) {
    // berhenti spawn di 12 detik terakhir agar paket sempat diproses
    if (this.game.timeLeft <= 12) return;

    this.timer += dt;
    if (this.timer < this.next) return;

    // tahan spawn bila inbound terlalu penuh (cegah pile-up tak terbatas)
    const inboundCap = this.game.warehouse.capacityOf('inbound');
    if (this.game.warehouse.counts.inbound >= inboundCap + 2) {
      this.timer = this.next - 0.5; // coba lagi sebentar
      return;
    }

    this.spawnOne();
    this._schedule();
  }
}
