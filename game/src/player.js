// Lumen Drift — the light-moth the player steers.
// Movement is acceleration with friction so the moth glides; the dash is a
// short burst with brief invulnerability; the lantern burns nearby shades
// while its charge lasts, and bolts fly toward the mouse.

import { FIELD, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    hearts: PLAYER.maxHearts,
    charge: PLAYER.lanternMax,
    aimX: 1,
    aimY: 0,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: 0,
    hurtTimer: 0,
    alive: true,
    wingPhase: 0,
    bolts: [],
  };
}

export function resetPlayer(player) {
  const fresh = createPlayer();
  Object.assign(player, fresh);
  player.bolts.length = 0;
}

export function updatePlayer(player, input, dt, audio, onShoot) {
  if (!player.alive) return;
  player.wingPhase += dt * 14;
  player.fireTimer = Math.max(0, player.fireTimer - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);

  // Aim follows the mouse, in canvas pixels.
  const dx = input.mouseX - player.x;
  const dy = input.mouseY - player.y;
  const aimLen = Math.hypot(dx, dy);
  if (aimLen > 4) {
    player.aimX = dx / aimLen;
    player.aimY = dy / aimLen;
  }

  if (input.dashPressed && player.dashCooldown <= 0) {
    const mx = input.moveX;
    const my = input.moveY;
    const len = Math.hypot(mx, my);
    player.dashX = len > 0 ? mx / len : player.aimX;
    player.dashY = len > 0 ? my / len : player.aimY;
    player.dashTimer = PLAYER.dashTime;
    player.dashCooldown = PLAYER.dashCooldown;
    player.hurtTimer = Math.max(player.hurtTimer, PLAYER.dashInvuln);
    audio.dash();
  }
  input.dashPressed = false;

  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    player.vx = player.dashX * PLAYER.dashSpeed;
    player.vy = player.dashY * PLAYER.dashSpeed;
  } else {
    player.vx += input.moveX * PLAYER.accel * dt;
    player.vy += input.moveY * PLAYER.accel * dt;
    player.vx *= Math.pow(PLAYER.friction, dt * 60);
    player.vy *= Math.pow(PLAYER.friction, dt * 60);
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > PLAYER.maxSpeed) {
      player.vx = (player.vx / speed) * PLAYER.maxSpeed;
      player.vy = (player.vy / speed) * PLAYER.maxSpeed;
    }
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(player.radius, Math.min(FIELD.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(FIELD.height - player.radius, player.y));

  // The lantern drains while it burns, and dies at zero charge.
  if (player.charge > 0) {
    player.charge = Math.max(0, player.charge - PLAYER.lanternDrain * dt);
  }

  if (input.mouseDown && player.fireTimer <= 0) {
    player.fireTimer = PLAYER.fireCooldown;
    player.bolts.push({
      x: player.x + player.aimX * (player.radius + 6),
      y: player.y + player.aimY * (player.radius + 6),
      vx: player.aimX * PLAYER.boltSpeed,
      vy: player.aimY * PLAYER.boltSpeed,
      life: 0.9,
    });
    audio.shoot();
    if (onShoot) onShoot();
  }

  for (let i = player.bolts.length - 1; i >= 0; i -= 1) {
    const bolt = player.bolts[i];
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;
    if (bolt.life <= 0 || bolt.x < -20 || bolt.x > FIELD.width + 20 || bolt.y < -20 || bolt.y > FIELD.height + 20) {
      player.bolts.splice(i, 1);
    }
  }
}

export function hurtPlayer(player, audio) {
  if (player.hurtTimer > 0 || !player.alive) return false;
  player.hearts -= 1;
  player.hurtTimer = PLAYER.hurtInvuln;
  audio.hurt();
  if (player.hearts <= 0) {
    player.alive = false;
  }
  return true;
}

export function lanternOn(player) {
  return player.charge > 0;
}

export function lanternRadius(player) {
  if (!lanternOn(player)) return 0;
  return PLAYER.lanternRadius * (0.55 + 0.45 * (player.charge / PLAYER.lanternMax));
}
