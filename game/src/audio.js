// Sound, synthesized with WebAudio — no audio files. A tiny synth: short blips for
// pickups, a two-note chime for the vault, a rising siren while the alarm climbs, a
// low sting for being caught and a little arpeggio for the getaway. Audio starts on
// the first user gesture, as browsers require.
export function createAudio() {
  let context = null;
  let master = null;
  let siren = null;
  let sirenGain = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.4;
      master.connect(context.destination);
      // The alarm siren: a quiet oscillator whose pitch follows the alarm level.
      siren = context.createOscillator();
      siren.type = 'sawtooth';
      siren.frequency.value = 220;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      siren.connect(sirenGain);
      sirenGain.connect(master);
      siren.start();
      return true;
    } catch {
      context = null;
      return false;
    }
  }

  /** Call from any user gesture so the browser unlocks audio. */
  function unlock() {
    if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
  }

  function tone(freq, seconds, type, volume, when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.4;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** A gem picked up: a bright two-note tick. */
    pickup() {
      tone(880, 0.09, 'sine', 0.25);
      tone(1318, 0.12, 'sine', 0.2, 0.07);
    },
    /** The Star Sapphire: a rising chime. */
    vault() {
      tone(523, 0.14, 'triangle', 0.3);
      tone(659, 0.14, 'triangle', 0.3, 0.1);
      tone(784, 0.2, 'triangle', 0.3, 0.2);
      tone(1046, 0.3, 'triangle', 0.3, 0.3);
    },
    /** A coin thrown: a metallic clink. */
    coin() {
      tone(1568, 0.07, 'square', 0.12);
      tone(2093, 0.1, 'square', 0.1, 0.05);
    },
    /** The jammer firing: a quick downward zap. */
    jammer() {
      tone(1200, 0.18, 'sawtooth', 0.15);
      tone(300, 0.22, 'sawtooth', 0.15, 0.05);
    },
    /** First spotted: a short warning blip. */
    spotted() {
      tone(440, 0.12, 'square', 0.2);
      tone(440, 0.12, 'square', 0.2, 0.16);
    },
    /** Caught: a low falling sting. */
    caught() {
      tone(220, 0.5, 'sawtooth', 0.3);
      tone(110, 0.7, 'sawtooth', 0.3, 0.15);
    },
    /** The getaway: a short rising arpeggio. */
    win() {
      [523, 659, 784, 1046, 1318].forEach((freq, index) => tone(freq, 0.22, 'triangle', 0.28, index * 0.11));
    },
    /** Follow the alarm: the siren grows louder and higher as the alarm climbs. */
    setAlarm(level) {
      if (!ensure() || muted) return;
      const target = level > 8 ? 0.02 + (level / 100) * 0.06 : 0;
      sirenGain.gain.setTargetAtTime(target, context.currentTime, 0.1);
      siren.frequency.setTargetAtTime(220 + level * 3.2, context.currentTime, 0.1);
    },
  };
}
