// ============================================================================
// Staff.js — Objek Staff. Stamina + StaffFSM. Memodulasi kecepatan proses.
// MVP: staff dikelola otomatis, kondisinya tetap ditampilkan & berdampak.
// ============================================================================

import { createStaffFSM, STAFF_STATE_LABEL } from '../fsm/StaffFSM.js';
import { CONFIG } from '../data/config.js';

export class Staff {
  constructor(index, game) {
    this.game = game;
    this.id = `staff_${index + 1}`;
    this.name = `Staff ${index + 1}`;
    this.stamina = CONFIG.STAFF.STAMINA_MAX;
    this.fsm = createStaffFSM(this, game);
  }

  get state() { return this.fsm.state; }
  get stateLabel() { return STAFF_STATE_LABEL[this.state]; }
  isTired() { return this.fsm.isAny('tired', 'resting'); }

  /** Ada paket yang sedang diproses di gudang? (memicu staff bekerja) */
  hasWork() {
    return this.game.packages.some((p) =>
      ['waiting_scan', 'sorting', 'packing', 'quality_check'].includes(p.state) &&
      (p.state !== 'waiting_scan' || p.scanInitiated));
  }

  update(dt) { this.fsm.update(dt); }
}
