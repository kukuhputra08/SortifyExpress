// ============================================================================
// main.js — Titik masuk. Membuat Game + SceneManager dan menjalankan game loop.
// ============================================================================

import { Game } from './core/Game.js';
import { SceneManager } from './scenes/SceneManager.js';

const root = document.getElementById('app');
const game = new Game();
const scenes = new SceneManager(game, root);
game.attachScenes(scenes);
game.begin(); // GameFSM → main_menu → render Main Menu

// ---- game loop (requestAnimationFrame dengan delta time) -------------------
let last = performance.now();
function loop(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1; // clamp lonjakan (mis. pindah tab) agar simulasi stabil
  game.update(dt);   // simulasi (hanya saat Playing)
  scenes.update(dt); // render scene aktif
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// jeda otomatis saat tab disembunyikan
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.isPlaying()) game.pause();
});

// inisialisasi audio pada interaksi pertama (kebijakan autoplay)
window.addEventListener('pointerdown', () => game.audio.resume(), { once: true });

// akses debug di console
window.LogiRush = game;
