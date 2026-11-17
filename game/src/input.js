// Lumen Drift — keyboard and mouse input.
// One object holds the whole input state; the game reads it, never the DOM
// events directly, so the autopilot in shots.js can drive the same fields.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    moveX: 0,
    moveY: 0,
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    dashPressed: false,
    anyKeyPressed: false,
  };

  function updateMove() {
    const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
    const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');
    const up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
    const down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
    state.moveX = (right ? 1 : 0) - (left ? 1 : 0);
    state.moveY = (down ? 1 : 0) - (up ? 1 : 0);
    if (state.moveX !== 0 && state.moveY !== 0) {
      const len = Math.hypot(state.moveX, state.moveY);
      state.moveX /= len;
      state.moveY /= len;
    }
  }

  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = event.clientX - rect.left;
    state.mouseY = event.clientY - rect.top;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      state.anyKeyPressed = true;
      if (event.key === 'Shift') state.dashPressed = true;
    }
    keys.add(event.key);
    updateMove();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key);
    updateMove();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    state.mouseDown = false;
    updateMove();
  });

  canvas.addEventListener('mousemove', trackMouse);
  canvas.addEventListener('mousedown', (event) => {
    trackMouse(event);
    if (event.button === 0) state.mouseDown = true;
    if (event.button === 2) state.dashPressed = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) state.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    state,
    consumeDash() {
      const pressed = state.dashPressed;
      state.dashPressed = false;
      return pressed;
    },
    consumeAnyKey() {
      const pressed = state.anyKeyPressed;
      state.anyKeyPressed = false;
      return pressed;
    },
    press(key) {
      keys.add(key);
      state.anyKeyPressed = true;
      updateMove();
    },
    release(key) {
      keys.delete(key);
      updateMove();
    },
    setMouse(x, y, down) {
      state.mouseX = x;
      state.mouseY = y;
      state.mouseDown = down;
    },
  };
}
