import { describe, expect, it } from 'vitest';
import { completablePhotos } from './dealer';
import { createGame, tileId } from './game';
import { findHint, reduce } from './reducer';
import { makePhotos } from './test-helpers';
import { QUADRANTS } from './types';

describe('findHint', () => {
  it('returns the 4 visible tiles of a completable photo', () => {
    const s = createGame(makePhotos(10), 4);
    const hint = findHint(s);
    expect(hint).not.toBeNull();
    expect(completablePhotos(s)).toContain(hint?.photoId);
    expect(hint?.tileIds).toEqual(QUADRANTS.map((q) => tileId(hint?.photoId as string, q)));
  });

  it('prefers the photo already started in the tray', () => {
    const s0 = createGame(makePhotos(10), 4);
    const options = completablePhotos(s0);
    const last = options[options.length - 1] as string;
    const s1 = reduce(s0, { type: 'PLACE_TILE', gridIndex: s0.grid.indexOf(tileId(last, 'TL')) }).state;
    expect(findHint(s1)?.photoId).toBe(last);
  });

  it('returns null when the game is over', () => {
    let s = createGame(makePhotos(1), 1);
    for (const q of QUADRANTS)
      s = reduce(s, { type: 'PLACE_TILE', gridIndex: s.grid.indexOf(tileId('p0', q)) }).state;
    expect(findHint(s)).toBeNull();
  });
});

describe('HINT action', () => {
  it('increments hintsUsed and emits a hint event', () => {
    const s = createGame(makePhotos(10), 4);
    const { state, events } = reduce(s, { type: 'HINT' });
    expect(state.hintsUsed).toBe(1);
    expect(events).toEqual([{ type: 'hint', ...findHint(s) }]);
    expect(state.moves).toBe(0);
  });

  it('counts hints in the final stats', () => {
    let s = createGame(makePhotos(1), 1, undefined, 0);
    s = reduce(s, { type: 'HINT' }).state;
    let won;
    for (const q of QUADRANTS) {
      const r = reduce(s, { type: 'PLACE_TILE', gridIndex: s.grid.indexOf(tileId('p0', q)), now: 10 });
      s = r.state;
      won = r.events.find((e) => e.type === 'won');
    }
    expect(won).toEqual({ type: 'won', moves: 4, hintsUsed: 1, durationMs: 10 });
  });
});
