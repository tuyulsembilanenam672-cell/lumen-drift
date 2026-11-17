// Lumen Drift — the shades that hunt the moth.
// Three kinds share one update: they drift toward the player with a wobble,
// take damage from bolts and from the lantern's glow, and burst into motes
// of light when they die.

import { FIELD, SHADE_KINDS, WAVES } from './config.js';
import { lanternOn } from './player.js';

export function createShade(kind, x, y, wave, rng) {
  const def = SHADE_KINDS[kind];
  const speed = def.speed * WAVES.speedScale(wave) * (0.9 + rng() * 0.2);
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: def.radius,
    hp: def.hp + WAVES.hpBonus(wave),
    maxHp: def.hp + WAVES.hpBonus(wave),
    speed,
    score: def.score,
    wobble: rng() * Math.PI * 2,
    wobbleSpeed: 2 + rng() * 2,
    flash: 0,
    burn: 0,
  };
}

function edgeSpawn(wave, rng) {
  const side = Math.floor(rng() * 4);
  const margin = 30;
  if (side === 0) return { x: -margin, y: rng() * FIELD.height };
  if (side === 1) return { x: FIELD.width + margin, y: rng() * FIELD.height };
  if (side === 2) return { x: rng() * FIELD.width, y: -margin };
  return { x: rng() * FIELD.width, y: FIELD.height + margin };
}

export function pickKind(wave, rng) {
  const roll = rng();
  const wisps = WAVES.wispsShare(wave);
  if (wave >= WAVES.brutesFromWave && roll > 0.92) return 'brute';
  if (roll < wisps) return 'wisp';
  return 'shade';
}

export function spawnShade(wave, rng) {
  const pos = edgeSpawn(wave, rng);
  return createShade(pickKind(wave, rng), pos.x, pos.y, wave, rng);
}

export function updateShade(shade, player, dt) {
  shade.flash = Math.max(0, shade.flash - dt * 4);
  shade.wobble += shade.wobbleSpeed * dt;
  const dx = player.x - shade.x;
  const dy = player.y - shade.y;
  const dist = Math.hypot(dx, dy) || 1;
  const wob = Math.sin(shade.wobble) * 0.45;
  const nx = dx / dist;
  const ny = dy / dist;
  // Chase with a sideways wobble so their paths curve instead of beelining.
  const mx = nx - ny * wob;
  const my = ny + nx * wob;
  const mLen = Math.hypot(mx, my) || 1;
  // Shades quicken in the dark: let the lantern die and they close in.
  const darkBoost = lanternOn(player) ? 1 : 1.35;
  shade.vx = (mx / mLen) * shade.speed * darkBoost;
  shade.vy = (my / mLen) * shade.speed * darkBoost;
  shade.x += shade.vx * dt;
  shade.y += shade.vy * dt;
}

export function damageShade(shade, amount) {
  shade.hp -= amount;
  shade.flash = 1;
  return shade.hp <= 0;
}
