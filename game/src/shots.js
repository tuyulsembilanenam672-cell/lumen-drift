// Lumen Drift — the screenshot scenes behind ?shot=start|play|end.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot (chase the nearest mote,
// keep clear of shades, fire at the nearest shade in range), so the frame
// is what a short game really looks like and the same seed always gives
// the same frame. The end scene's pilot looks only a moment ahead, so it
// is caught out once the shades speed up, as a hurried player is.

import { FIELD, PLAYER, SHOTS } from './config.js';
import { createWorld, startGame, updateWorld, SCREEN_TITLE, SCREEN_OVER, SCREEN_WIN } from './world.js';

const SAMPLE = 1 / 30;
const START_SECONDS = SHOTS.startSeconds;
const PLAY_SECONDS = SHOTS.playSeconds;
const END_LIMIT_SECONDS = SHOTS.endLimitSeconds;
// How far ahead, in seconds, the autopilot checks each way it could move.
const HORIZON_PLAY = 0.9;
const HORIZON_END = 0.3;
const DANGER_RADIUS = 130;

function nearestMote(world) {
  let best = null;
  let bestDist = Infinity;
  for (const mote of world.motes.list) {
    const d = Math.hypot(mote.x - world.player.x, mote.y - world.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = mote;
    }
  }
  return best;
}

function nearestShade(world) {
  let best = null;
  let bestDist = Infinity;
  for (const shade of world.shades) {
    const d = Math.hypot(shade.x - world.player.x, shade.y - world.player.y);
    if (d < bestDist) {
      bestDist = d;
      best = shade;
    }
  }
  return best;
}

// Seconds until the player, moving in (mx, my), is touched by a shade.
function timeToHit(world, mx, my, horizon) {
  const player = world.player;
  const speed = PLAYER.maxSpeed;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + mx * speed * t));
    const y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + my * speed * t));
    for (const shade of world.shades) {
      const sx = shade.x + shade.vx * t;
      const sy = shade.y + shade.vy * t;
      if (Math.hypot(sx - x, sy - y) < shade.radius + player.radius) return t;
    }
  }
  return Infinity;
}

// Steer toward the nearest mote; if a shade is close, pick the direction
// that is hit last instead. Fire when a shade is inside bolt range.
function autopilot(world, horizon) {
  const player = world.player;
  const shade = nearestShade(world);
  const mote = nearestMote(world);
  let tx = FIELD.width / 2;
  let ty = FIELD.height / 2;
  if (mote) {
    tx = mote.x;
    ty = mote.y;
  }
  let mx = tx - player.x;
  let my = ty - player.y;
  const mLen = Math.hypot(mx, my) || 1;
  mx /= mLen;
  my /= mLen;

  if (shade) {
    const shadeDist = Math.hypot(shade.x - player.x, shade.y - player.y);
    if (shadeDist < DANGER_RADIUS) {
      // Flee: the direction hit last wins.
      const dirs = [
        [0, -1], [0, 1], [-1, 0], [1, 0],
        [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7],
      ];
      let best = dirs[0];
      let bestTime = -1;
      for (const dir of dirs) {
        const t = timeToHit(world, dir[0], dir[1], horizon);
        if (t > bestTime) {
          bestTime = t;
          best = dir;
        }
      }
      mx = best[0];
      my = best[1];
    }
  }
  return { mx, my, shade };
}

function drive(world, input, audio, events, seconds, horizon, stopOnEnd) {
  let elapsed = 0;
  while (elapsed < seconds) {
    if (stopOnEnd && (world.screen === SCREEN_OVER || world.screen === SCREEN_WIN)) break;
    const { mx, my, shade } = autopilot(world, horizon);
    input.state.moveX = mx;
    input.state.moveY = my;
    if (shade) {
      const d = Math.hypot(shade.x - world.player.x, shade.y - world.player.y);
      input.state.mouseX = shade.x;
      input.state.mouseY = shade.y;
      input.state.mouseDown = d < 420;
    } else {
      input.state.mouseDown = false;
    }
    input.state.dashPressed = false;
    updateWorld(world, input.state, SAMPLE, audio, events);
    elapsed += SAMPLE;
  }
}

export function runShot(world, input, audio, events, shot, seed) {
  const fresh = createWorld(seed);
  Object.assign(world, fresh);
  world.screen = SCREEN_TITLE;
  if (shot === 'start') {
    // Title screen over a living, idle field: play a little first so the
    // nebula, motes and a few shades are visible behind the title.
    startGame(world, seed);
    drive(world, input, audio, events, START_SECONDS, HORIZON_PLAY, false);
    world.screen = SCREEN_TITLE;
    return world;
  }
  startGame(world, seed);
  if (shot === 'play') {
    drive(world, input, audio, events, PLAY_SECONDS, HORIZON_PLAY, true);
    return world;
  }
  // end: a short-sighted pilot, until the light fades or the cap is hit.
  drive(world, input, audio, events, END_LIMIT_SECONDS, HORIZON_END, true);
  if (world.screen !== SCREEN_OVER && world.screen !== SCREEN_WIN) {
    // Force the end state the screenshot needs: wear the lantern down and
    // let the shades close in.
    world.player.hearts = 1;
    world.player.charge = 0;
    drive(world, input, audio, events, 30, HORIZON_END, true);
  }
  return world;
}

export function isShotMode() {
  return new URLSearchParams(window.location.search).has('shot');
}

export function shotParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot') || 'play',
    seed: Number(params.get('seed') || 1) || 1,
  };
}

