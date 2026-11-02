import { describe, expect, it } from 'vitest';
import { createGame, parseTile } from './game';
import { reduce } from './reducer';
import { makePhotos } from './test-helpers';
import type { GameState, Quadrant } from './types';

function setup(): GameState {
  return createGame(makePhotos(10), 11);
}

/** Index of a grid tile with the given quadrant, optionally excluding a photo. */
function findSlot(s: GameState, q: Quadrant, notPhoto?: string): number {
  return s.grid.findIndex((t) => t && parseTile(t).quadrant === q && parseTile(t).photoId !== notPhoto);
}

describe('PLACE_TILE', () => {
  it('moves a grid tile into the tray slot matching its quadrant', () => {
    const s = setup();
    const i = findSlot(s, 'TR');
    const id = s.grid[i] as string;
    const { state, events } = reduce(s, { type: 'PLACE_TILE', gridIndex: i });
    expect(state.tray.TR).toBe(id);
    expect(state.grid[i]).toBeNull();
    expect(state.trayOrigin.TR).toBe(i);
    expect(state.moves).toBe(1);
    expect(events).toEqual([{ type: 'placed', tileId: id, from: i, to: 'TR' }]);
  });

  it('does not mutate the previous state', () => {
    const s = setup();
    const snapshot = structuredClone(s);
    reduce(s, { type: 'PLACE_TILE', gridIndex: findSlot(s, 'TL') });
    expect(s).toEqual(snapshot);
  });

  it('replaces a conflicting tray tile, sending the old one back to the vacated slot', () => {
    const s0 = setup();
    const a = findSlot(s0, 'BL');
    const oldId = s0.grid[a] as string;
    const s1 = reduce(s0, { type: 'PLACE_TILE', gridIndex: a }).state;
    const b = findSlot(s1, 'BL', parseTile(oldId).photoId);
    const newId = s1.grid[b] as string;
    const { state, events } = reduce(s1, { type: 'PLACE_TILE', gridIndex: b });
    expect(state.tray.BL).toBe(newId);
    expect(state.grid[b]).toBe(oldId);
    // the new tile inherits the old tile's empty origin slot
    expect(state.trayOrigin.BL).toBe(a);
    expect(state.grid[a]).toBeNull();
    expect(state.moves).toBe(2);
    expect(events).toEqual([
      { type: 'placed', tileId: newId, from: b, to: 'BL' },
      { type: 'replaced', tileId: oldId, from: 'BL', to: b },
    ]);
  });

  it('is a no-op on an empty or out-of-range slot', () => {
    const s0 = setup();
    const i = findSlot(s0, 'TL');
    const s1 = reduce(s0, { type: 'PLACE_TILE', gridIndex: i }).state;
    const r = reduce(s1, { type: 'PLACE_TILE', gridIndex: i });
    expect(r.events).toEqual([]);
    expect(r.state.moves).toBe(1);
    expect(reduce(s1, { type: 'PLACE_TILE', gridIndex: 999 }).events).toEqual([]);
  });
});

describe('RETURN_TILE', () => {
  it('sends a tray tile back to its origin slot', () => {
    const s0 = setup();
    const i = findSlot(s0, 'BR');
    const id = s0.grid[i] as string;
    const s1 = reduce(s0, { type: 'PLACE_TILE', gridIndex: i }).state;
    const { state, events } = reduce(s1, { type: 'RETURN_TILE', quadrant: 'BR' });
    expect(state.grid[i]).toBe(id);
    expect(state.tray.BR).toBeNull();
    expect(state.trayOrigin.BR).toBeNull();
    expect(state.moves).toBe(1); // returning is not a placement
    expect(events).toEqual([{ type: 'returned', tileId: id, from: 'BR', to: i }]);
  });

  it('is a no-op for an empty tray slot', () => {
    const s = setup();
    expect(reduce(s, { type: 'RETURN_TILE', quadrant: 'TL' }).events).toEqual([]);
  });
});
