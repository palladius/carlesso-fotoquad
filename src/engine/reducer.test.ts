import { describe, expect, it } from 'vitest';
import { completablePhotos } from './dealer';
import { createGame } from './game';
import { reduce } from './reducer';
import { assemble, makePhotos, pileCount, playToEnd } from './test-helpers';
import { tileId } from './tiles';
import { QUADRANTS, type GameState } from './types';

const setup = (): GameState => createGame(makePhotos(20), 11);

describe('SWAP', () => {
  it('swaps two tiles and counts a move', () => {
    const s = setup();
    const [a, b] = [s.grid[3], s.grid[17]];
    const { state, events } = reduce(s, { type: 'SWAP', from: 3, to: 17 });
    expect(state.grid[3]).toBe(b);
    expect(state.grid[17]).toBe(a);
    expect(state.moves).toBe(1);
    expect(events[0]).toEqual({ type: 'swapped', from: 3, to: 17, moved: a, displaced: b });
  });

  it('moves a tile into an empty slot', () => {
    const s = structuredClone(setup());
    const t = s.grid[5];
    s.grid[9] = null;
    const { state, events } = reduce(s, { type: 'SWAP', from: 5, to: 9 });
    expect(state.grid[9]).toBe(t);
    expect(state.grid[5]).toBeNull();
    expect(events[0]).toMatchObject({ type: 'swapped', displaced: null });
  });

  it('does not mutate the previous state', () => {
    const s = setup();
    const snap = structuredClone(s);
    reduce(s, { type: 'SWAP', from: 0, to: 1 });
    expect(s).toEqual(snap);
  });

  it('ignores invalid swaps', () => {
    const s = structuredClone(setup());
    expect(reduce(s, { type: 'SWAP', from: 2, to: 2 }).events).toEqual([]);
    expect(reduce(s, { type: 'SWAP', from: -1, to: 2 }).events).toEqual([]);
    expect(reduce(s, { type: 'SWAP', from: 2, to: 99 }).events).toEqual([]);
    s.grid[4] = null;
    expect(reduce(s, { type: 'SWAP', from: 4, to: 2 }).events).toEqual([]);
  });
});

describe('match, discard & refill', () => {
  it('a natural 2×2 block is discarded, counted as solved and its slots are refilled', () => {
    const s0 = setup();
    const target = completablePhotos(s0)[0] as string;
    const { state, events } = assemble(s0, target);
    const matched = events.find((e) => e.type === 'matched');
    expect(matched).toEqual({
      type: 'matched',
      photoId: target,
      tileIds: QUADRANTS.map((q) => tileId(target, q)),
      slots: [0, 1, 5, 6],
    });
    expect(state.solved).toEqual([target]);
    const dealt = events.filter((e) => e.type === 'dealt');
    expect(dealt.map((e) => (e as { to: number }).to).sort((a, b) => a - b)).toEqual([0, 1, 5, 6]);
    expect(state.grid.every((t) => t !== null)).toBe(true);
    expect(pileCount(state)).toBe(pileCount(s0) - 4);
    for (const q of QUADRANTS) expect(state.grid).not.toContain(tileId(target, q));
    const types = events.map((e) => e.type);
    expect(types.lastIndexOf('swapped')).toBeLessThan(types.indexOf('matched'));
    expect(types.indexOf('matched')).toBeLessThan(types.indexOf('dealt'));
  });

  it('leaves slots empty once the piles are exhausted', () => {
    let s = createGame(makePhotos(8), 2); // 32 tiles: 30 on the grid, 2 hidden
    s = assemble(s, completablePhotos(s)[0] as string).state;
    expect(pileCount(s)).toBe(0);
    expect(s.grid.filter((t) => t === null)).toHaveLength(2);
  });

  it('full games always end in victory (many seeds and deck sizes)', () => {
    for (const n of [1, 2, 4, 9, 10, 23]) {
      for (let seed = 1; seed <= 40; seed++) {
        const s = createGame(makePhotos(n), seed, undefined, 1000);
        const { state, events } = playToEnd(s, 5000);
        expect(state.solved).toHaveLength(n);
        expect(state.finishedAt).toBe(5000);
        expect(events.at(-1)).toEqual({ type: 'won', moves: state.moves, hintsUsed: 0, durationMs: 4000 });
        expect(state.grid.every((t) => t === null)).toBe(true);
      }
    }
  });

  it('ignores actions after victory', () => {
    const s = playToEnd(createGame(makePhotos(1), 1)).state;
    expect(reduce(s, { type: 'HINT' }).events).toEqual([]);
    expect(reduce(s, { type: 'SWAP', from: 0, to: 1 }).events).toEqual([]);
  });
});
