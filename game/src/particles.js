// Lumen Drift — particles and floating score text.
// Every burst, spark and drifting number on screen comes from here; the
// game spawns them, this module moves and fades them, render.js draws them.

export function createParticles() {
  return { sparks: [], texts: [] };
}

export function resetParticles(particles) {
  particles.sparks.length = 0;
  particles.texts.length = 0;
}

export function burst(particles, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    particles.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

export function ring(particles, x, y, color) {
  particles.sparks.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.35,
    maxLife: 0.35,
    size: 6,
    color,
    ring: true,
  });
}

export function floatText(particles, x, y, text, color) {
  particles.texts.push({ x, y, text, color, life: 1.0 });
}

export function updateParticles(particles, dt) {
  for (let i = particles.sparks.length - 1; i >= 0; i -= 1) {
    const spark = particles.sparks[i];
    spark.life -= dt;
    if (spark.life <= 0) {
      particles.sparks.splice(i, 1);
      continue;
    }
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 0.96;
    spark.vy *= 0.96;
  }
  for (let i = particles.texts.length - 1; i >= 0; i -= 1) {
    const text = particles.texts[i];
    text.life -= dt * 0.8;
    text.y -= 34 * dt;
    if (text.life <= 0) particles.texts.splice(i, 1);
  }
}
