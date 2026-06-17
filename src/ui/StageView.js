// ============================================================================
// StageView.js — Map gudang interaktif.
// Dibangun sekali dan di-update imperatif: player menggerakkan operator di map,
// paket tampil sebagai box ber-barcode, station memberi feedback proximity,
// kendaraan tetap divisualkan di jalur ekspedisi.
// ============================================================================

import { WORKER_SVG, staffAvatar, vehicleSide, DEPOT_SVG, CITY_SVG } from './characters.js';
import { clamp } from '../core/Utils.js';
import { STATIONS, STATION_ORDER, stationForPackage } from '../objects/PlayerCharacter.js';

const RUNNING_STATES = ['departing', 'delivering', 'delayed', 'arrived', 'returning'];
const MOVING_STATES = ['departing', 'delivering', 'returning'];

const AREA_POINTS = {
  inbound: { x: 15, y: 72 },
  sorting: { x: 40, y: 38 },
  packing: { x: 62, y: 68 },
  qc: { x: 66, y: 38 },
  loading: { x: 86, y: 43 },
};

export class StageView {
  constructor(game) {
    this.game = game;
    this.runners = new Map();
    this.mapPackages = new Map();
  }

  mount(container) {
    const stationPads = STATION_ORDER.map((id, i) => {
      const st = STATIONS[id];
      return `
        <button class="map-station station-${id}" data-action="move-station" data-station="${id}" style="left:${st.x}%;top:${st.y}%">
          <span class="station-dot">${i + 1}</span>
          <span class="station-name">${st.short}</span>
        </button>`;
    }).join('');

    container.innerHTML = `
      <div class="stage map-stage">
        <div class="floor warehouse-map">
          <span class="stage-tag">🏭 Map Gudang Ekspedisi</span>
          <div class="map-grid"></div>
          <div class="warehouse-wall wall-top"></div>
          <div class="warehouse-lights"><i></i><i></i><i></i><i></i></div>
          <div class="detail-office"><b>OPS</b><span>monitor</span></div>
          <div class="detail-shelves shelves-left"><i></i><i></i><i></i></div>
          <div class="detail-shelves shelves-mid"><i></i><i></i><i></i></div>
          <div class="detail-pallet pallet-a"></div>
          <div class="detail-pallet pallet-b"></div>
          <div class="detail-forklift"><span></span></div>
          <div class="dock-doors"><i></i><i></i><i></i></div>
          <div class="safety-line line-inbound"></div>
          <div class="safety-line line-loading"></div>
          <div class="map-route route-a"></div>
          <div class="map-route route-b"></div>
          <div class="map-route route-c"></div>

          <section class="map-zone zone-inbound" style="left:5%;top:52%;width:22%;height:35%">
            <b>Inbound Rack</b><span>paket masuk</span>
          </section>
          <section class="map-zone zone-sorting" style="left:30%;top:21%;width:22%;height:31%">
            <b>Sorting Line</b><span>pilih rute</span>
          </section>
          <section class="map-zone zone-qc" style="left:55%;top:20%;width:19%;height:28%">
            <b>Quality Check</b><span>otomatis</span>
          </section>
          <section class="map-zone zone-packing" style="left:50%;top:57%;width:24%;height:30%">
            <b>Packing Bench</b><span>kemas paket</span>
          </section>
          <section class="map-zone zone-loading" style="left:78%;top:28%;width:18%;height:36%">
            <b>Loading Dock</b><span>muat armada</span>
          </section>

          ${stationPads}
          <div class="map-packages"></div>
          <div class="operator">
            <div class="op-carry"></div>
            <div class="op-char">${WORKER_SVG}</div>
            <span class="op-label">Operator</span>
            <span class="op-state">Inbound Pickup</span>
          </div>
          <div class="staff-list"></div>
        </div>
        <div class="road">
          <span class="stage-tag">🚚 Rute Pengiriman</span>
          <div class="lane"></div>
          <div class="depot">${DEPOT_SVG}</div>
          <div class="city">${CITY_SVG}</div>
          <div class="runners"></div>
          <span class="road-hint">dispatch kendaraan dari Loading Dock…</span>
          <div class="rain"></div>
        </div>
      </div>`;

    this.el = container.querySelector('.stage');
    this.floor = container.querySelector('.floor');
    this.road = container.querySelector('.road');
    this.operatorEl = container.querySelector('.operator');
    this.operatorState = container.querySelector('.op-state');
    this.carryBox = container.querySelector('.op-carry');
    this.packageLayer = container.querySelector('.map-packages');
    this.runnersEl = container.querySelector('.runners');
    this.roadHint = container.querySelector('.road-hint');
    this.stationEls = [...container.querySelectorAll('.map-station')];
    this.zoneEls = {
      pickup: container.querySelector('.zone-inbound'),
      sorting: container.querySelector('.zone-sorting'),
      packing: container.querySelector('.zone-packing'),
      loading: container.querySelector('.zone-loading'),
    };

    const sl = container.querySelector('.staff-list');
    sl.innerHTML = this.game.staff.map((s) => `
      <div class="staff-mini" data-id="${s.id}">
        <div class="sm-av">${staffAvatar()}</div>
        <div class="sm-meta">
          <b>${s.name}</b>
          <span class="sm-state">Idle</span>
          <span class="sm-stam"><i></i></span>
        </div>
      </div>`).join('');
    this.staffEls = [...sl.querySelectorAll('.staff-mini')];
  }

