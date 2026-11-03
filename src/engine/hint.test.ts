import { describe, expect, it } from 'vitest';
import { completablePhotos } from './dealer';
import { createGame } from './game';
import { findHint, reduce } from './reducer';
import { makePhotos, playToEnd } from './test-helpers';
import { tileId } from './tiles';
import { QUADRANTS } from './types';

describe('findHint', () => {
  it('returns the 4 tiles of a completable photo', () => {
    const s = createGame(makePhotos(10), 4);
    const hint = findHint(s);
    expect(completablePhotos(s)).toContain(hint?.photoId);
    expect(hint?.tileIds).toEqual(QUADRANTS.map((q) => tileId(hint?.photoId as string, q)));
  });

  it('returns null when the game is over', () => {
    expect(findHint(playToEnd(createGame(makePhotos(1), 1)).state)).toBeNull();
  });
});

describe('HINT action', () => {
  it('increments hintsUsed and emits a hint event without counting a move', () => {
    const s = createGame(makePhotos(10), 4);
    const { state, events } = reduce(s, { type: 'HINT' });
    expect(state.hintsUsed).toBe(1);
    expect(state.moves).toBe(0);
    expect(events).toEqual([{ type: 'hint', ...findHint(s) }]);
  });

  it('counts hints in the final stats', () => {
    let s = createGame(makePhotos(1), 1, undefined, 0);
    s = reduce(s, { type: 'HINT' }).state;
    const { events } = playToEnd(s, 10);
    expect(events.at(-1)).toMatchObject({ type: 'won', hintsUsed: 1, durationMs: 10 });
  });
});
