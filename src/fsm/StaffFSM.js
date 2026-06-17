// ============================================================================
// StaffFSM.js — FSM Staff (GDD 7.4)
// Idle → Working → Tired → Resting → Ready → Working
// Stamina menurun saat bekerja; lelah → proses melambat; istirahat memulihkan.
// ============================================================================

import { FSM } from '../core/FSM.js';
import { EV } from '../core/EventBus.js';
import { CONFIG } from '../data/config.js';

export const STAFF_STATE_LABEL = {
  idle: 'Idle',
  working: 'Working',
  tired: 'Tired',
  resting: 'Resting',
  ready: 'Ready',
};

export function createStaffFSM(staff, game) {
  const bus = game.bus;
  const C = CONFIG.STAFF;

  const states = {
    idle: {
      transitions: ['working'],
      onUpdate: (c, fsm) => {
        if (staff.hasWork()) fsm.transition('working');
      },
    },
    working: {
      transitions: ['tired', 'idle'],
      onUpdate: (c, fsm, dt) => {
        staff.stamina -= C.STAMINA_DRAIN * dt / game.upgrades.staffStamina;
        if (staff.stamina <= C.TIRED_AT) { staff.stamina = C.TIRED_AT; fsm.transition('tired'); }
        else if (!staff.hasWork()) fsm.transition('idle');
      },
    },
    tired: {
      transitions: ['resting'],
      onEnter: () => bus.emit(EV.STAFF_TIRED, { staff }),
      onUpdate: (c, fsm) => {
        // otomatis dipaksa istirahat (MVP)
        fsm.transition('resting');
      },
    },
    resting: {
      transitions: ['ready'],
      onUpdate: (c, fsm, dt) => {
        staff.stamina += C.STAMINA_REGEN * dt;
        if (staff.stamina >= C.READY_AT) { staff.stamina = CONFIG.STAFF.STAMINA_MAX; fsm.transition('ready'); }
      },
    },
    ready: {
      transitions: ['working', 'idle'],
      onEnter: () => bus.emit(EV.STAFF_READY, { staff }),
      onUpdate: (c, fsm) => {
        fsm.transition(staff.hasWork() ? 'working' : 'idle');
      },
    },
  };

  return new FSM({ name: 'Staff', states, initial: 'idle', context: staff });
}
