// Lumen Drift — everything drawn on the canvas.
// The scene is a dark nebula the lantern pushes back: a radial glow cut
// out of a darkness overlay, then the moth, shades, motes, bolts and
// particles, then the HUD, then whichever screen is showing.

import { FIELD, PALETTE, PLAYER, MOTE, WAVES } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN, lanternRadius } from './world.js';
import { waveProgress } from './waves.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const grad = ctx.createRadialGradient(
    FIELD.width / 2, FIELD.height / 2, 80,
    FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
  );
  grad.addColorStop(0, PALETTE.nebulaMid);
  grad.addColorStop(0.55, PALETTE.nebulaDeep);
  grad.addColorStop(1, PALETTE.background);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Soft nebula blobs, drifting slowly with the clock.
  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 5; i += 1) {
    const bx = FIELD.width * (0.15 + i * 0.18) + Math.sin(world.time * 0.11 + i * 2.1) * 26;
    const by = FIELD.height * (0.25 + ((i * 37) % 50) / 100) + Math.cos(world.time * 0.09 + i) * 18;
    const blob = ctx.createRadialGradient(bx, by, 4, bx, by, 150);
    blob.addColorStop(0, i % 2 ? '#3d5a9e' : '#5a3d9e');
    blob.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = blob;
    ctx.fillRect(bx - 150, by - 150, 300, 300);
  }
  ctx.restore();

  for (const star of world.stars) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(world.time * 1.4 + star.twinkle));
    ctx.globalAlpha = tw * star.depth;
    ctx.fillStyle = PALETTE.star;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawMotes(ctx, world) {
  for (const mote of world.motes.list) {
    const pulse = 1 + 0.25 * Math.sin(mote.phase);
    const r = MOTE.radius * pulse;
    const glow = ctx.createRadialGradient(mote.x, mote.y, 1, mote.x, mote.y, r * 3);
    glow.addColorStop(0, 'rgba(255, 215, 106, 0.55)');
    glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(mote.x - r * 3, mote.y - r * 3, r * 6, r * 6);
    ctx.fillStyle = PALETTE.moteCore;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.mote;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawShades(ctx, world) {
  for (const shade of world.shades) {
    const flash = shade.flash > 0;
    const body = flash ? '#ffffff' : PALETTE[shade.kind === 'wisp' ? 'wisp' : shade.kind === 'brute' ? 'brute' : 'shade'];
    const glow = ctx.createRadialGradient(shade.x, shade.y, 2, shade.x, shade.y, shade.radius * 2.4);
    glow.addColorStop(0, shade.burn ? 'rgba(255, 207, 77, 0.5)' : 'rgba(139, 123, 216, 0.4)');
    glow.addColorStop(1, 'rgba(139, 123, 216, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(shade.x - shade.radius * 2.4, shade.y - shade.radius * 2.4, shade.radius * 4.8, shade.radius * 4.8);
    // Wobbly blob body.
    ctx.fillStyle = body;
    ctx.beginPath();
    const spikes = 8;
    for (let i = 0; i <= spikes; i += 1) {
      const a = (i / spikes) * Math.PI * 2;
      const rr = shade.radius * (1 + 0.16 * Math.sin(a * 3 + shade.wobble * 2));
      const px = shade.x + Math.cos(a) * rr;
      const py = shade.y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Eyes that track the player.
    const dx = world.player.x - shade.x;
    const dy = world.player.y - shade.y;
    const d = Math.hypot(dx, dy) || 1;
    const ex = (dx / d) * shade.radius * 0.22;
    const ey = (dy / d) * shade.radius * 0.22;
    ctx.fillStyle = PALETTE.shadeEye;
    ctx.beginPath();
    ctx.arc(shade.x - shade.radius * 0.34 + ex, shade.y - shade.radius * 0.18 + ey, shade.radius * 0.16, 0, Math.PI * 2);
    ctx.arc(shade.x + shade.radius * 0.34 + ex, shade.y - shade.radius * 0.18 + ey, shade.radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    if (shade.maxHp > 1) {
      const w = shade.radius * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(shade.x - w / 2, shade.y - shade.radius - 10, w, 4);
      ctx.fillStyle = PALETTE.danger;
      ctx.fillRect(shade.x - w / 2, shade.y - shade.radius - 10, w * (shade.hp / shade.maxHp), 4);
    }
  }
}

function drawPlayer(ctx, world) {
  const player = world.player;
  if (!player.alive) return;
  const blink = player.hurtTimer > 0 && Math.floor(world.time * 16) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;

  // Lantern glow around the moth.
  const glowR = lanternRadius(player);
  if (glowR > 0) {
    const glow = ctx.createRadialGradient(player.x, player.y, 6, player.x, player.y, glowR);
    glow.addColorStop(0, 'rgba(255, 207, 77, 0.5)');
    glow.addColorStop(0.6, 'rgba(255, 207, 77, 0.14)');
    glow.addColorStop(1, 'rgba(255, 207, 77, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(player.x - glowR, player.y - glowR, glowR * 2, glowR * 2);
  }

  // Wings: two flapping ellipses behind the body.
  const flap = Math.sin(player.wingPhase) * 0.5;
  ctx.fillStyle = PALETTE.playerWing;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.atan2(player.aimY, player.aimX));
  ctx.beginPath();
  ctx.ellipse(-4, -12 - flap * 4, 12, 6 + flap * 3, -0.5, 0, Math.PI * 2);
  ctx.ellipse(-4, 12 + flap * 4, 12, 6 + flap * 3, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body, head lamp and a bright core so the moth reads at a glance.
  ctx.fillStyle = PALETTE.playerBody;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff8e0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.lantern;
  ctx.beginPath();
  ctx.arc(player.x + player.aimX * 8, player.y + player.aimY * 8, 5, 0, Math.PI * 2);
  ctx.fill();

  // Dash cooldown arc.
  if (player.dashCooldown > 0) {
    ctx.strokeStyle = 'rgba(234, 242, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - player.dashCooldown / PLAYER.dashCooldown));
    ctx.stroke();
  }
  ctx.restore();

  // Bolts.
  ctx.fillStyle = PALETTE.bolt;
  for (const bolt of player.bolts) {
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(159, 232, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bolt.x - bolt.vx * 0.02, bolt.y - bolt.vy * 0.02);
    ctx.lineTo(bolt.x, bolt.y);
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const spark of world.particles.sparks) {
    const alpha = Math.max(0, spark.life / spark.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = spark.color;
    if (spark.ring) {
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size + (1 - alpha) * 26, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px system-ui, sans-serif';
  for (const text of world.particles.texts) {
    ctx.globalAlpha = Math.max(0, text.life);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
}

const darkCanvas = document.createElement('canvas');
darkCanvas.width = FIELD.width;
darkCanvas.height = FIELD.height;
const darkCtx = darkCanvas.getContext('2d');

function drawDarkness(ctx, world) {
  if (world.screen !== SCREEN_PLAY && world.screen !== SCREEN_PAUSE) return;
  const player = world.player;
  const glowR = lanternRadius(player);
  // Paint the darkness on an offscreen canvas and punch the lantern hole
  // out of it there: punching the hole on the main canvas would erase the
  // scene underneath the darkness as well as the darkness itself.
  darkCtx.clearRect(0, 0, FIELD.width, FIELD.height);
  darkCtx.fillStyle = 'rgba(4, 5, 12, 0.45)';
  darkCtx.fillRect(0, 0, FIELD.width, FIELD.height);
  if (glowR > 0) {
    darkCtx.globalCompositeOperation = 'destination-out';
    const hole = darkCtx.createRadialGradient(player.x, player.y, 10, player.x, player.y, glowR * 1.9);
    hole.addColorStop(0, 'rgba(0,0,0,1)');
    hole.addColorStop(0.7, 'rgba(0,0,0,0.75)');
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    darkCtx.fillStyle = hole;
    darkCtx.fillRect(player.x - glowR * 1.9, player.y - glowR * 1.9, glowR * 3.8, glowR * 3.8);
    darkCtx.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(darkCanvas, 0, 0);
}

function drawHud(ctx, world) {
  const player = world.player;
  ctx.textAlign = 'left';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(`SCORE ${world.score}`, 16, 30);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, 16, 52);

  ctx.textAlign = 'center';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  const prog = waveProgress(world.waves, world.shades);
  ctx.fillText(`WAVE ${prog.wave}`, FIELD.width / 2, 30);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText(`${prog.remaining} shades left`, FIELD.width / 2, 50);

  // Hearts, top right.
  for (let i = 0; i < PLAYER.maxHearts; i += 1) {
    const cx = FIELD.width - 24 - i * 30;
    const cy = 24;
    ctx.fillStyle = i < player.hearts ? PALETTE.heart : PALETTE.heartEmpty;
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 2, 6, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.lineTo(cx, cy + 11);
    ctx.closePath();
    ctx.fill();
  }

  // Lantern charge bar, bottom left.
  const barW = 180;
  const barH = 12;
  const bx = 16;
  const by = FIELD.height - 28;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, bx - 2, by - 2, barW + 4, barH + 4, 6);
  ctx.fill();
  const frac = player.charge / PLAYER.lanternMax;
  ctx.fillStyle = frac > 0.25 ? PALETTE.lantern : PALETTE.danger;
  if (frac > 0) {
    roundRect(ctx, bx, by, barW * frac, barH, 5);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LANTERN', bx, by - 8);

  // Combo, bottom right.
  if (world.motes.combo > 1 && world.motes.comboTimer > 0) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.mote;
    ctx.fillText(`COMBO x${world.motes.combo}`, FIELD.width - 16, FIELD.height - 16);
  }

  // Controls hint, first seconds of wave 1.
  if (world.waves.wave === 1 && world.time < 6 && world.screen === SCREEN_PLAY) {
    ctx.textAlign = 'center';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('WASD / arrows to fly · mouse to aim · click to shoot · SHIFT to dash · P pause · M mute', FIELD.width / 2, FIELD.height - 48);
  }
}

function panel(ctx, title, lines, accent) {
  const w = 520;
  const h = 120 + lines.length * 30;
  const x = (FIELD.width - w) / 2;
  const y = (FIELD.height - h) / 2;
  ctx.fillStyle = 'rgba(7, 8, 18, 0.88)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(title, FIELD.width / 2, y + 58);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, y + 100 + i * 30);
  });
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(4, 5, 12, 0.45)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.lantern;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('LUMEN DRIFT', FIELD.width / 2, FIELD.height / 2 - 84);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('A lantern-light arcade game — gather motes, keep the glow alive,', FIELD.width / 2, FIELD.height / 2 - 44);
  ctx.fillText('burn back the shades, and survive all ten waves until dawn.', FIELD.width / 2, FIELD.height / 2 - 18);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('WASD / arrows to fly · mouse to aim · click to shoot · SHIFT to dash', FIELD.width / 2, FIELD.height / 2 + 22);
  ctx.fillText('Motes feed your lantern · the glow burns shades · 3 hull hearts', FIELD.width / 2, FIELD.height / 2 + 46);
  const pulse = 0.6 + 0.4 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.mote;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('Press ENTER or click to begin', FIELD.width / 2, FIELD.height / 2 + 96);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Best score: ${world.best}`, FIELD.width / 2, FIELD.height / 2 + 126);
  }
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world);
  drawMotes(ctx, world);
  drawShades(ctx, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawDarkness(ctx, world);
  ctx.restore();

  if (world.screen === SCREEN_PLAY || world.screen === SCREEN_PAUSE) {
    drawHud(ctx, world);
  }
  if (world.screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
  } else if (world.screen === SCREEN_PAUSE) {
    panel(ctx, 'PAUSED', ['Press P to keep flying', `Score ${world.score} · Wave ${world.waves.wave}`], PALETTE.hudDim);
  } else if (world.screen === SCREEN_OVER) {
    panel(ctx, 'THE LIGHT FADES', [
      `Score ${world.score} · Best ${Math.max(world.best, world.score)}`,
      `Waves cleared ${world.waves.wave - 1} · Shades banished ${world.kills} · Best combo x${world.motes.bestCombo}`,
      'Press ENTER or click to fly again',
    ], PALETTE.danger);
  } else if (world.screen === SCREEN_WIN) {
    panel(ctx, 'DAWN BREAKS — YOU WIN', [
      `Score ${world.score} · Best ${Math.max(world.best, world.score)}`,
      `All ten waves survived · Shades banished ${world.kills} · Best combo x${world.motes.bestCombo}`,
      'Press ENTER or click to play again',
    ], PALETTE.safe);
  }
}
