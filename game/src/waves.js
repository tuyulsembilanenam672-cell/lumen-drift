// Lumen Drift — the wave director.
// A wave fields a budget of shades on a timer; when every shade of the
// wave is spawned and dead, the wave clears, pays a bonus, and the next
// wave starts after a short intermission. Clearing wave 10 wins the game.

import { WAVES } from './config.js';
import { spawnShade } from './enemies.js';

export function createWaves(rng) {
  return {
    wave: 1,
    toSpawn: 0,
    spawnTimer: 0,
    intermission: 1.2,
    active: false,
    rng,
  };
}

export function resetWaves(waves) {
  waves.wave = 1;
  waves.toSpawn = 0;
  waves.spawnTimer = 0;
  waves.intermission = 1.2;
  waves.active = false;
}

export function startWave(waves) {
  waves.toSpawn = WAVES.budget(waves.wave);
  waves.spawnTimer = 0.4;
  waves.active = true;
}

export function updateWaves(waves, shades, dt, onWaveStart) {
  if (!waves.active) {
    waves.intermission -= dt;
    if (waves.intermission <= 0) {
      startWave(waves);
      if (onWaveStart) onWaveStart(waves.wave);
    }
    return null;
  }
  if (waves.toSpawn > 0) {
    waves.spawnTimer -= dt;
    if (waves.spawnTimer <= 0) {
      waves.spawnTimer = WAVES.spawnInterval(waves.wave);
      waves.toSpawn -= 1;
      shades.push(spawnShade(waves.wave, waves.rng));
    }
    return null;
  }
  if (shades.length === 0) {
    const cleared = waves.wave;
    const bonus = WAVES.clearBonus(cleared);
    waves.active = false;
    waves.intermission = WAVES.intermission;
    if (cleared >= WAVES.winWave) {
      return { type: 'win', wave: cleared, bonus };
    }
    waves.wave += 1;
    return { type: 'clear', wave: cleared, bonus };
  }
  return null;
}

export function waveProgress(waves, shades) {
  const total = WAVES.budget(waves.wave);
  const remaining = waves.toSpawn + shades.length;
  return { wave: waves.wave, remaining, total };
}
