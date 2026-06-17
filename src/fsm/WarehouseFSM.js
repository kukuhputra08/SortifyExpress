// ============================================================================
// WarehouseFSM.js — FSM Gudang (GDD 7.2)
// Normal → Busy → Overload → Bottleneck → Recovery → Normal
// Transisi berbasis rasio isi area & lama overload.
// ============================================================================

import { FSM } from '../core/FSM.js';
import { EV } from '../core/EventBus.js';
import { CONFIG } from '../data/config.js';

export const WH_STATE_LABEL = {
  normal: 'Normal',
  busy: 'Busy',
  overload: 'Overload',
  bottleneck: 'Bottleneck',
  recovery: 'Recovery',
};

export function createWarehouseFSM(wh, game) {
  const bus = game.bus;
  const C = CONFIG.WAREHOUSE;

  const states = {
    normal: {
      transitions: ['busy', 'overload'],
      onUpdate: (c, fsm) => {
        if (wh.isOverloaded()) fsm.transition('overload');
        else if (wh.ratio >= C.BUSY_RATIO) fsm.transition('busy');
      },
    },
    busy: {
      transitions: ['normal', 'overload'],
      onUpdate: (c, fsm) => {
        if (wh.isOverloaded()) fsm.transition('overload');
        else if (wh.ratio < C.BUSY_RATIO - 0.05) fsm.transition('normal');
      },
    },
    overload: {
      transitions: ['bottleneck', 'recovery'],
      onEnter: () => { wh.overloadTimer = 0; bus.emit(EV.AREA_OVERLOAD, { wh }); },
      onUpdate: (c, fsm, dt) => {
        wh.overloadTimer += dt;
        wh.overloadSeconds += dt; // akumulasi total (KPI)
        if (wh.overloadTimer >= C.BOTTLENECK_AFTER) fsm.transition('bottleneck');
        else if (wh.ratio < C.RECOVERY_RATIO) fsm.transition('recovery');
      },
    },
    bottleneck: {
      transitions: ['recovery', 'overload'],
      onEnter: () => { wh.penaltyTimer = 0; bus.emit(EV.AREA_BOTTLENECK, { wh }); },
      onUpdate: (c, fsm, dt) => {
        wh.overloadSeconds += dt;
        wh.penaltyTimer += dt;
        if (wh.penaltyTimer >= C.BOTTLENECK_PENALTY_EVERY) {
          wh.penaltyTimer = 0;
          bus.emit(EV.AREA_BOTTLENECK, { wh, penalty: true });
        }
        if (wh.ratio < C.RECOVERY_RATIO) fsm.transition('recovery');
      },
    },
    recovery: {
      transitions: ['normal', 'overload'],
      onEnter: () => { bus.emit(EV.AREA_RECOVERY, { wh }); },
      onUpdate: (c, fsm) => {
        if (wh.isOverloaded()) fsm.transition('overload');
        else if (wh.ratio < C.BUSY_RATIO) fsm.transition('normal');
      },
    },
  };

  return new FSM({ name: 'Warehouse', states, initial: 'normal', context: wh });
}
