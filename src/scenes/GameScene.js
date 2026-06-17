// ============================================================================
// GameScene.js — Gameplay utama (GDD 9.1). Render HUD, papan area gudang,
// kendaraan, panel paket terpilih + tombol aksi kontekstual, toast & overlay.
// Re-render panel dinamis pada RENDER_HZ; input via event delegation.
// ============================================================================

import { icon, iconEl } from '../ui/icons.js';
import { StageView } from '../ui/StageView.js';
import { CONFIG } from '../data/config.js';
import { ROUTES } from '../data/routes.js';
import { formatTime, clamp } from '../core/Utils.js';
import { STATIONS, STATION_ORDER, stationForPackage, stationLabel } from '../objects/PlayerCharacter.js';

const AREA_DEFS = [
  { key: 'inbound', label: 'Inbound', icon: 'inbound', states: ['created', 'waiting_scan', 'scanned'] },
  { key: 'sorting', label: 'Sorting', icon: 'sorting', states: ['sorting', 'sorted'] },
  { key: 'packing', label: 'Packing', icon: 'packing', states: ['packing'] },
  { key: 'qc', label: 'Quality Check', icon: 'qc', states: ['quality_check'] },
  { key: 'loading', label: 'Loading', icon: 'loading', states: ['ready_to_load'] },
];

