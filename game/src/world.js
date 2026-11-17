// Lumen Drift — the world: one state object, one update step.
// Screens: title, playing, paused, over, won. The update moves the player,
// shades, motes and particles, resolves every collision, and hands the
// score, wave and screen changes back to main.js through events.

import { FIELD, PLAYER, WAVES } from './config.js';
import { createPlayer, resetPlayer, updatePlayer, hurtPlayer, lanternOn, lanternRadius } from './player.js';
import { updateShade, damageShade } from './enemies.js';

export { lanternOn, lanternRadius };
import { createMotes, resetMotes, updateMotes, collectMote, breakCombo, moteCharge } from './motes.js';
import { createParticles, resetParticles, burst, ring, floatText, updateParticles } from './particles.js';
import { createWaves, resetWaves, updateWaves } from './waves.js';
import { PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_PAUSE = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'won';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(seed) {
  const rng = mulberry32(seed);
  return {
    seed,
    rng,
    screen: SCREEN_TITLE,
    time: 0,
    score: 0,
    best: 0,
    player: createPlayer(),
    shades: [],
    motes: createMotes(rng),
    particles: createParticles(),
    waves: createWaves(rng),
    shake: 0,
    kills: 0,
    motesCollected: 0,
    stars: makeStars(rng),
  };
}

function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < 110; i += 1) {
    stars.push({
      x: rng() * FIELD.width,
      y: rng() * FIELD.height,
      size: 0.6 + rng() * 1.8,
      twinkle: rng() * Math.PI * 2,
      depth: 0.3 + rng() * 0.7,
    });
  }
  return stars;
}

export function resetWorld(world, seed) {
  const rng = mulberry32(seed);
  world.rng = rng;
  world.seed = seed;
  world.time = 0;
  world.score = 0;
  world.shades.length = 0;
  world.kills = 0;
  world.motesCollected = 0;
  world.shake = 0;
  world.stars = makeStars(rng);
  resetPlayer(world.player);
  resetMotes(world.motes);
  world.motes.rng = rng;
  resetParticles(world.particles);
  resetWaves(world.waves);
  world.waves.rng = rng;
  world.screen = SCREEN_PLAY;
}

export function startGame(world, seed) {
  resetWorld(world, seed);
}

export function updateWorld(world, input, dt, audio, events) {
  world.time += dt;
  world.shake = Math.max(0, world.shake - dt * 30);
  if (world.screen !== SCREEN_PLAY) {
    updateParticles(world.particles, dt);
    return;
  }

  const player = world.player;
  const wasAlive = player.alive;

  updatePlayer(player, input, dt, audio, () => events.shotsFired?.());
  updateMotes(world.motes, dt);

  // Motes: collect by touch, bank score times the combo, refill the lantern.
  const got = collectMote(world.motes, player.x, player.y, player.radius);
  if (got) {
    world.score += got.value;
    world.motesCollected += 1;
    player.charge = Math.min(PLAYER.lanternMax, player.charge + moteCharge());
    audio.mote(got.combo);
    burst(world.particles, got.mote.x, got.mote.y, PALETTE.mote, 8, 120);
    floatText(world.particles, got.mote.x, got.mote.y - 12, `+${got.value}`, PALETTE.mote);
    events.mote?.(got);
  }

  // Waves: spawn, then clear when the field is empty.
  const waveEvent = updateWaves(world.waves, world.shades, dt, (wave) => {
    audio.waveStart(wave);
    events.waveStart?.(wave);
  });
  if (waveEvent) {
    if (waveEvent.type === 'clear') {
      world.score += waveEvent.bonus;
      audio.waveClear();
      floatText(world.particles, player.x, player.y - 40, `WAVE ${waveEvent.wave} CLEAR  +${waveEvent.bonus}`, PALETTE.safe);
      if (waveEvent.wave % WAVES.healEveryWaves === 0 && player.hearts < PLAYER.maxHearts) {
        player.hearts += 1;
        floatText(world.particles, player.x, player.y - 64, '+1 HULL', PALETTE.heart);
      }
      events.waveClear?.(waveEvent);
    } else if (waveEvent.type === 'win') {
      world.score += waveEvent.bonus;
      world.screen = SCREEN_WIN;
      audio.win();
      events.win?.(world.score);
      return;
    }
  }

  // Shades: chase, burn in the lantern glow, die to bolts, hurt on touch.
  const glowR = lanternRadius(player);
  for (let i = world.shades.length - 1; i >= 0; i -= 1) {
    const shade = world.shades[i];
    updateShade(shade, player, dt);
    if (lanternOn(player) && glowR > 0) {
      const dist = Math.hypot(shade.x - player.x, shade.y - player.y);
      if (dist < glowR + shade.radius) {
        shade.burn = 1;
        if (damageShade(shade, PLAYER.lanternBurn * dt)) {
          killShade(world, i, shade, audio, events);
          continue;
        }
      } else {
        shade.burn = 0;
      }
    }
    const touchDist = Math.hypot(shade.x - player.x, shade.y - player.y);
    if (touchDist < shade.radius + player.radius - 2 && player.hurtTimer <= 0) {
      if (hurtPlayer(player, audio)) {
        world.shake = 10;
        breakCombo(world.motes);
        burst(world.particles, player.x, player.y, PALETTE.danger, 14, 200);
        events.hurt?.(player.hearts);
        if (!player.alive) {
          world.screen = SCREEN_OVER;
          audio.gameOver();
          events.over?.(world.score);
          return;
        }
      }
    }
  }

  // Bolts: fly, hit the first shade they touch.
  for (let b = player.bolts.length - 1; b >= 0; b -= 1) {
    const bolt = player.bolts[b];
    let hit = false;
    for (let i = world.shades.length - 1; i >= 0; i -= 1) {
      const shade = world.shades[i];
      if (Math.hypot(shade.x - bolt.x, shade.y - bolt.y) < shade.radius + 4) {
        hit = true;
        if (damageShade(shade, PLAYER.boltDamage)) {
          killShade(world, i, shade, audio, events);
        }
        break;
      }
    }
    if (hit) player.bolts.splice(b, 1);
  }

  updateParticles(world.particles, dt);
  if (wasAlive && !player.alive) {
    world.screen = SCREEN_OVER;
  }
}

function killShade(world, index, shade, audio, events) {
  world.shades.splice(index, 1);
  world.kills += 1;
  world.score += shade.score;
  audio.shadePop();
  burst(world.particles, shade.x, shade.y, PALETTE.shade, 16, 180);
  ring(world.particles, shade.x, shade.y, PALETTE.lantern);
  floatText(world.particles, shade.x, shade.y - 14, `+${shade.score}`, PALETTE.hudText);
  events.kill?.(shade);
}
