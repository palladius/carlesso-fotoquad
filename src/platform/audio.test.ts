import { describe, expect, it, vi } from 'vitest';
import { createAudio } from './audio';

function fakeContext() {
  const osc = () => ({
    type: '',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  const gain = () => ({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  });
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    destination: {},
    resume: vi.fn(function (this: { state: string }) {
      this.state = 'running';
      return Promise.resolve();
    }),
    createOscillator: vi.fn(osc),
    createGain: vi.fn(gain),
  };
  return ctx;
}

describe('audio', () => {
  it('does nothing until unlocked by a user gesture', () => {
    const ctx = fakeContext();
    const audio = createAudio(() => ctx as unknown as AudioContext);
    audio.play('tap');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    audio.unlock();
    expect(ctx.resume).toHaveBeenCalled();
    audio.play('tap');
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('plays every sound kind without throwing', () => {
    const ctx = fakeContext();
    const audio = createAudio(() => ctx as unknown as AudioContext);
    audio.unlock();
    for (const k of ['tap', 'land', 'match', 'victory', 'deal'] as const) audio.play(k);
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(5);
  });

  it('mute suppresses playback', () => {
    const ctx = fakeContext();
    const audio = createAudio(() => ctx as unknown as AudioContext);
    audio.unlock();
    audio.setMuted(true);
    expect(audio.muted).toBe(true);
    audio.play('match');
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });

  it('degrades gracefully without Web Audio support', () => {
    const audio = createAudio(() => {
      throw new Error('unsupported');
    });
    expect(() => {
      audio.unlock();
      audio.play('tap');
    }).not.toThrow();
  });
});