export class GameScene {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this._acc = 0;
    this._interval = 1 / CONFIG.RENDER_HZ;
    this.keys = new Set();
    this.joy = { x: 0, y: 0 };
    this._joyPointer = null;
    this._touchAbort = null;
    this.scanDraft = '';
  }

  mount() {
    this.root.innerHTML = `
      <div class="scene game-scene">
        <div id="hud"></div>
        <div class="sim-shell">
          <main class="warehouse-screen">
            <div id="event-banner"></div>
            <div class="stage-frame">
              <div id="stage"></div>
            </div>
            <section class="fleet-panel">
              <header class="fleet-head">
                <div>
                  <span class="command-eyebrow">Fleet Control</span>
                  <h2>Kendaraan Ekspedisi</h2>
                </div>
                <span class="dock-hint">R dispatch kendaraan siap</span>
              </header>
              <div id="board" class="fleet-board"></div>
            </section>
          </main>

          <aside class="command-terminal">
            <header class="command-head">
              <div>
                <span class="command-eyebrow">Command Terminal</span>
                <h2>Operasi Paket</h2>
              </div>
              <span class="terminal-live">LIVE</span>
            </header>
            <div id="coach"></div>
            <div id="panel" class="panel"></div>
          </aside>
        </div>
        <div id="toasts" class="toasts"></div>
        <div class="touch-controls">
          <div class="stick-zone" aria-label="Analog gerak">
            <span class="stick-knob"></span>
          </div>
          <div class="touch-actions">
            <button class="touch-btn" data-action="context-action">Aksi</button>
            <button class="touch-btn" data-action="next-package">Paket</button>
            <button class="touch-btn" data-action="dispatch-ready">Dispatch</button>
          </div>
        </div>
        <div id="overlay" class="overlay hidden"></div>
      </div>`;
    this.root.onclick = (e) => this.onClick(e);
    this.root.oninput = (e) => this.onInput(e);
    this._keyDown = (e) => this.onKeyDown(e);
    this._keyUp = (e) => this.onKeyUp(e);
    document.addEventListener('keydown', this._keyDown);
    document.addEventListener('keyup', this._keyUp);

    // lapisan simulasi visual (karakter + kendaraan), dibangun sekali
    this.stage = new StageView(this.game);
    this.stage.mount(this.$('stage'));
    this.setupTouchControls();

    this.render();
  }

  unmount() {
    this.root.onclick = null;
    this.root.oninput = null;
    document.removeEventListener('keydown', this._keyDown);
    document.removeEventListener('keyup', this._keyUp);
    this._touchAbort?.abort();
    this.game.operator?.clearMoveInput();
    this.stage?.destroy();
    this.stage = null;
  }

  refresh() { this.render(); }

  update(dt) {
    // stage dianimasikan tiap frame (mulus); panel/board di-throttle ke RENDER_HZ
    this.applyMovementInput();
    if (this.stage) {
      this.stage.setPaused(this.game.gameFSM.is('paused'));
      this.stage.update();
    }
    this._acc += dt;
    if (this._acc >= this._interval) { this._acc = 0; this.render(); }
  }

  // ----------------------------------------------------------------- render
  render() {
    const g = this.game;
    if (!g.warehouse) return;
    this.$('hud').innerHTML = this.renderHUD();
    this.$('coach').innerHTML = this.renderCoach();
    this.$('board').innerHTML = this.renderBoard();
    const typingScan = typeof document !== 'undefined' && document.activeElement?.classList.contains('scan-input');
    if (!typingScan) this.$('panel').innerHTML = this.renderPanel();
    this.$('event-banner').innerHTML = this.renderEventBanner();
    this.$('toasts').innerHTML = this.renderToasts();
    this.updateTouchActionLabels();
    this.renderOverlay();
  }

  $(id) { return this.root.querySelector('#' + id); }

  escAttr(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  renderHUD() {
    const g = this.game;
    const snap = g.kpiSnapshot();
    const wh = g.warehouse;
    const sat = snap.satisfaction;
    const satClass = sat < 35 ? 'bad' : sat < 60 ? 'warn' : 'good';
    const whRatio = clamp(wh.ratio, 0, 1.2);
    const timeUrgent = g.timeLeft <= 20 ? 'urgent' : '';
    const mult = g.score.multiplier;

    const missions = g.missions.evaluate(snap).map((m) =>
      `<span class="mchip ${m.done ? 'done' : ''}" title="${m.label}">${m.done ? '✓' : '•'} ${m.type}: ${m.progress}</span>`
    ).join('');

    const floaters = g.score.floaters
      .filter((f) => performance.now() - f.t < 1100)
      .slice(-3)
      .map((f) => `<span class="floater ${f.amount >= 0 ? 'pos' : 'neg'}">${f.amount >= 0 ? '+' : ''}${f.amount} <i>${f.label}</i></span>`)
      .join('');

    return `
      <header class="hud">
        <div class="hud-left">
          <div class="hud-level">
            <span class="hud-day">${g.level.subtitle}</span>
            <span class="hud-lname">${g.level.name}</span>
          </div>
          <div class="hud-timer ${timeUrgent}">${iconEl('clock')} ${formatTime(g.timeLeft)}</div>
        </div>

        <div class="hud-center">
          <div class="stat score">
            <span class="stat-k">Score</span>
            <span class="stat-v">${g.score.score.toLocaleString('id-ID')}</span>
            <span class="combo ${g.score.superMode ? 'super' : ''}">${mult > 1 ? `Combo x${mult}` : ''} ${g.score.combo > 0 ? `(${g.score.combo})` : ''}</span>
          </div>
          <div class="floaters">${floaters}</div>
        </div>

        <div class="hud-right">
          <div class="gauge-block">
            <span class="gauge-k">${iconEl('star')} Satisfaction</span>
            <div class="bar ${satClass}"><i style="width:${sat}%"></i><b>${Math.round(sat)}%</b></div>
          </div>
          <div class="gauge-block">
            <span class="gauge-k">${iconEl('gauge')} Gudang: <em class="wh-${wh.state}">${wh.stateLabel}</em></span>
            <div class="bar wh ${wh.isOverloaded() ? 'bad' : whRatio > 0.6 ? 'warn' : 'good'}"><i style="width:${Math.min(100, whRatio * 100)}%"></i></div>
          </div>
          <div class="hud-controls">
            <button class="iconbtn" data-action="pause" title="Pause (Esc)">${iconEl(g.gameFSM.is('paused') ? 'play' : 'pause')}</button>
            <button class="iconbtn" data-action="mute" title="Mute">${g.audio.muted ? '🔇' : '🔊'}</button>
          </div>
        </div>
      </header>
      <div class="mission-bar">
        <span class="mb-target">🎯 Terkirim ${snap.delivered}/${g.level.targetDelivered}</span>
        ${missions}
      </div>`;
  }

  renderCoach() {
    const g = this.game;
    const op = g.operator;
    const p = g.getSelected();
    const need = stationForPackage(p);
    const ready = !need || op?.at(need);

    const selected = p
      ? `<b>${p.code}</b><span>${p.typeData.name} · ${p.stateLabel}</span>`
      : `<b>Tidak ada paket aktif</b><span>Klik paket di map atau tekan Q</span>`;

    let next = 'Ambil paket dari lantai gudang untuk mulai bekerja.';
    if (p && need && !ready) next = `Objective: dekati ${stationLabel(need)}.`;
    else if (p && need && ready) next = `Siap di ${stationLabel(need)}. Jalankan aksi.`;
    else if (p && ['waiting_scan', 'sorting', 'packing', 'quality_check'].includes(p.state)) next = 'Proses sedang berjalan, pantau progress dan deadline.';
    else if (p) next = 'Paket menunggu langkah berikutnya.';

    const primary = this.renderPrimaryAction(p, need, ready);
    const quick = this.renderQuickActions(p, ready);
    const objectiveClass = p && need ? (ready ? 'ready' : 'move') : 'idle';

    return `
      <div class="action-console ${objectiveClass}">
        <div class="console-top">
          <div>
            <span class="console-label">Operator</span>
            <b>${op?.stationLabel}</b>
          </div>
          <div>
            <span class="console-label">Active Package</span>
            ${selected}
          </div>
        </div>
        <div class="console-objective">
          <span>${next}</span>
          ${need ? `<button class="mini-marker" data-action="move-station" data-station="${need}">${iconEl('pin')} ${stationLabel(need)}</button>` : ''}
        </div>
        <div class="console-actions">
          ${primary}
          ${quick}
        </div>
      </div>`;
  }

  renderPrimaryAction(p, need, ready) {
    if (!p) {
      return `<button class="btn btn-sm btn-primary coach-primary" data-action="next-package">${iconEl('box')} Ambil Paket</button>`;
    }
    if (need && !ready) {
      return `<button class="btn btn-sm btn-accent coach-primary" data-action="go-task">${iconEl('pin')} Marker Tujuan</button>`;
    }
    if (p.state === 'waiting_scan' && !p.scanInitiated) {
      return `<button class="btn btn-sm btn-primary coach-primary" data-action="validate-scan">${iconEl('scan')} Validasi</button>`;
    }
    if (p.state === 'scanned') {
      return `<button class="btn btn-sm coach-primary" data-action="context-action">${iconEl('sorting')} Pilih Rute</button>`;
    }
    if (p.state === 'sorted') {
      return `<button class="btn btn-sm btn-primary coach-primary" data-action="pack">${iconEl('pack')} Packing</button>`;
    }
    if (p.state === 'ready_to_load') {
      return `<button class="btn btn-sm btn-primary coach-primary" data-action="context-action">${iconEl('load')} Load Cepat</button>`;
    }
    if (p.state === 'loaded') {
      return `<button class="btn btn-sm btn-accent coach-primary" data-action="context-action">${iconEl('dispatch')} Dispatch</button>`;
    }
    return `<button class="btn btn-sm coach-primary" disabled>Proses...</button>`;
  }

  renderQuickActions(p, ready) {
    if (!p || !ready) return '';
    if (p.state === 'scanned') {
      const routes = this.game.level.routes.map((rid, idx) => {
        const r = ROUTES[rid];
        return `<button class="quick-chip" data-action="sort" data-route="${rid}" title="${idx + 1}. ${r.name}">${idx + 1}. ${r.name}</button>`;
      }).join('');
      return `<div class="quick-row">${routes}</div>`;
    }
    if (p.state === 'ready_to_load') {
      const vehicles = this.game.vehicles
        .filter((v) => v.canAccept(p).ok)
        .slice(0, 3)
        .map((v) => `<button class="quick-chip" data-action="load" data-veh="${v.id}">${iconEl(v.icon)} ${v.name}</button>`)
        .join('');
      return vehicles ? `<div class="quick-row">${vehicles}</div>` : '';
    }
    return '';
  }

  contextLabel() {
    const p = this.game.getSelected();
    const need = stationForPackage(p);
    const ready = !need || this.game.operator?.at(need);
    if (!p) return 'Ambil Paket';
    if (need && !ready) return 'Marker';
    if (p.state === 'waiting_scan' && !p.scanInitiated) return 'Validasi';
    if (p.state === 'scanned') return 'Rute';
    if (p.state === 'sorted') return 'Packing';
    if (p.state === 'ready_to_load') return 'Load';
    if (p.state === 'loaded') return 'Dispatch';
    return 'Tunggu';
  }

  updateTouchActionLabels() {
    const action = this.root.querySelector('[data-action="context-action"]');
    const next = this.root.querySelector('[data-action="next-package"]');
    const dispatch = this.root.querySelector('[data-action="dispatch-ready"]');
    if (action) action.textContent = this.contextLabel();
    if (next) next.textContent = 'Paket';
    if (dispatch) dispatch.textContent = 'Kirim';
  }

  renderBoard() {
    const g = this.game;
    const vehicles = g.vehicles.map((v) => this.vcard(v)).join('');
    const snap = g.kpiSnapshot();
    return `
      <div class="fleet-summary">
        <span>${iconEl('box')} Aktif: <b>${g.packages.length}</b></span>
        <span>${iconEl('check')} Terkirim: <b>${snap.delivered}/${g.level.targetDelivered}</b></span>
        <span>${iconEl('warning')} Salah sortir: <b>${snap.wrongSorts}</b></span>
      </div>
      <div class="vehicles">${vehicles}</div>`;
  }

  chip(p) {
    const g = this.game;
    const sel = p.id === g.selectedId ? 'sel' : '';
    const tl = Math.max(0, p.timeLeft);
    const urgent = tl < 10 ? 'urgent' : tl < 20 ? 'warn' : '';
    const dest = p.scanned ? p.destName : '???';
    const prog = p.progress;
    const badge = p.isExpress() ? 'EX' : p.isFragile() ? 'FR' : p.isOversize() ? 'OS' : '';
    return `
      <button class="pchip ${sel} ${urgent}" data-action="select" data-id="${p.id}" style="--c:${p.color}">
        <span class="pc-ic">${icon(p.typeData.icon)}</span>
        <span class="pc-info">
          <span class="pc-code">${p.code}${badge ? ` <em class="pc-badge">${badge}</em>` : ''}</span>
          <span class="pc-dest">${iconEl('pin')}${dest}</span>
        </span>
        <span class="pc-time ${urgent}">${Math.ceil(tl)}s</span>
        ${prog > 0 ? `<span class="pc-prog"><i style="width:${prog * 100}%"></i></span>` : ''}
      </button>`;
  }

  vcard(v) {
    const st = v.state;
    let extra = '';
    if (st === 'loading') {
      extra = `<button class="btn btn-sm btn-accent" data-action="dispatch" data-veh="${v.id}" ${v.packages.length ? '' : 'disabled'}>Dispatch ▸</button>`;
    } else if (st === 'delivering' || st === 'delayed') {
      const prog = v.tripTime ? 1 - clamp(v.tripTimer / v.tripTime, 0, 1) : 0;
      extra = `<span class="vbar ${st === 'delayed' ? 'delay' : ''}"><i style="width:${prog * 100}%"></i></span>`;
    } else if (st === 'returning') {
      const tot = v.tripTime * 0.5 || 1;
      const prog = 1 - clamp(v.returnTimer / tot, 0, 1);
      extra = `<span class="vbar ret"><i style="width:${prog * 100}%"></i></span>`;
    } else if (st === 'maintenance') {
      extra = `<span class="vmaint">🔧 ${Math.ceil(v.maintTimer)}s</span>`;
    } else if (st === 'idle') {
      extra = `<span class="v-hint">siap</span>`;
    }
    return `
      <div class="vcard v-${st}">
        <span class="v-ic">${iconEl(v.icon)}</span>
        <div class="v-body">
          <span class="v-name">${v.name}</span>
          <span class="v-state v-st-${st}">${v.stateLabel}</span>
        </div>
        <span class="v-load">${v.load}/${v.capacity}</span>
        <div class="v-extra">${extra}</div>
      </div>`;
  }

  renderPanel() {
    const g = this.game;
    const p = g.getSelected();
    if (!p) {
      return `<div class="panel-empty">
        <div class="pe-ic">${iconEl('box')}</div>
        <h3>Pilih paket</h3>
        <p>Klik paket ber-barcode di map gudang atau tekan <b>Q</b> untuk mengambil paket paling urgent.</p>
      </div>`;
    }

    const dlPct = clamp((p.timeLeft / p.deadline) * 100, 0, 100);
    const dlClass = p.timeLeft < 10 ? 'bad' : p.timeLeft < 20 ? 'warn' : 'good';

    return `
      <div class="pd" style="--c:${p.color}">
        <header class="pd-head">
          <span class="pd-ic">${icon(p.typeData.icon)}</span>
          <div>
            <span class="pd-code">${p.code}</span>
            <span class="pd-type">${p.typeData.name}</span>
          </div>
          <span class="pd-state">${p.stateLabel}</span>
        </header>

        <div class="pd-barcode" aria-label="Barcode paket">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
          <b>${p.code}</b>
        </div>

        <div class="pd-rows">
          <div class="pd-row"><span>Tujuan</span><b>${p.scanned ? p.destName : '🔒 scan dulu'}</b></div>
          <div class="pd-row"><span>Jarak</span><b>${p.scanned ? p.routeData.distance : '—'}</b></div>
          <div class="pd-row"><span>Deadline</span><b class="${dlClass}">${formatTime(Math.max(0, p.timeLeft))}</b></div>
        </div>
        <div class="bar ${dlClass} pd-dl"><i style="width:${dlPct}%"></i></div>

        <div class="pd-actions">${this.renderActions(p)}</div>
      </div>`;
  }

  renderScannerTerminal(p, ready) {
    const expected = p.code;
    const hint = expected.slice(-5);
    const value = this.escAttr(this.scanDraft);
    return `
      <div class="scanner-terminal ${ready ? 'ready' : ''}">
        <div class="scanner-head">
          <span>${iconEl('scanner')} Scanner Terminal</span>
          <b>${ready ? 'ONLINE' : 'OUT OF RANGE'}</b>
        </div>
        <label class="scan-field">
          <span>Input barcode paket</span>
          <input class="scan-input" data-scan-input autocomplete="off" spellcheck="false"
            placeholder="Ketik ${hint} atau kode penuh" value="${value}" ${ready ? '' : 'disabled'} />
        </label>
        <div class="scan-help">
          <span>Label barcode: <b>${expected}</b></span>
          <span>Validasi cepat boleh pakai 5 digit akhir: <b>${hint}</b></span>
        </div>
        <button class="btn btn-primary btn-block" data-action="validate-scan" ${ready ? '' : 'disabled'}>
          ${iconEl('scan')} Validasi & Scan
        </button>
      </div>`;
  }

  renderActions(p) {
    const g = this.game;
    const need = stationForPackage(p);
    const ready = !need || g.operator?.at(need);
    const gate = this.stationGate(need, ready);
    switch (p.state) {
      case 'waiting_scan':
        return p.scanInitiated
          ? this.progressNote('Memindai...', p.progress)
          : `${gate}${this.renderScannerTerminal(p, ready)}`;

      case 'scanned': {
        const routes = g.level.routes.map((rid) => {
          const r = ROUTES[rid];
          return `<button class="btn btn-route" data-action="sort" data-route="${rid}" ${ready ? '' : 'disabled'}>${iconEl('pin')} ${r.name}</button>`;
        }).join('');
        return `${gate}<p class="pd-hint">Sortir ke tujuan paket: <b>${p.destName}</b></p>
                <div class="route-grid">${routes}</div>`;
      }

      case 'sorting': return this.progressNote('Menyortir...', p.progress);
      case 'sorted':
        return `${gate}<button class="btn btn-primary btn-block" data-action="pack" ${ready ? '' : 'disabled'}>${iconEl('pack')} Packing ${p.isFragile() ? '(hati-hati)' : ''}</button>`;
      case 'packing': return this.progressNote('Mengemas...', p.progress);
      case 'quality_check': return this.progressNote('Quality Check...', p.progress);

      case 'ready_to_load': {
        const opts = g.vehicles.map((v) => {
          const c = v.canAccept(p);
          return `<button class="btn btn-veh ${c.ok && ready ? '' : 'disabled'}" data-action="load" data-veh="${v.id}" ${c.ok && ready ? '' : 'disabled'} title="${c.ok ? 'Muat' : c.reason}">
            ${iconEl(v.icon)} ${v.name} <em>${v.load}/${v.capacity}</em>
          </button>`;
        }).join('');
        return `${gate}<p class="pd-hint">Muat ke kendaraan (cek kapasitas & jenis):</p>
                <div class="veh-grid">${opts}</div>`;
      }

      case 'loaded':
        return `<p class="pd-note ok">${iconEl('check')} Di ${p.vehicle?.name}. Menunggu dispatch — muat paket lain atau tekan Dispatch di kartu kendaraan.</p>`;
      case 'shipping':
        return `<p class="pd-note">${iconEl('dispatch')} Dalam perjalanan ke ${p.destName}...</p>`;
      case 'delivered':
        return `<p class="pd-note ok">${iconEl('check')} Terkirim tepat waktu!</p>`;
      case 'late':
        return `<p class="pd-note bad">${iconEl('clock')} Terkirim terlambat.</p>`;
      case 'damaged':
        return `<p class="pd-note bad">${iconEl('cross')} Paket rusak saat QC.</p>`;
      case 'failed':
        return `<p class="pd-note bad">${iconEl('cross')} Paket gagal diproses.</p>`;
      default:
        return '';
    }
  }

  stationGate(station, ready) {
    if (!station || ready) return '';
    const g = this.game;
    const label = stationLabel(station);
    return `<div class="station-gate">
      <b>Butuh posisi operator</b>
      <span>Gerakkan aktor ke ${label}. Dekati zona yang menyala, lalu tekan tombol aksi.</span>
      <button class="btn btn-sm btn-accent" data-action="move-station" data-station="${station}">Marker</button>
    </div>`;
  }

  progressNote(text, prog) {
    return `<div class="proc-note"><span>${text}</span><div class="bar good proc"><i style="width:${(prog || 0) * 100}%"></i></div></div>`;
  }

  renderEventBanner() {
    const ev = this.game.events?.activeEvent;
    if (!ev) return '';
    const t = this.game.events.active.timer;
    return `<div class="event-banner ev-${ev.id}">${iconEl(ev.icon)} <b>${ev.name}</b> — ${ev.desc} <span class="ev-timer">${Math.ceil(t)}s</span></div>`;
  }

  renderToasts() {
    return this.game.toasts
      .filter((t) => performance.now() - t.t < 2600)
      .map((t) => `<div class="toast toast-${t.kind}">${t.text}</div>`)
      .join('');
  }

  renderOverlay() {
    const ov = this.$('overlay');
    if (this.game.gameFSM.is('paused')) {
      ov.className = 'overlay';
      ov.innerHTML = `
        <div class="modal">
          <h2>${iconEl('pause')} Jeda</h2>
          <p>Operasional dijeda. Lanjutkan atau kembali ke menu.</p>
          <div class="modal-actions">
            <button class="btn btn-primary btn-lg" data-action="resume">${iconEl('play')} Lanjut</button>
            <button class="btn btn-ghost" data-action="quit">Keluar ke Menu</button>
          </div>
        </div>`;
    } else {
      ov.className = 'overlay hidden';
      ov.innerHTML = '';
    }
  }

  // ------------------------------------------------------------------ input
  onInput(e) {
    if (e.target.matches('[data-scan-input]')) {
      this.scanDraft = e.target.value.toUpperCase();
      e.target.value = this.scanDraft;
    }
  }

  onKeyDown(e) {
    const k = e.key.toLowerCase();
    const moveKey = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(k);
    if (moveKey) {
      this.keys.add(k);
      e.preventDefault();
      return;
    }

    if (e.repeat) return;
    if (k === 'escape') { this.game.togglePause(); return; }
    if (k === 'enter' && e.target?.matches?.('[data-scan-input]')) {
      e.preventDefault();
      this.validateScan();
      return;
    }
    if (k === 'e' || k === ' ') { e.preventDefault(); this.contextAction(); return; }
    if (k === 'q') { e.preventDefault(); this.selectNextPackage(); return; }
    if (k === 'r') { e.preventDefault(); this.dispatchReady(); return; }
    if (/^[1-9]$/.test(k)) { this.sortByNumber(parseInt(k, 10)); }
  }

  onKeyUp(e) {
    this.keys.delete(e.key.toLowerCase());
  }

  applyMovementInput() {
    const op = this.game.operator;
    if (!op) return;
    if (!this.game.isPlaying() || this.game.gameFSM.is('paused')) {
      op.clearMoveInput();
      return;
    }

    let x = this.joy.x;
    let y = this.joy.y;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    op.setMoveInput(x, y);
  }

  contextAction() {
    const g = this.game;
    let p = g.getSelected();
    if (!p) {
      this.selectNextPackage();
      p = g.getSelected();
      if (!p) return;
    }

    switch (p.state) {
      case 'waiting_scan':
        if (!p.scanInitiated) this.validateScan();
        break;
      case 'sorted':
        g.actPack();
        break;
      case 'ready_to_load': {
        const v = g.vehicles.find((x) => x.canAccept(p).ok);
        if (v) g.actLoad(v.id);
        else g.bus.emit('toast', { text: 'Tidak ada kendaraan yang cocok.', kind: 'bad' });
        break;
      }
      case 'loaded':
        if (p.vehicle) g.actDispatch(p.vehicle.id);
        break;
      case 'scanned':
        g.bus.emit('toast', { text: 'Pilih rute sortir di panel atau tekan angka 1-9.', kind: 'info' });
        break;
      default:
        g.bus.emit('toast', { text: 'Tunggu proses tahap ini selesai.', kind: 'info' });
    }
    this.render();
  }

  selectNextPackage() {
    const list = this.game.packages
      .filter((p) => !p.isFinal() && ['waiting_scan', 'scanned', 'sorted', 'ready_to_load'].includes(p.state))
      .sort((a, b) => a.timeLeft - b.timeLeft);
    if (!list.length) return;
    this.game.select(list[0].id);
    const station = this.game.selectedTaskStation();
    if (station) this.game.moveOperatorTo(station);
    this.render();
  }

  dispatchReady() {
    const v = this.game.vehicles.find((x) => x.state === 'loading' && x.packages.length > 0);
    if (v) this.game.actDispatch(v.id);
    else this.game.bus.emit('toast', { text: 'Belum ada kendaraan siap dispatch.', kind: 'info' });
    this.render();
  }

  sortByNumber(n) {
    const p = this.game.getSelected();
    if (!p || p.state !== 'scanned') return;
    const route = this.game.level.routes[n - 1];
    if (route) this.game.actSort(route);
    this.render();
  }

  validateScan() {
    const p = this.game.getSelected();
    if (!p) return;
    this.game.actScan(this.scanDraft);
    if (p.scanInitiated) this.scanDraft = '';
    this.render();
  }

  setupTouchControls() {
    const zone = this.root.querySelector('.stick-zone');
    const knob = this.root.querySelector('.stick-knob');
    if (!zone || !knob) return;
    this._touchAbort = new AbortController();
    const signal = this._touchAbort.signal;
    const reset = () => {
      this._joyPointer = null;
      this.joy = { x: 0, y: 0 };
      knob.style.transform = 'translate(-50%, -50%)';
    };
    const update = (e) => {
      if (this._joyPointer !== e.pointerId) return;
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const max = rect.width * 0.34;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      this.joy = { x: dx / max, y: dy / max };
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };

    zone.addEventListener('pointerdown', (e) => {
      this._joyPointer = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      update(e);
    }, { signal });
    zone.addEventListener('pointermove', update, { signal });
    zone.addEventListener('pointerup', reset, { signal });
    zone.addEventListener('pointercancel', reset, { signal });
  }

  onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const g = this.game;
    const a = el.dataset.action;
    g.audio.resume();

    switch (a) {
      case 'select': {
        g.select(el.dataset.id);
        this.scanDraft = '';
        const station = g.selectedTaskStation();
        if (station) g.moveOperatorTo(station);
        break;
      }
      case 'scan': this.validateScan(); break;
      case 'validate-scan': this.validateScan(); break;
      case 'sort': g.actSort(el.dataset.route); break;
      case 'pack': g.actPack(); break;
      case 'load': g.actLoad(el.dataset.veh); break;
      case 'dispatch': g.actDispatch(el.dataset.veh); break;
      case 'move-station': g.moveOperatorTo(el.dataset.station); break;
      case 'go-task': g.moveOperatorToSelectedTask(); break;
      case 'context-action': this.contextAction(); break;
      case 'next-package': this.selectNextPackage(); break;
      case 'dispatch-ready': this.dispatchReady(); break;
      case 'pause': g.togglePause(); break;
      case 'resume': g.resume(); break;
      case 'mute': g.audio.toggleMute(); break;
      case 'quit': g.quitToMenu(); break;
    }
    this.render(); // umpan balik instan
  }
}
