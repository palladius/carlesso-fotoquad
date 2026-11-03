import { describe, expect, it } from 'vitest';
import { completablePhotos, dealInto } from './dealer';
import { createGame } from './game';
import { createRng } from './rng';
import { assemble, makePhotos, pileCount } from './test-helpers';
import { findBlocks, tileId } from './tiles';
import { DEFAULT_OPTIONS, type GameState } from './types';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const EASY = { ...DEFAULT_OPTIONS, maxCompletable: 3 };

/** Unavoidable minimum of complete photos: every incomplete photo needs ≥1 tile hidden in the piles. */
function forcedComplete(s: GameState): number {
  const unsolved = s.photoIds.length - s.solved.length;
  return Math.max(unsolved ? 1 : 0, unsolved - pileCount(s));
}

describe('findBlocks', () => {
  it('detects a photo laid out as its natural 2×2 block', () => {
    const grid = Array<string | null>(10).fill(null);
    grid[1] = tileId('a', 'TL');
    grid[2] = tileId('a', 'TR');
    grid[6] = tileId('a', 'BL');
    grid[7] = tileId('a', 'BR');
    expect(findBlocks(grid, 5)).toEqual([{ photoId: 'a', slots: [1, 2, 6, 7] }]);
  });

  it('ignores blocks that wrap across rows and scrambled layouts', () => {
    const grid = Array<string | null>(15).fill(null);
    grid[4] = tileId('a', 'TL');
    grid[5] = tileId('a', 'TR');
    grid[9] = tileId('a', 'BL');
    grid[10] = tileId('a', 'BR');
    expect(findBlocks(grid, 5)).toEqual([]);
    expect(
      findBlocks(
        [tileId('a', 'TR'), tileId('a', 'TL'), null, null, null, tileId('a', 'BR'), tileId('a', 'BL')],
        5,
      ),
    ).toEqual([]);
  });
});

describe('initial deal (property tests)', () => {
  for (const n of [1, 3, 7, 10, 12, 25, 60]) {
    it(`full tableau, completable count within [1, max(1, forced)], no pre-solved block — ${n} photos`, () => {
      for (const seed of SEEDS) {
        const g = createGame(makePhotos(n), seed);
        const c = completablePhotos(g).length;
        expect(c, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        expect(c, `seed ${seed}`).toBeLessThanOrEqual(Math.max(1, forcedComplete(g)));
        expect(findBlocks(g.grid, 5), `seed ${seed}`).toEqual([]);
        if (n * 4 >= 30) expect(g.grid.every((t) => t !== null)).toBe(true);
      }
    });
  }

  for (const [columns, rows] of [
    [8, 4],
    [7, 4],
    [6, 5],
  ] as const) {
    it(`other board shapes (${columns}×${rows}) keep the invariants`, () => {
      for (const seed of SEEDS.slice(0, 80)) {
        const g = createGame(makePhotos(16), seed, { ...DEFAULT_OPTIONS, columns, rows });
        expect(g.grid).toHaveLength(columns * rows);
        expect(completablePhotos(g)).toHaveLength(1);
        expect(findBlocks(g.grid, columns)).toEqual([]);
        let s = g;
        while (s.finishedAt === null) s = assemble(s, completablePhotos(s)[0] as string).state;
        expect(s.solved).toHaveLength(16);
      }
    });
  }

  it('Normale with a big deck shows exactly one completable photo', () => {
    for (const seed of SEEDS) expect(completablePhotos(createGame(makePhotos(25), seed))).toHaveLength(1);
  });

  it('Facile with a big deck shows up to 3 completable photos', () => {
    for (const seed of SEEDS) {
      const c = completablePhotos(createGame(makePhotos(25), seed, EASY)).length;
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(3);
    }
  });
});

describe('refills keep the difficulty invariant through whole games', () => {
  for (const [label, opts] of [
    ['Normale', DEFAULT_OPTIONS],
    ['Facile', EASY],
  ] as const) {
    it(label, () => {
      for (const seed of SEEDS.slice(0, 40)) {
        let s = createGame(makePhotos(20), seed, opts);
        while (s.finishedAt === null) {
          const c = completablePhotos(s).length;
          expect(c).toBeGreaterThanOrEqual(1);
          expect(c).toBeLessThanOrEqual(Math.max(opts.maxCompletable, forcedComplete(s)));
          expect(findBlocks(s.grid, 5)).toEqual([]);
          s = assemble(s, completablePhotos(s)[0] as string).state;
        }
      }
    });
  }
});

describe('dealInto', () => {
  it('fills the requested slots from the piles and emits dealt events', () => {
    const g = createGame(makePhotos(20), 3);
    const s = structuredClone(g);
    const removed = s.grid.slice(0, 4) as string[];
    for (let i = 0; i < 4; i++) s.grid[i] = null;
    removed.forEach((t, i) => s.piles[i % 5]?.push(t));
    const before = pileCount(s);
    const events = dealInto(s, [0, 1, 2, 3], createRng(1));
    expect(events).toHaveLength(4);
    expect(s.grid.slice(0, 4).every((t) => t !== null)).toBe(true);
    expect(pileCount(s)).toBe(before - 4);
    for (const e of events) expect(e.type).toBe('dealt');
  });

  it('leaves slots empty when piles are exhausted', () => {
    const g = createGame(makePhotos(3), 1);
    const s = structuredClone(g);
    const [a, b] = s.grid.flatMap((t, i) => (t ? [i] : [])) as [number, number];
    const removed = s.grid[a] as string;
    s.grid[a] = null;
    s.grid[b] = null;
    s.piles = [[removed], [], [], [], []];
    const events = dealInto(s, [a, b], createRng(2));
    expect(events).toHaveLength(1);
    expect(pileCount(s)).toBe(0);
  });
});
