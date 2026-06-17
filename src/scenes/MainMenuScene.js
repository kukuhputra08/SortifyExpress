// ============================================================================
// MainMenuScene.js — Main Menu (GDD 7.5). Judul, mulai, pilih level, tutorial.
// ============================================================================

import { LOGO_SVG, iconEl } from '../ui/icons.js';
import { LEVELS } from '../data/levels.js';

export class MainMenuScene {
  constructor(game, root) { this.game = game; this.root = root; }

  mount() {
    this.root.innerHTML = this.render();
    this.root.onclick = (e) => this.onClick(e);
    this.game.audio.resume();
  }

  unmount() { this.root.onclick = null; }

  render() {
    const g = this.game;
    const levelCards = LEVELS.map((l) => {
      const locked = l.id > g.unlocked;
      return `<button class="level-card ${locked ? 'locked' : ''}" data-action="${locked ? '' : 'play'}" data-level="${l.id}" ${locked ? 'disabled' : ''}>
        <span class="lc-day">${l.subtitle}</span>
        <span class="lc-name">${l.name}</span>
        <span class="lc-feat">${l.feature}</span>
        <span class="lc-meta">🎯 ${l.targetDelivered} paket · ⏱ ${Math.round(l.duration / 60)}m</span>
        ${locked ? '<span class="lc-lock">🔒 Terkunci</span>' : '<span class="lc-go">Main ▸</span>'}
      </button>`;
    }).join('');

    return `
    <div class="scene menu-scene">
      <div class="menu-hero">
        <div class="logo">${LOGO_SVG}</div>
        <div class="menu-title">
          <h1>LogiRush</h1>
          <p class="subtitle">Warehouse Expedition Simulator</p>
          <p class="tagline">Scan · Sortir · Packing · Loading · Dispatch — kelola gudang ekspedisi, kejar deadline, raih KPI terbaik!</p>
        </div>
      </div>

      <div class="menu-actions">
        <button class="btn btn-primary btn-lg" data-action="play" data-level="${Math.min(g.unlocked, LEVELS.length)}">
          ${iconEl('play')} Lanjut Main (Day ${Math.min(g.unlocked, LEVELS.length)})
        </button>
        <button class="btn btn-ghost btn-lg" data-action="tutorial">${iconEl('book')} Tutorial</button>
      </div>

      <div class="menu-stats">
        <span>${iconEl('coin')} Coin: <b>${g.coins}</b></span>
        <span>${iconEl('star')} Total Score: <b>${g.totalScore}</b></span>
        <span>${iconEl('gauge')} Level terbuka: <b>${g.unlocked}/${LEVELS.length}</b></span>
      </div>

      <h2 class="section-title">Pilih Level</h2>
      <div class="level-grid">${levelCards}</div>

      <footer class="menu-footer">
        <p>Multi-FSM: Paket · Gudang · Kendaraan · Staff · Game Flow &nbsp;|&nbsp; Final Project — Game Edukasi & Simulasi</p>
      </footer>
    </div>`;
  }

  onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    this.game.audio.resume();
    this.game.audio.play('click');
    if (action === 'play') {
      const lvl = parseInt(el.dataset.level, 10) || 1;
      this.game.startLevel(lvl);
    } else if (action === 'tutorial') {
      this.game.gameFSM.transition('tutorial');
    }
  }
}
