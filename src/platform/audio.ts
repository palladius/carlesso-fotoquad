export type Sound = 'tap' | 'land' | 'match' | 'victory' | 'deal';

export interface GameAudio {
  /** Must be called from a user gesture (autoplay policies). */
  unlock(): void;
  play(sound: Sound): void;
  setMuted(muted: boolean): void;
  readonly muted: boolean;
}

interface Note {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
}

/** Synthesised SFX — no audio files needed (FR-9). */
const SOUNDS: Record<Sound, Note[]> = {
  tap: [{ freq: 660, at: 0, dur: 0.06, type: 'triangle', vol: 0.15, slideTo: 440 }],
  land: [{ freq: 220, at: 0, dur: 0.08, type: 'sine', vol: 0.2, slideTo: 120 }],
  deal: [{ freq: 900, at: 0, dur: 0.04, type: 'square', vol: 0.04, slideTo: 500 }],
  // C major arpeggio, harp-like
  match: [523.25, 659.25, 783.99, 1046.5].map((freq, i) => ({ freq, at: i * 0.08, dur: 0.5, vol: 0.18 })),
  // 8-bit victory fanfare
  victory: (
    [
      [523.25, 0],
      [523.25, 0.12],
      [523.25, 0.24],
      [659.25, 0.36],
      [783.99, 0.6],
      [659.25, 0.78],
      [783.99, 0.9],
      [1046.5, 1.1],
    ] as const
  ).map(([freq, at], i): Note => ({ freq, at, dur: i === 7 ? 0.8 : 0.16, type: 'square', vol: 0.08 })),
};

export function createAudio(factory: () => AudioContext = () => new AudioContext()): GameAudio {
  let ctx: AudioContext | null = null;
  let muted = false;

  const tone = (c: AudioContext, n: Note) => {
    const t0 = c.currentTime + n.at;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, t0);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, t0 + n.dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(n.vol ?? 0.15, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.02);
  };

  return {
    unlock() {
      try {
        ctx ??= factory();
        if (ctx.state === 'suspended') void ctx.resume();
      } catch {
        ctx = null;
      }
    },
    play(sound) {
      if (muted || !ctx || ctx.state !== 'running') return;
      for (const n of SOUNDS[sound]) tone(ctx, n);
    },
    setMuted(m) {
      muted = m;
    },
    get muted() {
      return muted;
    },
  };
}
