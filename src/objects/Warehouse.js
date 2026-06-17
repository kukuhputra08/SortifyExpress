// ============================================================================
// Warehouse.js — Objek Gudang. Menghitung isi tiap area & menjalankan FSM.
// ============================================================================

import { createWarehouseFSM, WH_STATE_LABEL } from '../fsm/WarehouseFSM.js';
import { CONFIG } from '../data/config.js';

const AREAS = ['inbound', 'sorting', 'packing', 'qc', 'loading'];

export class Warehouse {
  constructor(game) {
    this.game = game;
    this.counts = { inbound: 0, sorting: 0, packing: 0, qc: 0, loading: 0 };
    this.ratio = 0; // rasio isi keseluruhan (0..1+)
    this.maxAreaRatio = 0; // area paling penuh
    this.overloadTimer = 0; // berapa lama overload berturut (untuk bottleneck)
    this.overloadSeconds = 0; // total akumulasi (KPI efficiency / mission)
    this.penaltyTimer = 0;
    this.fsm = createWarehouseFSM(this, game);
  }

  get state() { return this.fsm.state; }
  get stateLabel() { return WH_STATE_LABEL[this.state]; }

  capacityOf(area) {
    return Math.round(CONFIG.AREA_CAPACITY[area] * this.game.upgrades.capacityMult);
  }

  get totalCapacity() {
    return AREAS.reduce((s, a) => s + this.capacityOf(a), 0);
  }

  isOverloaded() {
    return this.ratio >= CONFIG.WAREHOUSE.OVERLOAD_RATIO || this.maxAreaRatio > 1;
  }

  /** 1 = normal, >1 = melambat saat overload/bottleneck. */
  get slowFactor() {
    return this.fsm.isAny('overload', 'bottleneck') ? CONFIG.WAREHOUSE.OVERLOAD_SLOW_FACTOR : 1;
  }

  recount() {
    for (const a of AREAS) this.counts[a] = 0;
    for (const p of this.game.packages) {
      const a = p.area;
      if (a && this.counts[a] !== undefined) this.counts[a] += 1;
    }
    let total = 0, totalCap = 0, maxR = 0;
    for (const a of AREAS) {
      const cap = this.capacityOf(a);
      total += this.counts[a];
      totalCap += cap;
      maxR = Math.max(maxR, cap ? this.counts[a] / cap : 0);
    }
    this.ratio = totalCap ? total / totalCap : 0;
    this.maxAreaRatio = maxR;
  }

  update(dt) {
    this.recount();
    this.fsm.update(dt);
  }
}
