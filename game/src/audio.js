// Lumen Drift — all sound, synthesized live with WebAudio.
// No audio files ship with the game: every effect is an oscillator or a
// burst of filtered noise, and the ambient pad is two detuned sines.

export function createAudio() {
  let context = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (ensure() && context.state === 'suspended') context.resume();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  function startPad() {
    if (!ensure() || padNodes || muted) return;
    const gain = context.createGain();
    gain.gain.value = 0.05;
    gain.connect(master);
    const oscA = context.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 110;
    const oscB = context.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 164.8;
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscA.connect(gain);
    oscB.connect(gain);
    oscA.start();
    oscB.start();
    lfo.start();
    padNodes = { gain, oscA, oscB, lfo };
  }

  function stopPad() {
    if (!padNodes) return;
    try {
      padNodes.oscA.stop();
      padNodes.oscB.stop();
      padNodes.lfo.stop();
    } catch {
      // Already stopped; nothing to do.
    }
    padNodes = null;
  }

  return {
    resume,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
      if (muted) stopPad();
      else startPad();
    },
    isMuted() {
      return muted;
    },
    startPad,
    shoot() {
      tone(880, 0.09, 'square', 0.10, 220);
    },
    mote(combo) {
      const step = Math.min(combo, 12);
      tone(520 * Math.pow(2, step / 12), 0.16, 'sine', 0.16);
      tone(780 * Math.pow(2, step / 12), 0.12, 'sine', 0.08);
    },
    shadePop() {
      tone(300, 0.18, 'triangle', 0.16, 60);
      noise(0.12, 0.10, 900);
    },
    hurt() {
      tone(160, 0.3, 'sawtooth', 0.2, 50);
      noise(0.2, 0.14, 500);
    },
    dash() {
      noise(0.18, 0.12, 2400);
    },
    waveStart(wave) {
      tone(220 + wave * 12, 0.35, 'triangle', 0.14, 440 + wave * 12);
    },
    waveClear() {
      [523, 659, 784].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.22, 'sine', 0.14), i * 90);
      });
    },
    gameOver() {
      [392, 311, 233, 175].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.4, 'triangle', 0.14), i * 180);
      });
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.3, 'sine', 0.14), i * 110);
      });
    },
    click() {
      tone(660, 0.06, 'sine', 0.1);
    },
  };
}