  setPaused(paused) {
    if (this.el) this.el.classList.toggle('paused', paused);
  }

  update() {
    const g = this.game;
    if (!this.el || !g.packages) return;

    this.syncOperator();
    this.syncMapPackages();
    this.syncStaff();

    const ev = g.events?.activeEvent;
    this.road.classList.toggle('raining', ev?.id === 'rain');
    this.syncRunners();
  }

  syncOperator() {
    const g = this.game;
    const op = g.operator;
    if (!op || !this.operatorEl) return;

    const selected = g.getSelected?.();
    const requiredStation = stationForPackage(selected);
    const selectedBusy = selected && (
      (selected.state === 'waiting_scan' && selected.scanInitiated) ||
      ['sorting', 'packing', 'quality_check'].includes(selected.state)
    );

    this.operatorEl.style.left = `${op.x}%`;
    this.operatorEl.style.top = `${op.y}%`;
    this.operatorEl.dataset.facing = op.facing;

    const cls = this.operatorEl.classList;
    cls.remove('moving', 'working', 'tired', 'idle');
    if (op.isMoving()) cls.add('moving');
    else if (g.staffTired()) cls.add('tired');
    else if (selectedBusy) cls.add('working');
    else cls.add('idle');

    this.operatorState.textContent = op.station
      ? op.stationLabel
      : (op.waypointStation ? `Menuju ${op.targetLabel}` : 'Lorong Gudang');

    for (const el of this.stationEls) {
      const id = el.dataset.station;
      el.classList.toggle('current', op.at(id));
      el.classList.toggle('target', op.waypointStation === id);
      el.classList.toggle('needed', requiredStation === id);
    }

    for (const [id, el] of Object.entries(this.zoneEls)) {
      el.classList.toggle('current', op.at(id));
      el.classList.toggle('needed', requiredStation === id);
      el.classList.toggle('target', op.waypointStation === id);
    }

    const carrying = selected && !selected.isFinal() &&
      ['waiting_scan', 'scanned', 'sorted', 'ready_to_load'].includes(selected.state);
    this.carryBox.classList.toggle('show', !!carrying);
    if (carrying) {
      this.carryBox.style.setProperty('--c', selected.color);
      this.carryBox.textContent = selected.code.slice(-3);
    }
  }

