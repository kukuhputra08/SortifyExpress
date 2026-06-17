// ============================================================================
// UpgradeScene.js — Toko Upgrade antar-level (GDD 6.5).
// Belanja upgrade dengan coin, lalu lanjut ke level berikutnya.
// ============================================================================

import { iconEl } from '../ui/icons.js';
import { UPGRADE_LIST } from '../data/upgrades.js';

export class UpgradeScene {
  constructor(game, root) { this.game = game; this.root = root; }

  mount() {
    this.root.innerHTML = this.render();
    this.root.onclick = (e) => this.onClick(e);
  }
  unmount() { this.root.onclick = null; }
  refresh() { this.root.innerHTML = this.render(); }

  render() {
    const g = this.game;
    const cards = UPGRADE_LIST.map((u) => {
      const owned = g.upgrades.owned.includes(u.id);
      const afford = g.coins >= u.cost;
      const cls = owned ? 'owned' : afford ? '' : 'cant';
      return `
        <div class="up-card ${cls}">
          <div class="up-ic">${iconEl(u.icon)}</div>
          <div class="up-body">
            <h3>${u.name}</h3>
            <p>${u.desc}</p>
          </div>
          <div class="up-foot">
            ${owned
              ? '<span class="up-owned">✓ Dimiliki</span>'
              : `<button class="btn btn-sm ${afford ? 'btn-accent' : 'disabled'}" data-action="buy" data-id="${u.id}" ${afford ? '' : 'disabled'}>${iconEl('coin')} ${u.cost}</button>`}
          </div>
        </div>`;
    }).join('');

    return `
    <div class="scene upgrade-scene">
      <header class="scene-head">
        <h2>${iconEl('coin')} Upgrade Operasional</h2>
        <span class="up-coins">${iconEl('coin')} <b>${g.coins}</b> coin</span>
      </header>
      <p class="up-intro">Belanja upgrade untuk mempermudah level berikutnya. Upgrade bersifat permanen sepanjang sesi.</p>
      <div class="up-grid">${cards}</div>
      <div class="up-cta">
        <button class="btn btn-primary btn-lg" data-action="next">Lanjut ke Day ${Math.min(g.currentLevelId + 1, 7)} ▸</button>
        <button class="btn btn-ghost" data-action="menu">Kembali ke Menu</button>
      </div>
    </div>`;
  }

  onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const g = this.game;
    const a = el.dataset.action;
    g.audio.play('click');
    if (a === 'buy') {
      if (g.buyUpgrade(el.dataset.id)) { g.audio.play('success'); this.refresh(); }
    } else if (a === 'next') {
      g.nextLevel();
    } else if (a === 'menu') {
      g.quitToMenu();
    }
  }
}
