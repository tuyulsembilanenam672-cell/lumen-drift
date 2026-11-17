// Lumen Drift — light motes and the combo they feed.
// Motes drift in small clusters; touching one banks its value times the
// combo, refills a little lantern charge, and stretches the combo window.
// A hit breaks the combo back to one.

import { FIELD, MOTE, PLAYER } from './config.js';

export function createMotes(rng) {
  return {
    list: [],
    spawnTimer: 0.5,
    combo: 1,
    comboTimer: 0,
    bestCombo: 1,
    rng,
  };
}

export function resetMotes(motes) {
  motes.list.length = 0;
  motes.spawnTimer = 0.5;
  motes.combo = 1;
  motes.comboTimer = 0;
  motes.bestCombo = 1;
}

function spawnCluster(motes) {
  const rng = motes.rng;
  const cx = 60 + rng() * (FIELD.width - 120);
  const cy = 60 + rng() * (FIELD.height - 120);
  const count = MOTE.clusterMin + Math.floor(rng() * (MOTE.clusterMax - MOTE.clusterMin + 1));
  for (let i = 0; i < count; i += 1) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * 46;
    motes.list.push({
      x: Math.max(20, Math.min(FIELD.width - 20, cx + Math.cos(angle) * dist)),
      y: Math.max(20, Math.min(FIELD.height - 20, cy + Math.sin(angle) * dist)),
      phase: rng() * Math.PI * 2,
      vx: (rng() - 0.5) * MOTE.drift,
      vy: (rng() - 0.5) * MOTE.drift,
    });
  }
}

export function updateMotes(motes, dt) {
  motes.spawnTimer -= dt;
  if (motes.spawnTimer <= 0) {
    motes.spawnTimer = MOTE.spawnEvery;
    if (motes.list.length < MOTE.maxOnField) spawnCluster(motes);
  }
  if (motes.comboTimer > 0) {
    motes.comboTimer -= dt;
    if (motes.comboTimer <= 0) motes.combo = 1;
  }
  for (const mote of motes.list) {
    mote.phase += dt * 3;
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    if (mote.x < 16 || mote.x > FIELD.width - 16) mote.vx *= -1;
    if (mote.y < 16 || mote.y > FIELD.height - 16) mote.vy *= -1;
  }
}

// Returns the mote collected at (x, y) within radius, or null.
export function collectMote(motes, x, y, radius) {
  for (let i = 0; i < motes.list.length; i += 1) {
    const mote = motes.list[i];
    const dist = Math.hypot(mote.x - x, mote.y - y);
    if (dist < radius + MOTE.radius + 4) {
      motes.list.splice(i, 1);
      motes.combo = motes.comboTimer > 0 ? Math.min(MOTE.comboMax, motes.combo + 1) : 1;
      motes.comboTimer = MOTE.comboWindow;
      motes.bestCombo = Math.max(motes.bestCombo, motes.combo);
      return { mote, value: MOTE.value * motes.combo, combo: motes.combo };
    }
  }
  return null;
}

export function breakCombo(motes) {
  motes.combo = 1;
  motes.comboTimer = 0;
}

export function moteCharge() {
  return PLAYER.moteCharge;
}
