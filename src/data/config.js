// ============================================================================
// config.js — Konstanta global & tuning balance LogiRush
// Semua angka yang bisa di-tweak (skor, kapasitas, durasi, threshold KPI)
// dikumpulkan di sini agar mudah diatur tanpa mengubah logika.
// ============================================================================

export const CONFIG = {
  // -- Loop & waktu --------------------------------------------------------
  TICK_RATE: 60, // target FPS update simulasi
  RENDER_HZ: 15, // frekuensi re-render panel dinamis (hemat DOM)

  // -- Tempo spawn paket ---------------------------------------------------
  // Pengali global jeda kemunculan paket. >1 = box muncul lebih santai.
  // Sengaja lembut: pop-up proses sudah membekukan waktu di tiap langkah,
  // jadi tempo terasa jauh lebih tenang tanpa membuat target mustahil.
  SPAWN_MULT: 1.15,
  FIRST_SPAWN_DELAY: 1.0, // jeda lembut sebelum paket pertama muncul (detik)
  SPAWN_STOP_AT: 7,       // berhenti spawn saat sisa waktu <= ini (detik)

  // -- Skor (GDD 6.1) ------------------------------------------------------
  SCORE: {
    SCAN_CORRECT: 50,
    SORT_CORRECT: 100,
    PACK_CORRECT: 100,
    DELIVER_ONTIME: 300,
    DELIVER_EXPRESS_ONTIME: 500,
    WRONG_SORT: -150,
    LATE: -200,
    FRAGILE_DAMAGED: -300,
    OVERLOAD_TOO_LONG: -250,
  },

  // -- Combo / streak (GDD 6.2) -------------------------------------------
  COMBO: {
    X2_AT: 3, // 3 paket benar berturut → x2
    X3_AT: 5, // 5 paket benar berturut → x3
    SUPER_AT: 10, // 10 paket benar berturut → Super Dispatch Mode
    SUPER_MULT: 4,
  },

  // -- Kapasitas area gudang (GDD 5.2) ------------------------------------
  AREA_CAPACITY: {
    inbound: 10,
    sorting: 6,
    packing: 5,
    qc: 4,
    loading: 8,
  },
  DISPATCH_SLOTS: 3, // maksimum kendaraan aktif (GDD 5.2)

  // -- State gudang (GDD 7.2) ---------------------------------------------
  WAREHOUSE: {
    BUSY_RATIO: 0.6, // >60% kapasitas → Busy
    OVERLOAD_RATIO: 0.85, // >85% kapasitas → Overload
    RECOVERY_RATIO: 0.55, // turun di bawah ini setelah overload → Recovery
    BOTTLENECK_AFTER: 10, // detik overload berlanjut → Bottleneck
    OVERLOAD_SLOW_FACTOR: 1.5, // proses melambat saat overload
    SAT_DRAIN_OVERLOAD: 1.2, // %/detik satisfaction turun saat overload
    SAT_DRAIN_BOTTLENECK: 2.4, // %/detik saat bottleneck
    BOTTLENECK_PENALTY_EVERY: 6, // detik antar penalti -250 saat bottleneck
  },

  // -- Durasi proses dasar (detik) ----------------------------------------
  PROCESS: {
    SCAN_TIME: 0.6, // animasi/jeda scan
    SORT_TIME: 0.4,
    PACK_TIME_REGULAR: 1.4,
    PACK_TIME_EXPRESS: 1.0,
    PACK_TIME_FRAGILE: 2.2, // fragile butuh hati-hati → lebih lama
    QC_TIME: 0.8,
    LOAD_TIME: 0.6,
  },

  // -- Risiko damage saat QC (fragile) ------------------------------------
  DAMAGE: {
    FRAGILE_BASE: 0.12, // 12% baseline
    OVERLOAD_ADD: 0.18, // + saat gudang overload/bottleneck
    TIRED_STAFF_ADD: 0.1, // + saat staff lelah
    RUSHED_ADD: 0.2, // + bila tidak di-pack hati-hati
    NONFRAGILE: 0.0,
    PACKING_MACHINE_MULT: 0.5, // upgrade mengurangi risiko
  },

  // -- Satisfaction --------------------------------------------------------
  SAT: {
    START: 100,
    ONTIME_GAIN: 1.5,
    EXPRESS_ONTIME_GAIN: 3,
    LATE_LOSS: 6,
    WRONG_SORT_LOSS: 5,
    DAMAGE_LOSS: 8,
    FAILED_LOSS: 12,
    MIN: 0,
    MAX: 100,
  },

  // -- Threshold lulus & grade (GDD 13.1) ---------------------------------
  PASS: {
    SATISFACTION_MIN: 60,
    SORTING_ACCURACY_MIN: 70,
    ONTIME_MIN: 70,
  },
  GRADE: {
    A: { ontime: 85, accuracy: 90, satisfaction: 85, damageMax: 10 },
    B: { ontime: 70, accuracy: 80, satisfaction: 70, damageMax: 20 },
    C: { ontime: 55, accuracy: 70, satisfaction: 60, damageMax: 30 },
    // di bawah C → D
  },

  // -- Staff --------------------------------------------------------------
  STAFF: {
    COUNT: 2,
    STAMINA_MAX: 100,
    STAMINA_DRAIN: 6, // /detik saat working
    STAMINA_REGEN: 14, // /detik saat resting
    TIRED_AT: 25, // stamina < ini → Tired
    READY_AT: 90, // resting sampai stamina ≥ ini → Ready
    TIRED_SLOW_FACTOR: 1.4, // proses lebih lambat saat tired
  },

  // -- Random event (GDD 5.7) ---------------------------------------------
  EVENTS: {
    ENABLED_DEFAULT: false, // diaktifkan per-level
    MIN_GAP: 12, // jeda minimum antar event (detik)
    MAX_GAP: 22,
  },
};

// Ambang grade dipakai juga sebagai urutan ranking
export const GRADE_ORDER = ['A', 'B', 'C', 'D'];
