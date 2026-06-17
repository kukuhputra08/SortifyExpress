// ============================================================================
// CharacterFSM.js — FSM operator/player.
// Operator digerakkan langsung oleh player. FSM ini memisahkan kondisi
// idle/walking agar animasi, UI, dan edukasi tetap berbasis state.
// ============================================================================

import { FSM } from '../core/FSM.js';

export const CHARACTER_STATE_LABEL = {
  idle: 'Siap',
  walking: 'Berjalan',
};

export function createCharacterFSM(operator) {
  const states = {
    idle: {
      transitions: ['walking'],
      onUpdate: (c, fsm) => {
        if (operator.hasMoveInput()) fsm.transition('walking');
      },
    },

    walking: {
      transitions: ['idle'],
      onUpdate: (c, fsm, dt) => {
        operator.advanceMovement(dt);
        if (!operator.hasMoveInput()) fsm.transition('idle');
      },
    },
  };

  return new FSM({
    name: 'Character',
    states,
    initial: 'idle',
    context: operator,
  });
}
