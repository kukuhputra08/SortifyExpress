// ============================================================================
// PlayerCharacter.js — Operator utama yang benar-benar dikendalikan player.
// Koordinat memakai persen map agar mudah responsif. Player bergerak dengan
// WASD/arrow atau analog mobile, lalu berinteraksi saat dekat station.
// ============================================================================

import { createCharacterFSM, CHARACTER_STATE_LABEL } from '../fsm/CharacterFSM.js';
import { clamp } from '../core/Utils.js';

export const STATIONS = {
  pickup: {
    id: 'pickup',
    label: 'Inbound Pickup',
    short: 'Pickup',
    x: 15,
    y: 72,
    radius: 11,
    tip: 'Ambil paket dari rak inbound dan scan barcode.',
  },
  sorting: {
    id: 'sorting',
    label: 'Sorting Line',
    short: 'Sortir',
    x: 40,
    y: 38,
    radius: 11,
    tip: 'Pilih rute tujuan yang cocok dengan hasil scan.',
  },
  packing: {
    id: 'packing',
    label: 'Packing Bench',
    short: 'Packing',
    x: 62,
    y: 68,
    radius: 11,
    tip: 'Kemas paket sebelum quality check.',
  },
  loading: {
    id: 'loading',
    label: 'Loading Dock',
    short: 'Loading',
    x: 86,
    y: 43,
    radius: 12,
    tip: 'Muat paket ke armada yang sesuai.',
  },
};

export const STATION_ORDER = ['pickup', 'sorting', 'packing', 'loading'];

export function stationForPackage(pkg) {
  if (!pkg || pkg.isFinal()) return null;
  switch (pkg.state) {
    case 'created':
    case 'waiting_scan':
      return pkg.scanInitiated ? null : 'pickup';
    case 'scanned':
      return 'sorting';
    case 'sorted':
      return 'packing';
    case 'ready_to_load':
      return 'loading';
    default:
      return null;
  }
}

export function stationLabel(stationId) {
  return STATIONS[stationId]?.label || 'Station';
}

function dist(a, b, c, d) {
  return Math.hypot(a - c, b - d);
}

export class PlayerCharacter {
  constructor(game) {
    this.game = game;
    this.x = STATIONS.pickup.x;
    this.y = STATIONS.pickup.y;
    this.inputX = 0;
    this.inputY = 0;
    this.facing = 'down';
    this.speed = 26; // persen map per detik
    this.station = 'pickup';
    this.waypointStation = null;
    this.bounds = { minX: 6, maxX: 94, minY: 23, maxY: 82 };
    this.fsm = createCharacterFSM(this);
  }

  get state() { return this.fsm.state; }
  get stateLabel() { return CHARACTER_STATE_LABEL[this.state]; }
  get stationLabel() { return this.station ? stationLabel(this.station) : 'Lorong Gudang'; }
  get targetLabel() { return stationLabel(this.waypointStation); }

  isMoving() { return this.fsm.is('walking'); }

  hasMoveInput() {
    return Math.hypot(this.inputX, this.inputY) > 0.08;
  }

  setMoveInput(x, y) {
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      this.inputX = x / mag;
      this.inputY = y / mag;
    } else {
      this.inputX = x;
      this.inputY = y;
    }
  }

  clearMoveInput() {
    this.inputX = 0;
    this.inputY = 0;
  }

  setWaypoint(stationId) {
    if (!STATIONS[stationId]) return false;
    this.waypointStation = stationId;
    return true;
  }

  clearWaypoint() {
    this.waypointStation = null;
  }

  at(stationId) {
    return this.distanceTo(stationId) <= (STATIONS[stationId]?.radius || 0);
  }

  distanceTo(stationId) {
    const st = STATIONS[stationId];
    if (!st) return Infinity;
    return dist(this.x, this.y, st.x, st.y);
  }

  nearestStation() {
    let best = null;
    let bestDist = Infinity;
    for (const id of STATION_ORDER) {
      const d = this.distanceTo(id);
      if (d < bestDist) { best = id; bestDist = d; }
    }
    return bestDist <= (STATIONS[best]?.radius || 0) ? best : null;
  }

  moveTo(stationId) {
    // Backward-compatible helper: no auto-walk; only mark objective.
    return this.setWaypoint(stationId);
  }

  advanceMovement(dt) {
    const mag = Math.hypot(this.inputX, this.inputY);
    if (mag <= 0.08) return;

    const nx = this.inputX / mag;
    const ny = this.inputY / mag;
    this.x = clamp(this.x + nx * this.speed * dt, this.bounds.minX, this.bounds.maxX);
    this.y = clamp(this.y + ny * this.speed * dt, this.bounds.minY, this.bounds.maxY);

    if (Math.abs(nx) > Math.abs(ny)) this.facing = nx >= 0 ? 'right' : 'left';
    else this.facing = ny >= 0 ? 'down' : 'up';
  }

  update(dt) {
    this.fsm.update(dt);
    this.station = this.nearestStation();
    if (this.waypointStation && this.at(this.waypointStation)) this.clearWaypoint();
  }
}
