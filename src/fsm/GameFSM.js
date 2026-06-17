// ============================================================================
// GameFSM.js — FSM Alur Game (GDD 7.5)
// Main Menu → Tutorial → Playing → Paused → Level Complete → Upgrade →
// Next Level → Game Over
// Setiap state memetakan ke sebuah Scene; transisi memicu pergantian scene.
// ============================================================================

import { FSM } from '../core/FSM.js';

export const FLOW = {
  MAIN_MENU: 'main_menu',
  TUTORIAL: 'tutorial',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LEVEL_COMPLETE: 'level_complete',
  UPGRADE: 'upgrade',
  GAME_OVER: 'game_over',
};

export function createGameFSM(game) {
  // Tiap state memberi tahu Game scene mana yang aktif.
  const enter = (scene) => () => game.showScene(scene);

  const states = {
    main_menu: { transitions: ['tutorial', 'playing'], onEnter: enter('MainMenu') },
    tutorial: { transitions: ['playing', 'main_menu'], onEnter: enter('Tutorial') },
    playing: {
      transitions: ['paused', 'level_complete', 'game_over', 'main_menu'],
      onEnter: enter('Game'),
    },
    paused: { transitions: ['playing', 'main_menu'], onEnter: enter('Game') },
    level_complete: { transitions: ['upgrade', 'main_menu'], onEnter: enter('Result') },
    upgrade: { transitions: ['playing', 'main_menu'], onEnter: enter('Upgrade') },
    game_over: { transitions: ['main_menu', 'playing'], onEnter: enter('Result') },
  };

  return new FSM({ name: 'GameFlow', states, initial: 'main_menu', context: game });
}
