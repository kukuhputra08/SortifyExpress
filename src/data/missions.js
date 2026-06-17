// ============================================================================
// missions.js — Sistem misi (GDD 6.3)
// Tiap misi punya check(stats, game) -> boolean dan progress(stats, game)->string
// Dievaluasi di akhir level (sebagian bisa live).
// ============================================================================

export const MISSIONS = {
  deliver_target: {
    id: 'deliver_target',
    type: 'Main',
    label: (g) => `Kirim ${g.level.targetDelivered} paket`,
    check: (s, g) => s.delivered >= g.level.targetDelivered,
    progress: (s, g) => `${s.delivered}/${g.level.targetDelivered}`,
  },
  accuracy_85: {
    id: 'accuracy_85',
    type: 'Accuracy',
    label: () => 'Jaga sorting accuracy ≥ 85%',
    check: (s) => s.totalSorts === 0 || s.sortingAccuracy >= 85,
    progress: (s) => `${Math.round(s.sortingAccuracy)}%`,
  },
  ontime_80: {
    id: 'ontime_80',
    type: 'Accuracy',
    label: () => 'On-time delivery ≥ 80%',
    check: (s) => s.delivered === 0 || s.ontimeRate >= 80,
    progress: (s) => `${Math.round(s.ontimeRate)}%`,
  },
  safety_nodamage: {
    id: 'safety_nodamage',
    type: 'Safety',
    label: () => 'Tidak ada paket fragile rusak',
    check: (s) => s.damaged === 0,
    progress: (s) => `${s.damaged} rusak`,
  },
  efficiency_overload: {
    id: 'efficiency_overload',
    type: 'Efficiency',
    label: () => 'Overload total < 10 detik',
    check: (s) => s.overloadSeconds < 10,
    progress: (s) => `${s.overloadSeconds.toFixed(1)}s`,
  },
  vehicle_fit: {
    id: 'vehicle_fit',
    type: 'Vehicle',
    label: () => 'Tanpa salah pilih kendaraan',
    check: (s) => s.vehicleMisfit === 0,
    progress: (s) => `${s.vehicleMisfit} salah`,
  },
  express_priority: {
    id: 'express_priority',
    type: 'Accuracy',
    label: () => 'Semua express tepat waktu',
    check: (s) => s.expressLate === 0,
    progress: (s) => `${s.expressLate} telat`,
  },
  satisfaction_65: {
    id: 'satisfaction_65',
    type: 'Main',
    label: () => 'Customer satisfaction ≥ 65%',
    check: (s) => s.satisfaction >= 65,
    progress: (s) => `${Math.round(s.satisfaction)}%`,
  },
  grade_a: {
    id: 'grade_a',
    type: 'Main',
    label: () => 'Capai grade A',
    check: (s) => s.grade === 'A',
    progress: (s) => `Grade ${s.grade || '-'}`,
  },
};

export function getMissions(ids = []) {
  return ids.map((id) => MISSIONS[id]).filter(Boolean);
}
