// ============================================================================
// VehicleFSM.js — FSM Kendaraan (GDD 7.3)
// Idle → Waiting Load → Loading → Departing → Delivering → (Delayed) →
// Arrived → Returning → Idle ; Maintenance bila kendaraan rusak.
// Note: Loading state menunggu pemain untuk trigger dispatch (bukan auto-saat penuh).
// ============================================================================

import { FSM } from '../core/FSM.js';
import { EV } from '../core/EventBus.js';
import { CONFIG } from '../data/config.js';
import { chance } from '../core/Utils.js';

export const VEH_STATE_LABEL = {
  idle: 'Idle',
  waiting_load: 'Waiting Load',
  loading: 'Loading',
  departing: 'Departing',
  delivering: 'Delivering',
  delayed: 'Delayed',
  arrived: 'Arrived',
  returning: 'Returning',
  maintenance: 'Maintenance',
};

export function createVehicleFSM(veh, game) {
  const bus = game.bus;

  const states = {
    idle: {
      transitions: ['waiting_load', 'loading', 'maintenance'],
      onEnter: () => { veh.resetTrip(); },
    },

    waiting_load: {
      transitions: ['loading', 'idle'],
      // dipilih player, menunggu paket pertama
    },

    loading: {
      transitions: ['departing', 'idle'],
      // menerima paket sampai player menekan Dispatch (tanpa auto-dispatch)
      onUpdate: (c, fsm) => {
        // hanya tunggu player untuk trigger dispatch via button/action
        if (veh.requestDispatch && veh.packages.length > 0) fsm.transition('departing');
      },
    },

    departing: {
      transitions: ['delivering'],
      onEnter: () => {
        veh.computeTripTime();
        veh.packages.forEach((p) => p.onDeparted());
        bus.emit(EV.VEHICLE_DEPARTED, { veh });
      },
      onUpdate: (c, fsm) => {
        if (fsm.timeInState >= 0.4) fsm.transition('delivering');
      },
    },

    delivering: {
      transitions: ['delayed', 'arrived'],
      onUpdate: (c, fsm, dt) => {
        if (veh.manualDispatch) {
          veh.tripTimer = Math.max(0, veh.tripTime * (1 - veh.manualProgress));
          return;
        }
        veh.tripTimer -= dt;
        // peluang delay sekali di tengah perjalanan (rute berisiko / event)
        if (!veh.delayRolled && veh.tripTimer < veh.tripTime * 0.5) {
          veh.delayRolled = true;
          if (chance(veh.routeDelayRisk())) { fsm.transition('delayed'); return; }
        }
        if (veh.tripTimer <= 0) fsm.transition('arrived');
      },
    },

    delayed: {
      transitions: ['delivering'],
      onEnter: () => { veh.delayTimer = 4 + Math.random() * 4; },
      onUpdate: (c, fsm, dt) => {
        veh.delayTimer -= dt;
        if (veh.delayTimer <= 0) fsm.transition('delivering');
      },
    },

    arrived: {
      transitions: ['returning'],
      onEnter: () => {
        veh.packages.forEach((p) => p.finishDelivery());
        bus.emit(EV.VEHICLE_ARRIVED, { veh });
      },
      onUpdate: (c, fsm) => {
        if (fsm.timeInState >= 0.4) fsm.transition('returning');
      },
    },

    returning: {
      transitions: ['idle', 'maintenance'],
      onEnter: () => { veh.returnTimer = veh.tripTime * 0.5; },
      onUpdate: (c, fsm, dt) => {
        veh.returnTimer -= dt;
        if (veh.returnTimer <= 0) {
          bus.emit(EV.VEHICLE_RETURNED, { veh });
          fsm.transition('idle');
        }
      },
    },

    maintenance: {
      transitions: ['idle'],
      onEnter: () => { bus.emit(EV.VEHICLE_BROKEN, { veh }); },
      onUpdate: (c, fsm, dt) => {
        veh.maintTimer -= dt;
        if (veh.maintTimer <= 0) fsm.transition('idle');
      },
    },
  };

  return new FSM({ name: 'Vehicle', states, initial: 'idle', context: veh });
}
