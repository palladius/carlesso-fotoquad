import { describe, expect, it } from 'vitest';
import { createGame } from './game';
import { reduce } from './reducer';
import { deserialize, serialize } from './serialize';
import { makePhotos } from './test-helpers';

describe('serialize / deserialize', () => {
  it('round-trips a game in progress', () => {
    const s0 = createGame(makePhotos(10), 3);
    const s1 = reduce(s0, { type: 'PLACE_TILE', gridIndex: 0 }).state;
    expect(deserialize(serialize(s1))).toEqual(s1);
  });

  it('a restored game continues identically (RNG state preserved)', () => {
    const s0 = createGame(makePhotos(10), 3);
    const restored = deserialize(serialize(s0));
    expect(restored).not.toBeNull();
    const a = reduce(s0, { type: 'HINT' });
    const b = reduce(restored!, { type: 'HINT' });
    expect(b).toEqual(a);
  });

  it('rejects garbage, wrong versions and inconsistent shapes', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('null')).toBeNull();
    expect(deserialize(JSON.stringify({ version: 99 }))).toBeNull();
    const s = createGame(makePhotos(2), 1);
    expect(deserialize(JSON.stringify({ ...s, grid: 'nope' }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...s, piles: [[1]] }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...s, tray: { TL: null } }))).toBeNull();
    expect(deserialize(JSON.stringify({ ...s, moves: '3' }))).toBeNull();
  });
});
