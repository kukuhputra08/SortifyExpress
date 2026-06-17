// ============================================================================
// ResultScene.js — Operational Report / Result Screen (GDD 13 & Lampiran A).
// Menampilkan KPI, grade, misi, score, coin, dan opsi lanjut/ulang/menu.
// ============================================================================

import { iconEl } from '../ui/icons.js';

export class ResultScene {
  constructor(game, root) { this.game = game; this.root = root; }

  mount() {
    this.root.innerHTML = this.render();
    this.root.onclick = (e) => this.onClick(e);
    this.game.audio.play(this.game.lastResult?.win ? 'deliver' : 'error');
  }
  unmount() { this.root.onclick = null; }
  refresh() { this.root.innerHTML = this.render(); }

  render() {
    const r = this.game.lastResult;
    if (!r) return '<div class="scene"></div>';
    const s = r.snapshot;
    const win = r.win;

    const row = (k, v, cls = '') => `<div class="rep-row"><span>${k}</span><b class="${cls}">${v}</b></div>`;
    const gradeColor = { A: '#22c55e', B: '#4f8cff', C: '#ffb020', D: '#ff5d73' }[s.grade] || '#888';

    const missions = r.missions.map((m) =>
      `<li class="${m.done ? 'ok' : 'fail'}">${m.done ? '✓' : '✗'} <span>${m.label}</span> <em>${m.progress}</em></li>`
    ).join('');

    const insights = (r.insights || []).map((i) => `
      <li class="insight-${i.kind}">
        <b>${i.title}</b>
        <span>${i.body}</span>
      </li>`).join('');

    const fail = (need, val, ok) => ok ? '' : `<span class="rep-flag">butuh ${need}</span>`;
    const ok = {
      del: s.delivered >= r.level.targetDelivered,
      ont: s.ontimeRate >= r.need.ontime,
      acc: s.sortingAccuracy >= r.need.accuracy,
      sat: s.satisfaction >= r.need.satisfaction,
    };

    const cta = win ? `
      ${r.isLastLevel
        ? `<button class="btn btn-primary btn-lg" data-action="menu">${iconEl('star')} Tamat — Kembali ke Menu</button>`
        : `<button class="btn btn-primary btn-lg" data-action="upgrade">${iconEl('coin')} Upgrade & Lanjut ▸</button>`}
      <button class="btn btn-ghost" data-action="replay">Ulangi</button>
      <button class="btn btn-ghost" data-action="menu">Menu</button>
    ` : `
      <button class="btn btn-primary btn-lg" data-action="replay">${iconEl('play')} Coba Lagi</button>
      <button class="btn btn-ghost" data-action="menu">Menu</button>
    `;

    return `
    <div class="scene result-scene ${win ? 'win' : 'lose'}">
      <div class="result-card">
        <div class="result-banner ${win ? 'win' : 'lose'}">
          <h1>${win ? '✅ Level Complete!' : '❌ Game Over'}</h1>
          <p>${r.level.subtitle} — ${r.level.name}</p>
          ${r.reason ? `<p class="result-reason">${r.reason}</p>` : ''}
        </div>

        <div class="result-grid">
          <div class="grade-box" style="--g:${gradeColor}">
            <span class="grade-k">GRADE</span>
            <span class="grade-v">${s.grade}</span>
            <span class="grade-score">${iconEl('star')} ${r.score.toLocaleString('id-ID')} pts</span>
            <span class="grade-coin">${iconEl('coin')} +${r.coins} coin</span>
            <span class="grade-combo">Max combo: ${r.maxCombo}x</span>
          </div>

          <div class="report">
            <h3>Operational Report</h3>
            ${row('Total Packages', s.created)}
            ${row('Delivered On-Time', `${s.onTime} ${fail('', '', ok.ont)}`)}
            ${row('Late Packages', s.late, s.late ? 'warn' : '')}
            ${row('Wrong Sorting', s.wrongSorts, s.wrongSorts ? 'warn' : '')}
            ${row('Damaged', s.damaged, s.damaged ? 'bad' : '')}
            ${row('Failed', s.failed, s.failed ? 'bad' : '')}
            <hr/>
            ${row('Sorting Accuracy', `${Math.round(s.sortingAccuracy)}% ${fail(r.need.accuracy + '%', s.sortingAccuracy, ok.acc)}`)}
            ${row('On-Time Delivery', `${Math.round(s.ontimeRate)}% ${fail(r.need.ontime + '%', s.ontimeRate, ok.ont)}`)}
            ${row('Damage Rate', `${Math.round(s.damageRate)}%`)}
            ${row('Warehouse Efficiency', `${Math.round(s.efficiency)}%`)}
            ${row('Customer Satisfaction', `${Math.round(s.satisfaction)}% ${fail(r.need.satisfaction + '%', s.satisfaction, ok.sat)}`)}
            ${row('Target Delivered', `${s.delivered}/${r.level.targetDelivered} ${fail('', '', ok.del)}`)}
          </div>

          <div class="missions-box">
            <h3>Misi</h3>
            <ul class="mission-list">${missions}</ul>
          </div>

          <div class="insights-box">
            <h3>Insight Operasional</h3>
            <ul class="insight-list">${insights}</ul>
          </div>
        </div>

        <div class="result-cta">${cta}</div>
      </div>
    </div>`;
  }

  onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const g = this.game;
    g.audio.play('click');
    switch (el.dataset.action) {
      case 'upgrade': g.goToUpgrade(); break;
      case 'replay': g.replayLevel(); break;
      case 'menu': g.quitToMenu(); break;
    }
  }
}
