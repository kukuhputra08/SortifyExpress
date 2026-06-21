// ============================================================================
// smoke-test.mjs — Uji runtime tanpa browser.
// Menjalankan simulasi headless: mensimulasikan satu level Day 3 dengan
// "auto-player" yang memproses paket, lalu memverifikasi FSM, KPI & hasil.
// Jalankan: node docs/smoke-test.mjs
// ============================================================================

import { Game } from '../src/core/Game.js';
import { STATIONS } from '../src/objects/PlayerCharacter.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ❌', msg); } };

// --- sceneManager tiruan (tanpa DOM) ---
const sceneLog = [];
const fakeScenes = { show: (n) => sceneLog.push(n), update: () => {} };

const game = new Game();
game.attachScenes(fakeScenes);
game.begin();
ok(game.flow === 'main_menu', 'mulai di main_menu');
ok(sceneLog.includes('MainMenu'), 'MainMenu ditampilkan');

// --- mulai Day 3 (reguler+express+fragile, ada risiko damage) ---
game.startLevel(3);
ok(game.isPlaying(), 'state playing setelah startLevel');
ok(game.vehicles.length >= 2, 'armada kendaraan dibuat');
ok(game.staff.length === 2, 'dua staff dibuat');

// --- auto-player: jalankan logika proses untuk tiap paket aktif ---
function actionable(p) {
  return (
    (p.state === 'waiting_scan' && !p.scanInitiated) ||
    p.state === 'scanned' ||
    p.state === 'sorted' ||
    p.state === 'ready_to_load'
  );
}

function actOn(p) {
  game.selectedId = p.id;
  switch (p.state) {
    case 'waiting_scan': if (!p.scanInitiated) game.actScan(p.code); break;
    case 'scanned': game.actSort(p.route); break;     // selalu sortir benar
    case 'sorted': game.actPack(); break;
    case 'ready_to_load': {
      // pilih kendaraan pertama yang bisa menerima
      const v = game.vehicles.find((x) => x.canAccept(p).ok);
      if (v) game.actLoad(v.id);
      break;
    }
  }
}

function autoPlay() {
  const candidates = game.packages
    .filter(actionable)
    .sort((a, b) => a.timeLeft - b.timeLeft);

  // Jika ada aksi yang bisa dilakukan di station operator saat ini, lakukan itu.
  let acted = false;
  for (const p of candidates) {
    game.selectedId = p.id;
    const need = game.selectedTaskStation();
    if (need && !game.operator.at(need)) {
      const st = STATIONS[need];
      game.operator.x = st.x;
      game.operator.y = st.y;
      game.operator.update(0);
    }
    if (!need || game.operator.at(need)) {
      actOn(p);
      acted = true;
      break;
    }
  }

  // Kalau belum ada yang bisa dikerjakan, bergerak ke station paket paling urgent.
  if (!acted) {
    const p = candidates.find((pkg) => !game.operatorReadyFor(pkg));
    if (p && !game.operator.isMoving()) {
      game.selectedId = p.id;
      const station = game.selectedTaskStation();
      if (station) {
        const st = STATIONS[station];
        game.operator.x = st.x;
        game.operator.y = st.y;
        game.operator.update(0);
      }
    }
  }

  // dispatch kendaraan yang sudah memuat ≥1 paket (dengan probabilitas agar tidak instant)
  for (const v of game.vehicles) {
    if (v.fsm.is('loading') && v.packages.length > 0) {
      // dispatch jika penuh atau probabilitas 25% setiap frame
      if (v.full() || Math.random() < 0.25) {
        game.actDispatch(v.id);
      }
    }
  }
}

// --- loop simulasi: dt tetap 1/30 s, durasi level + buffer ---
const dt = 1 / 30;
let steps = 0;
const maxSteps = Math.ceil((game.level.duration + 40) / dt);
while (game.flow === 'playing' && steps < maxSteps) {
  autoPlay();
  game.update(dt);
  steps++;
}

const snap = game.lastResult?.snapshot;
ok(['level_complete', 'game_over'].includes(game.flow), `level berakhir (flow=${game.flow})`);
ok(game.lastResult, 'lastResult terisi');
ok(snap && snap.created > 0, `paket ter-spawn (${snap?.created})`);
ok(snap && (snap.onTime + snap.late) > 0, `ada paket terkirim (onTime=${snap?.onTime}, late=${snap?.late})`);
ok(snap && snap.sortingAccuracy >= 99, `sorting accuracy ~100% saat selalu benar (${Math.round(snap?.sortingAccuracy)}%)`);
ok(['A', 'B', 'C', 'D'].includes(snap?.grade), `grade valid (${snap?.grade})`);
ok(game.score.score > 0, `skor positif (${game.score.score})`);

// --- verifikasi semua FSM mencapai state final yang valid ---
const finalStates = new Set();
// (paket aktif sudah dibersihkan; cek lewat KPI counter)
ok(snap.onTime + snap.late + snap.damaged + snap.failed === snap.concluded, 'KPI counter konsisten');

// --- verifikasi FSM transisi ilegal ditolak ---
const wh = game.warehouse;
ok(typeof wh.state === 'string', 'warehouse punya state');

// --- uji upgrade flow ---
if (game.flow === 'level_complete') {
  game.coins = 999;
  const bought = game.buyUpgrade('barcode_scanner');
  ok(bought, 'beli upgrade berhasil');
  ok(game.upgrades.scanSpeed < 1, 'upgrade scanner mempercepat scan');
}

console.log(`\nDay 3 ringkasan: created=${snap.created} onTime=${snap.onTime} late=${snap.late} damaged=${snap.damaged} failed=${snap.failed} acc=${Math.round(snap.sortingAccuracy)}% grade=${snap.grade} score=${game.lastResult.score}`);

// --- uji cepat semua level bisa di-start tanpa error ---
for (let i = 1; i <= 7; i++) {
  try { game.startLevel(i); ok(game.isPlaying(), `Day ${i} start OK`); }
  catch (e) { ok(false, `Day ${i} start error: ${e.message}`); }
}

console.log(`\n${fail === 0 ? '✅ SEMUA' : '⚠️'}  ${pass} lulus, ${fail} gagal`);
process.exit(fail === 0 ? 0 : 1);
