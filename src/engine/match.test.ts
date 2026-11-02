import { describe, expect, it } from 'vitest';
import { completablePhotos } from './dealer';
import { createGame, tileId } from './game';
import { reduce } from './reducer';
import { makePhotos } from './test-helpers';
import { QUADRANTS, type GameEvent, type GameState } from './types';

/** Places the 4 tiles of `photoId` (all must be visible). */
function solvePhoto(s: GameState, photoId: string, now?: number): { state: GameState; events: GameEvent[] } {
  let state = s;
  const events: GameEvent[] = [];
  for (const q of QUADRANTS) {
    const id = tileId(photoId, q);
    if (state.tray[q] === id) continue;
    const r = reduce(state, { type: 'PLACE_TILE', gridIndex: state.grid.indexOf(id), now });
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const pileCount = (s: GameState) => s.piles.reduce((n, p) => n + p.length, 0);

describe('match, discard & refill', () => {
  it('matching 4 quadrants discards them, counts the photo as solved and refills 4 slots', () => {
    const s0 = createGame(makePhotos(10), 5);
    const target = completablePhotos(s0)[0] as string;
    const { state, events } = solvePhoto(s0, target);
    const matched = events.find((e) => e.type === 'matched');
    expect(matched).toEqual({
      type: 'matched',
      photoId: target,
      tileIds: QUADRANTS.map((q) => tileId(target, q)),
    });
    expect(state.solved).toEqual([target]);
    expect(Object.values(state.tray).every((t) => t === null)).toBe(true);
    expect(Object.values(state.trayOrigin).every((t) => t === null)).toBe(true);
    expect(events.filter((e) => e.type === 'dealt')).toHaveLength(4);
    expect(state.grid.every((t) => t !== null)).toBe(true);
    expect(pileCount(state)).toBe(pileCount(s0) - 4);
    expect(state.moves).toBe(4);
    for (const q of QUADRANTS) expect(state.grid).not.toContain(tileId(target, q));
  });

  it('emits matched before dealt events', () => {
    const s0 = createGame(makePhotos(10), 6);
    const { events } = solvePhoto(s0, completablePhotos(s0)[0] as string);
    const types = events.map((e) => e.type);
    expect(types.indexOf('matched')).toBeLessThan(types.indexOf('dealt'));
  });

  it('leaves slots empty once the piles are exhausted', () => {
    let s = createGame(makePhotos(8), 2); // 32 tiles: 30 on grid, 2 in piles
    s = solvePhoto(s, completablePhotos(s)[0] as string).state;
    expect(pileCount(s)).toBe(0);
    expect(s.grid.filter((t) => t === null)).toHaveLength(2);
  });

  it('a full game always ends in victory without ever getting stuck (many seeds)', () => {
    for (const n of [1, 4, 9, 10, 23]) {
      for (let seed = 1; seed <= 60; seed++) {
        let s = createGame(makePhotos(n), seed, undefined, 1000);
        let won: GameEvent | undefined;
        for (let turn = 0; turn < n; turn++) {
          const options = completablePhotos(s);
          expect(options.length, `n=${n} seed=${seed} turn=${turn}`).toBeGreaterThan(0);
          const r = solvePhoto(s, options[0] as string, 5000);
          s = r.state;
          won = r.events.find((e) => e.type === 'won');
        }
        expect(s.solved).toHaveLength(n);
        expect(s.finishedAt).toBe(5000);
        expect(won).toEqual({ type: 'won', moves: s.moves, hintsUsed: 0, durationMs: 4000 });
        expect(s.grid.every((t) => t === null)).toBe(true);
      }
    }
  });

  it('ignores actions after victory', () => {
    let s = createGame(makePhotos(1), 1);
    s = solvePhoto(s, 'p0').state;
    expect(reduce(s, { type: 'HINT' }).events).toEqual([]);
  });
});
