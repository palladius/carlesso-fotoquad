import { describe, expect, it } from 'vitest';
import { completablePhotos, dealInto, hasNaturalAdjacency } from './dealer';
import { createGame, tileId } from './game';
import { createRng } from './rng';
import { makePhotos } from './test-helpers';
import type { GameState } from './types';

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

describe('hasNaturalAdjacency', () => {
  it('detects a photo laid out as its natural 2×2 block', () => {
    const grid = Array<string | null>(10).fill(null);
    grid[1] = tileId('a', 'TL');
    grid[2] = tileId('a', 'TR');
    grid[6] = tileId('a', 'BL');
    grid[7] = tileId('a', 'BR');
    expect(hasNaturalAdjacency(grid, 5)).toBe(true);
  });

  it('ignores blocks that wrap across rows', () => {
    const grid = Array<string | null>(15).fill(null);
    grid[4] = tileId('a', 'TL');
    grid[5] = tileId('a', 'TR');
    grid[9] = tileId('a', 'BL');
    grid[10] = tileId('a', 'BR');
    expect(hasNaturalAdjacency(grid, 5)).toBe(false);
  });

  it('returns false for a scrambled layout', () => {
    const grid = [
      tileId('a', 'TR'),
      tileId('a', 'TL'),
      null,
      null,
      null,
      tileId('a', 'BR'),
      tileId('a', 'BL'),
    ];
    expect(hasNaturalAdjacency(grid, 5)).toBe(false);
  });
});

describe('initial deal (property tests)', () => {
  for (const n of [1, 3, 7, 8, 10, 25, 60]) {
    it(`always has a completable photo and no trivial 2×2 block — ${n} photos`, () => {
      for (const seed of SEEDS) {
        const g = createGame(makePhotos(n), seed);
        expect(completablePhotos(g).length, `seed ${seed}`).toBeGreaterThan(0);
        if (n > 1) expect(hasNaturalAdjacency(g.grid, 5), `seed ${seed}`).toBe(false);
      }
    });
  }
});

describe('dealInto', () => {
  function emptySlots(g: GameState, idx: number[]): GameState {
    // simulate 4 tiles removed from the board and lost (not in piles): use a fresh state copy
    const s = structuredClone(g);
    for (const i of idx) s.grid[i] = null;
    return s;
  }

  it('fills the requested slots from the piles and emits dealt events', () => {
    const g = createGame(makePhotos(20), 3);
    const before = g.piles.flat().length;
    const s = emptySlots(g, [0, 1, 2, 3]);
    // put the removed tiles back on top of piles so the game stays consistent
    g.grid.slice(0, 4).forEach((t, i) => s.piles[i % 5]?.push(t as string));
    const events = dealInto(s, [0, 1, 2, 3], createRng(1));
    expect(events).toHaveLength(4);
    expect(s.grid.slice(0, 4).every((t) => t !== null)).toBe(true);
    expect(s.piles.flat().length).toBe(before);
    for (const e of events) expect(e.type).toBe('dealt');
  });

  it('leaves slots empty when piles are exhausted', () => {
    const g = createGame(makePhotos(3), 1);
    const s = structuredClone(g);
    const [a, b] = s.grid.flatMap((t, i) => (t ? [i] : [])) as [number, number];
    const removed = s.grid[a] as string;
    s.grid[a] = null;
    s.grid[b] = null;
    s.piles[0] = [removed];
    const events = dealInto(s, [a, b], createRng(2));
    expect(events).toHaveLength(1);
    expect(s.piles.flat()).toHaveLength(0);
    expect(s.grid.filter((t) => t === null)).toHaveLength(4); // 3 original empties + 1
  });
});
