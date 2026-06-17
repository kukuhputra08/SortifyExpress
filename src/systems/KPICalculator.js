// ============================================================================
// KPICalculator.js — Menghitung KPI operasional (GDD 6.6 & 13.1)
// On-Time Delivery, Sorting Accuracy, Damage Rate, Warehouse Efficiency,
// Customer Satisfaction, dan Grade akhir.
// ============================================================================

import { EV } from '../core/EventBus.js';
import { CONFIG } from '../data/config.js';
import { clamp, pct } from '../core/Utils.js';

export class KPICalculator {
  constructor(game) {
    this.game = game;
    this.bus = game.bus;
    this.reset();
    this._wire();
  }

  reset() {
    this.c = {
      created: 0,
      totalSorts: 0,
      correctSorts: 0,
      wrongSorts: 0,
      processed: 0, // lolos QC (ready_to_load atau damaged)
      onTime: 0,
      late: 0,
      damaged: 0,
      failed: 0,
      expressLate: 0,
      vehicleMisfit: 0,
    };
  }

  _wire() {
    const c = this.c;
    this.bus.on(EV.PACKAGE_CREATED, () => { c.created += 1; });
    this.bus.on(EV.PACKAGE_SORTED, () => { c.totalSorts += 1; c.correctSorts += 1; });
    this.bus.on(EV.WRONG_SORT, () => { c.totalSorts += 1; c.wrongSorts += 1; });
    this.bus.on(EV.PACKAGE_READY_TO_LOAD, () => { c.processed += 1; });
    this.bus.on(EV.PACKAGE_DAMAGED, () => { c.processed += 1; c.damaged += 1; });
    this.bus.on(EV.DELIVERY_SUCCESS, () => { c.onTime += 1; });
    this.bus.on(EV.DELIVERY_LATE, ({ pkg }) => { c.late += 1; if (pkg.isExpress()) c.expressLate += 1; });
    this.bus.on(EV.DELIVERY_FAILED, () => { c.failed += 1; });
    this.bus.on(EV.VEHICLE_MISFIT, () => { c.vehicleMisfit += 1; });
  }

  /** Snapshot KPI lengkap untuk HUD, misi, & result screen. */
  snapshot() {
    const c = this.c;
    const concluded = c.onTime + c.late + c.damaged + c.failed;
    const delivered = c.onTime + c.late; // paket yang sampai (on-time + telat)

    const sortingAccuracy = c.totalSorts ? pct(c.correctSorts, c.totalSorts) : 100;
    const ontimeRate = concluded ? pct(c.onTime, concluded) : (c.onTime ? 100 : 0);
    const damageRate = concluded ? pct(c.damaged, concluded) : 0;

    // efisiensi gudang: 100 dikurangi penalti lama overload
    const efficiency = clamp(100 - this.game.warehouse.overloadSeconds * 3, 0, 100);

    const satisfaction = this.game.rules.satisfaction;
    const grade = this.computeGrade({ ontimeRate, sortingAccuracy, satisfaction, damageRate });

    return {
      ...c,
      delivered,
      concluded,
      sortingAccuracy,
      ontimeRate,
      damageRate,
      efficiency,
      satisfaction,
      overloadSeconds: this.game.warehouse.overloadSeconds,
      grade,
    };
  }

  computeGrade({ ontimeRate, sortingAccuracy, satisfaction, damageRate }) {
    const G = CONFIG.GRADE;
    const meets = (t) =>
      ontimeRate >= t.ontime && sortingAccuracy >= t.accuracy &&
      satisfaction >= t.satisfaction && damageRate <= t.damageMax;
    if (meets(G.A)) return 'A';
    if (meets(G.B)) return 'B';
    if (meets(G.C)) return 'C';
    return 'D';
  }
}
