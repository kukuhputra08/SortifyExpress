// ============================================================================
// SceneManager.js — Mengelola pergantian Scene (didorong oleh GameFSM).
// ============================================================================

import { MainMenuScene } from './MainMenuScene.js';
import { TutorialScene } from './TutorialScene.js';
import { GameScene } from './GameScene.js';
import { ResultScene } from './ResultScene.js';
import { UpgradeScene } from './UpgradeScene.js';

export class SceneManager {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.scenes = {
      MainMenu: new MainMenuScene(game, root),
      Tutorial: new TutorialScene(game, root),
      Game: new GameScene(game, root),
      Result: new ResultScene(game, root),
      Upgrade: new UpgradeScene(game, root),
    };
    this.current = null;
    this.currentName = null;
  }

  show(name) {
    const next = this.scenes[name];
    if (!next) return;
    if (this.current === next) { next.refresh?.(); return; }
    this.current?.unmount?.();
    this.current = next;
    this.currentName = name;
    this.root.dataset.scene = name;
    next.mount();
  }

  update(dt) { this.current?.update?.(dt); }
}
