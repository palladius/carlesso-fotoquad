import { describe, expect, it } from 'vitest';
import { createRng, shuffle } from './rng';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toEqual(b.next());
  });

  it('returns floats in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) returns integers in [0, n)', () => {
    const r = createRng(9);
    for (let i = 0; i < 500; i++) {
      const v = r.int(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('exposes and restores its internal state', () => {
    const r = createRng(123);
    r.next();
    const saved = r.state;
    const expected = r.next();
    const restored = createRng(0, saved);
    expect(restored.next()).toEqual(expected);
  });
});

describe('shuffle', () => {
  it('is reproducible with the same seed and keeps all elements', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const s1 = shuffle(input, createRng(5));
    const s2 = shuffle(input, createRng(5));
    expect(s1).toEqual(s2);
    expect([...s1].sort((x, y) => x - y)).toEqual(input);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3, 4];
    shuffle(input, createRng(1));
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it('actually changes the order for a non-trivial array', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(input, createRng(5))).not.toEqual(input);
  });
});
