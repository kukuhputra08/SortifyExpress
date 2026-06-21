// ============================================================================
// deliveryMap.js - Peta rute antar-wilayah untuk mode dispatch manual.
// Koordinat memakai viewBox 1000 x 650 agar mudah digambar sebagai SVG/HTML.
// ============================================================================

const W = 1000;
const H = 650;
const ROUNDABOUT = { x: 385, y: 335, r: 115 };

const baseRoads = [
  { x1: 120, y1: 570, x2: 120, y2: 120 },
  { x1: 120, y1: 120, x2: 610, y2: 120 },
  { x1: 610, y1: 120, x2: 760, y2: 205 },
  { x1: 760, y1: 205, x2: 760, y2: 335 },
  { x1: 500, y1: 335, x2: 930, y2: 335 },
  { x1: 930, y1: 335, x2: 930, y2: 570 },
  { x1: 930, y1: 570, x2: 120, y2: 570 },
  { x1: 470, y1: 120, x2: 470, y2: 570 },
  { x1: 470, y1: 335, x2: 500, y2: 335 },
  { x1: 120, y1: 335, x2: 270, y2: 335 },
  { x1: 385, y1: 220, x2: 470, y2: 220 },
  { x1: 385, y1: 450, x2: 470, y2: 570 },
  { x1: 760, y1: 335, x2: 760, y2: 470 },
  { x1: 760, y1: 470, x2: 870, y2: 470 },
  { x1: 870, y1: 470, x2: 870, y2: 570 },
  { x1: 760, y1: 205, x2: 910, y2: 205 },
  { x1: 910, y1: 205, x2: 910, y2: 120 },
  { x1: 760, y1: 205, x2: 930, y2: 335 },
];

const roundaboutRoads = Array.from({ length: 24 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 24;
  const b = (Math.PI * 2 * (i + 1)) / 24;
  return {
    x1: ROUNDABOUT.x + Math.cos(a) * ROUNDABOUT.r,
    y1: ROUNDABOUT.y + Math.sin(a) * ROUNDABOUT.r,
    x2: ROUNDABOUT.x + Math.cos(b) * ROUNDABOUT.r,
    y2: ROUNDABOUT.y + Math.sin(b) * ROUNDABOUT.r,
  };
});

export const DELIVERY_ROADS = [...baseRoads, ...roundaboutRoads];

export const DELIVERY_MAP = {
  width: W,
  height: H,
  roadRadius: 48,
  depot: { id: 'depot', name: 'Gudang Pusat', x: 120, y: 570 },
  roundabout: ROUNDABOUT,
  stops: {
    gresik: { id: 'gresik', name: 'Gresik', x: 255, y: 120, tone: 'north' },
    surabaya: { id: 'surabaya', name: 'Surabaya', x: 570, y: 335, tone: 'center' },
    sidoarjo: { id: 'sidoarjo', name: 'Sidoarjo', x: 760, y: 470, tone: 'south' },
    malang: { id: 'malang', name: 'Malang', x: 870, y: 570, tone: 'south' },
    jember: { id: 'jember', name: 'Jember', x: 910, y: 205, tone: 'east' },
    banyuwangi: { id: 'banyuwangi', name: 'Banyuwangi', x: 910, y: 120, tone: 'east' },
  },
};

export function deliveryStop(routeId) {
  return DELIVERY_MAP.stops[routeId] || null;
}
