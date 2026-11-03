import { describe, expect, it } from 'vitest';
import { completablePhotos } from './dealer';
import { createGame } from './game';
import { reduce } from './reducer';
import { makePhotos, pileCount } from './test-helpers';
import { parseTile, tileId } from './tiles';
import {
  DEFAULT_OPTIONS,
  QUADRANTS,
  UNLIMITED,
  type GameEvent,
  type GameState,
  type Quadrant,
} from './types';

const TRAY = { ...DEFAULT_OPTIONS, mode: 'tray' as const, maxCompletable: UNLIMITED };
const setup = (n = 10, seed = 11): GameState => createGame(makePhotos(n), seed, TRAY);

function findSlot(s: GameState, q: Quadrant, notPhoto?: string): number {
  return s.grid.findIndex((t) => t && parseTile(t).quadrant === q && parseTile(t).photoId !== notPhoto);
}

/** Taps the 4 tiles of a photo into the tray. */
function solveInTray(s: GameState, photoId: string, now?: number) {
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

describe('tray mode (Facile)', () => {
  it('PLACE_TILE moves a tile to the tray slot of its quadrant', () => {
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

  it('a conflicting tile replaces the old one, which returns to the vacated slot', () => {
    const s0 = setup();
    const a = findSlot(s0, 'BL');
    const oldId = s0.grid[a] as string;
    const s1 = reduce(s0, { type: 'PLACE_TILE', gridIndex: a }).state;
    const b = findSlot(s1, 'BL', parseTile(oldId).photoId);
    const newId = s1.grid[b] as string;
    const { state, events } = reduce(s1, { type: 'PLACE_TILE', gridIndex: b });
    expect(state.tray.BL).toBe(newId);
    expect(state.grid[b]).toBe(oldId);
    expect(state.trayOrigin.BL).toBe(a);
    expect(events[1]).toEqual({ type: 'replaced', tileId: oldId, from: 'BL', to: b });
  });

  it('RETURN_TILE sends a tray tile back to its origin', () => {
    const s0 = setup();
    const i = findSlot(s0, 'BR');
    const id = s0.grid[i] as string;
    const s1 = reduce(s0, { type: 'PLACE_TILE', gridIndex: i }).state;
    const { state, events } = reduce(s1, { type: 'RETURN_TILE', quadrant: 'BR' });
    expect(state.grid[i]).toBe(id);
    expect(state.tray.BR).toBeNull();
    expect(events).toEqual([{ type: 'returned', tileId: id, from: 'BR', to: i }]);
    expect(reduce(state, { type: 'RETURN_TILE', quadrant: 'BR' }).events).toEqual([]);
  });

  it('4 quadrants in the tray are a match: discarded, refilled, counted', () => {
    const s0 = setup();
    const target = completablePhotos(s0)[0] as string;
    const { state, events } = solveInTray(s0, target);
    expect(events.find((e) => e.type === 'matched')).toMatchObject({ photoId: target, slots: [] });
    expect(state.solved).toEqual([target]);
    expect(Object.values(state.tray).every((t) => t === null)).toBe(true);
    expect(state.grid.every((t) => t !== null)).toBe(true);
    expect(pileCount(state)).toBe(pileCount(s0) - 4);
  });

  it('full tray-mode games always end in victory', () => {
    for (const n of [1, 3, 10, 17]) {
      for (let seed = 1; seed <= 30; seed++) {
        let s = setup(n, seed);
        for (let turn = 0; turn < n; turn++) {
          const p = completablePhotos(s)[0];
          expect(p, `n=${n} seed=${seed}`).toBeDefined();
          s = solveInTray(s, p as string, 9).state;
        }
        expect(s.finishedAt).toBe(9);
      }
    }
  });

  it('grid actions are ignored in tray mode and vice versa', () => {
    expect(reduce(setup(), { type: 'SWAP', from: 0, to: 1 }).events).toEqual([]);
    const g = createGame(makePhotos(10), 1);
    expect(reduce(g, { type: 'PLACE_TILE', gridIndex: 0 }).events).toEqual([]);
    expect(reduce(g, { type: 'RETURN_TILE', quadrant: 'TL' }).events).toEqual([]);
  });

  it('hint prefers the photo already started in the tray', () => {
    const s0 = setup(8, 4);
    const options = completablePhotos(s0);
    expect(options.length).toBeGreaterThan(1); // unlimited difficulty: several photos are doable
    const last = options[options.length - 1] as string;
    const s1 = reduce(s0, { type: 'PLACE_TILE', gridIndex: s0.grid.indexOf(tileId(last, 'TL')) }).state;
    expect(reduce(s1, { type: 'HINT' }).events[0]).toMatchObject({ type: 'hint', photoId: last });
  });
});
