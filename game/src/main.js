// Lumen Drift — bootstrap, the game loop, and screen flow.
// The canvas fills the window while the game thinks in a fixed 960x600
// field; Enter or a click starts and restarts, P pauses, M mutes, and
// ?shot=start|play|end&seed=N renders a fixed screenshot scene.

import { FIELD } from './config.js';
import { createWorld, startGame, updateWorld, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';
import { runShot, isShotMode, shotParams } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const ctx = canvas.getContext('2d');

const audio = createAudio();
const input = createInput(canvas);
const world = createWorld(1);
world.best = Number(localStorage.getItem('lumen-drift-best') || 0) || 0;

const events = {
  mote() {
    announce(`Score ${world.score}.`);
  },
  hurt(hearts) {
    announce(hearts > 0 ? `Hit! ${hearts} hull left.` : 'Game over.');
  },
  waveClear(event) {
    announce(`Wave ${event.wave} clear. Bonus ${event.bonus}.`);
  },
  win(score) {
    world.best = Math.max(world.best, score);
    localStorage.setItem('lumen-drift-best', String(world.best));
    announce(`You win! Final score ${score}.`);
  },
  over(score) {
    world.best = Math.max(world.best, score);
    localStorage.setItem('lumen-drift-best', String(world.best));
    announce(`Game over. Final score ${score}.`);
  },
};

function announce(text) {
  statusLine.textContent = text;
}

function resize() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = Math.round(FIELD.width * scale);
  canvas.height = Math.round(FIELD.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function begin() {
  audio.resume();
  audio.startPad();
  audio.click();
  startGame(world, (Math.random() * 1e9) | 0);
  announce('Wave 1. Gather motes, keep the lantern burning.');
}

function togglePause() {
  if (world.screen === SCREEN_PLAY) {
    world.screen = SCREEN_PAUSE;
    announce('Paused.');
  } else if (world.screen === SCREEN_PAUSE) {
    world.screen = SCREEN_PLAY;
    announce('Resumed.');
  }
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    if (world.screen === SCREEN_TITLE || world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) {
      begin();
    }
    return;
  }
  if (event.key === 'p' || event.key === 'P') {
    togglePause();
    return;
  }
  if (event.key === 'm' || event.key === 'M') {
    audio.setMuted(!audio.isMuted());
    announce(audio.isMuted() ? 'Muted.' : 'Sound on.');
  }
});

canvas.addEventListener('mousedown', () => {
  audio.resume();
  if (world.screen === SCREEN_TITLE || world.screen === SCREEN_OVER || world.screen === SCREEN_WIN) {
    begin();
  }
});

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (world.screen === SCREEN_PLAY) {
    updateWorld(world, input.state, dt, audio, events);
  } else if (world.screen === SCREEN_TITLE) {
    world.time += dt;
  }
  render(ctx, world);
  requestAnimationFrame(frame);
}

if (isShotMode()) {
  const { shot, seed } = shotParams();
  audio.setMuted(true);
  runShot(world, input, audio, events, shot, seed);
  resize();
  render(ctx, world);
  // Keep the frame alive so the browser can capture it after load.
  requestAnimationFrame(() => render(ctx, world));
} else {
  requestAnimationFrame(frame);
}
