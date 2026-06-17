// ============================================================================
// MissionSystem.js — Misi level (GDD 6.3). Evaluasi live untuk HUD & akhir.
// ============================================================================

import { getMissions } from '../data/missions.js';

export class MissionSystem {
  constructor(game) {
    this.game = game;
    this.missions = [];
  }

  load(ids) {
    this.missions = getMissions(ids);
  }

  /** Status tiap misi terhadap snapshot KPI saat ini. */
  evaluate(snapshot) {
    const s = snapshot || this.game.kpiSnapshot();
    return this.missions.map((m) => ({
      id: m.id,
      type: m.type,
      label: m.label(this.game),
      progress: m.progress(s, this.game),
      done: m.check(s, this.game),
    }));
  }

  completedCount(snapshot) {
    return this.evaluate(snapshot).filter((m) => m.done).length;
  }
}
