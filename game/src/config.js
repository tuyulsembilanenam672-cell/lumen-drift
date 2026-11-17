// Lumen Drift — tuning, palette and field constants.
// One place for every number the rest of the game shares, so a balance
// change never means hunting through the update code.

export const FIELD = { width: 960, height: 600 };

export const PALETTE = {
  background: '#070812',
  nebulaDeep: '#141a33',
  nebulaMid: '#1e2a52',
  nebulaGlow: '#2c3f7d',
  star: '#dfe8ff',
  mote: '#ffd76a',
  moteCore: '#fff3c4',
  lantern: '#ffcf4d',
  playerBody: '#ffe9a8',
  playerWing: '#bfe3ff',
  bolt: '#9fe8ff',
  shade: '#8b7bd8',
  shadeEye: '#ff5d73',
  wisp: '#b9a7ff',
  brute: '#6a4fd0',
  heart: '#ff6b81',
  heartEmpty: '#3a3348',
  hudText: '#eaf2ff',
  hudDim: '#8fa3c8',
  danger: '#ff5d73',
  safe: '#7dffb0',
};

export const PLAYER = {
  radius: 14,
  accel: 1500,
  maxSpeed: 320,
  friction: 0.86,
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 1.1,
  dashInvuln: 0.3,
  fireCooldown: 0.22,
  boltSpeed: 560,
  boltDamage: 1,
  boltCost: 0,
  maxHearts: 3,
  hurtInvuln: 1.2,
  lanternMax: 100,
  lanternDrain: 5.0,
  lanternRadius: 120,
  lanternBurn: 4,
  moteCharge: 8,
};

export const MOTE = {
  radius: 7,
  value: 10,
  comboWindow: 2.2,
  comboMax: 8,
  drift: 24,
  clusterMin: 2,
  clusterMax: 4,
  spawnEvery: 2.4,
  maxOnField: 16,
};

export const SHADE_KINDS = {
  wisp: { radius: 11, hp: 1, speed: 185, score: 25, touch: 1, glow: 0.55 },
  shade: { radius: 17, hp: 3, speed: 118, score: 50, touch: 1, glow: 0.8 },
  brute: { radius: 27, hp: 9, speed: 70, score: 150, touch: 1, glow: 1.0 },
};

export const WAVES = {
  // How many shades a wave may field, and how the mix shifts as waves climb.
  budget: (wave) => 8 + wave * 5,
  spawnInterval: (wave) => Math.max(0.3, 1.0 - wave * 0.07),
  speedScale: (wave) => 1 + (wave - 1) * 0.08,
  hpBonus: (wave) => (wave >= 6 ? 1 : 0) + (wave >= 9 ? 1 : 0),
  brutesFromWave: 3,
  wispsShare: (wave) => Math.max(0.15, 0.55 - wave * 0.03),
  clearBonus: (wave) => 100 * wave,
  winWave: 10,
  intermission: 3.0,
  healEveryWaves: 3,
};

export const SHOTS = {
  startSeconds: 5,
  playSeconds: 26,
  endLimitSeconds: 600,
};