  syncMapPackages() {
    const alive = new Set();
    const byAreaIndex = new Map();

    for (const p of this.game.packages) {
      if (!p.area || p.isFinal()) continue;
      alive.add(p.id);
      let el = this.mapPackages.get(p.id);
      if (!el) {
        el = document.createElement('button');
        el.className = 'map-pkg';
        el.dataset.action = 'select';
        el.dataset.id = p.id;
        el.innerHTML = `
          <span class="pkg-cube"></span>
          <span class="pkg-code"></span>
          <span class="pkg-barcode"><i></i><i></i><i></i><i></i><i></i><i></i></span>`;
        this.packageLayer.appendChild(el);
        this.mapPackages.set(p.id, el);
      }

      const area = p.area;
      const idx = byAreaIndex.get(area) || 0;
      byAreaIndex.set(area, idx + 1);
      const base = AREA_POINTS[area] || AREA_POINTS.inbound;
      const ox = ((idx % 4) - 1.5) * 3.4;
      const oy = (Math.floor(idx / 4) % 3 - 1) * 4.8;
      const selected = p.id === this.game.selectedId;
      const urgent = p.timeLeft < 10 ? 'urgent' : p.timeLeft < 20 ? 'warn' : '';

      el.style.left = `${base.x + ox}%`;
      el.style.top = `${base.y + oy}%`;
      el.style.setProperty('--c', p.color);
      el.className = `map-pkg ${selected ? 'selected' : ''} ${urgent}`;
      el.dataset.id = p.id;
      el.querySelector('.pkg-code').textContent = p.code.slice(-5);
      el.title = `${p.code} · ${p.stateLabel} · ${Math.ceil(Math.max(0, p.timeLeft))}s`;
    }

    for (const [id, el] of this.mapPackages) {
      if (!alive.has(id)) {
        el.remove();
        this.mapPackages.delete(id);
      }
    }
  }

  syncStaff() {
    for (let i = 0; i < this.staffEls.length; i++) {
      const s = this.game.staff[i];
      const el = this.staffEls[i];
      if (!s || !el) continue;
      el.dataset.state = s.state;
      el.querySelector('.sm-state').textContent = s.stateLabel;
      el.querySelector('.sm-stam i').style.width = `${clamp(s.stamina, 0, 100)}%`;
    }
  }

  syncRunners() {
    const g = this.game;
    const alive = new Set();

    for (const v of g.vehicles) {
      if (!RUNNING_STATES.includes(v.state)) continue;
      alive.add(v.id);

      let el = this.runners.get(v.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'vehrun';
        el.innerHTML = `<span class="run-label"></span>${vehicleSide(v.type)}`;
        this.runnersEl.appendChild(el);
        this.runners.set(v.id, el);
        const idx = g.vehicles.indexOf(v);
        el.style.bottom = `calc(8% + ${(idx % 3) * 13}px)`;
      }

      let f = 0.04;
      if (v.state === 'delivering' || v.state === 'delayed') {
        f = v.tripTime ? 1 - clamp(v.tripTimer / v.tripTime, 0, 1) : 0.5;
      } else if (v.state === 'arrived') f = 1;
      else if (v.state === 'returning') {
        const tot = v.tripTime * 0.5 || 1;
        f = clamp(v.returnTimer / tot, 0, 1);
      }

      el.style.left = `${6 + f * 78}%`;
      el.classList.toggle('moving', MOVING_STATES.includes(v.state));
      el.classList.toggle('delayed', v.state === 'delayed');
      el.classList.toggle('returning', v.state === 'returning');
      el.classList.toggle('arrived', v.state === 'arrived');

      const dest = v.packages[0]?.destName || '-';
      el.querySelector('.run-label').textContent = `${dest} · ${v.load} box`;
    }

    for (const [id, el] of this.runners) {
      if (!alive.has(id)) {
        el.remove();
        this.runners.delete(id);
      }
    }
    this.roadHint.classList.toggle('hidden', this.runners.size > 0);
  }

  destroy() {
    this.runners.clear();
    this.mapPackages.clear();
    this.el = null;
  }
}
