import { completablePhotos, dealInto } from './dealer';
import { createRng } from './rng';
import { at } from './util';
import { findBlocks, parseTile, tileId } from './tiles';
import {
  QUADRANTS,
  type Action,
  type GameEvent,
  type GameState,
  type Quadrant,
  type StepResult,
} from './types';

/** Pure reducer: returns a new state and the events the UI should animate. */
export function reduce(prev: GameState, action: Action): StepResult {
  if (prev.finishedAt !== null) return { state: prev, events: [] };
  const state = structuredClone(prev);
  const events: GameEvent[] = [];
  switch (action.type) {
    case 'SWAP':
      if (state.options.mode === 'grid' && swap(state, action.from, action.to, events))
        resolveMatches(state, events, action.now ?? 0);
      break;
    case 'PLACE_TILE':
      if (state.options.mode === 'tray' && place(state, action.gridIndex, events))
        resolveTrayMatch(state, events, action.now ?? 0);
      break;
    case 'RETURN_TILE':
      if (state.options.mode === 'tray') giveBack(state, action.quadrant, events);
      break;
    case 'HINT': {
      const hint = findHint(state);
      if (hint) {
        state.hintsUsed += 1;
        events.push({ type: 'hint', ...hint });
      }
      break;
    }
    default:
      break;
  }
  return events.length ? { state, events } : { state: prev, events };
}

/** FR-6: the 4 tiles of a completable photo (tray mode prefers the photo already started in the tray). */
export function findHint(state: GameState): { photoId: string; tileIds: string[] } | null {
  const options = completablePhotos(state);
  if (!options.length) return null;
  const inTray = (p: string) => QUADRANTS.filter((q) => state.tray[q] === tileId(p, q)).length;
  const best = options.reduce((a, b) => (inTray(b) > inTray(a) ? b : a));
  return { photoId: best, tileIds: QUADRANTS.map((q) => tileId(best, q)) };
}

// ---------- tray mode (Facile) ----------

function place(state: GameState, gridIndex: number, events: GameEvent[]): boolean {
  const id = state.grid[gridIndex];
  if (!id) return false;
  const { quadrant } = parseTile(id);
  const old = state.tray[quadrant];
  state.grid[gridIndex] = null;
  state.tray[quadrant] = id;
  state.moves += 1;
  events.push({ type: 'placed', tileId: id, from: gridIndex, to: quadrant });
  if (old) {
    // Conflict: the old tile goes back to the slot just vacated; the new tile inherits its empty origin.
    state.grid[gridIndex] = old;
    events.push({ type: 'replaced', tileId: old, from: quadrant, to: gridIndex });
  } else {
    state.trayOrigin[quadrant] = gridIndex;
  }
  return true;
}

function giveBack(state: GameState, quadrant: Quadrant, events: GameEvent[]): void {
  const id = state.tray[quadrant];
  if (!id) return;
  const origin = state.trayOrigin[quadrant];
  const target = origin !== null && state.grid[origin] === null ? origin : state.grid.indexOf(null);
  if (target < 0) return;
  state.grid[target] = id;
  state.tray[quadrant] = null;
  state.trayOrigin[quadrant] = null;
  events.push({ type: 'returned', tileId: id, from: quadrant, to: target });
}

function resolveTrayMatch(state: GameState, events: GameEvent[], now: number): void {
  const ids = QUADRANTS.map((q) => state.tray[q]).filter((t): t is string => t !== null);
  if (ids.length !== QUADRANTS.length) return;
  const photos = new Set(ids.map((t) => parseTile(t).photoId));
  if (photos.size !== 1) return;
  const photoId = at([...photos], 0);
  for (const q of QUADRANTS) {
    state.tray[q] = null;
    state.trayOrigin[q] = null;
  }
  state.solved.push(photoId);
  events.push({ type: 'matched', photoId, tileIds: ids, slots: [] });
  refillAndCheck(
    state,
    events,
    state.grid.flatMap((t, i) => (t === null ? [i] : [])),
    now,
  );
}

function refillAndCheck(state: GameState, events: GameEvent[], slots: number[], now: number): void {
  const rng = createRng(state.seed, state.rngState);
  events.push(...dealInto(state, slots, rng));
  state.rngState = rng.state;
  if (state.solved.length === state.photoIds.length) {
    state.finishedAt = now;
    events.push({
      type: 'won',
      moves: state.moves,
      hintsUsed: state.hintsUsed,
      durationMs: now - state.startedAt,
    });
  }
}

/** FR-4.1: swap two slots (or move into an empty one). */
function swap(state: GameState, from: number, to: number, events: GameEvent[]): boolean {
  const n = state.grid.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return false;
  const moved = state.grid[from];
  if (!moved) return false;
  const displaced = state.grid[to] ?? null;
  state.grid[to] = moved;
  state.grid[from] = displaced;
  state.moves += 1;
  events.push({ type: 'swapped', from, to, moved, displaced });
  return true;
}

/** FR-4.3/4.4: discard every natural 2×2 block, refill the vacated slots, check victory. */
function resolveMatches(state: GameState, events: GameEvent[], now: number): void {
  const blocks = findBlocks(state.grid, state.options.columns);
  if (!blocks.length) return;
  const vacated: number[] = [];
  for (const b of blocks) {
    const tileIds = b.slots.map((i) => at(state.grid, i)).filter((t): t is string => t !== null);
    for (const i of b.slots) state.grid[i] = null;
    vacated.push(...b.slots);
    state.solved.push(b.photoId);
    events.push({ type: 'matched', photoId: b.photoId, tileIds, slots: [...b.slots] });
  }
  const otherHoles = state.grid.flatMap((t, i) => (t === null && !vacated.includes(i) ? [i] : []));
  const rng = createRng(state.seed, state.rngState);
  events.push(...dealInto(state, [...vacated, ...otherHoles], rng));
  state.rngState = rng.state;

  if (state.solved.length === state.photoIds.length) {
    state.finishedAt = now;
    events.push({
      type: 'won',
      moves: state.moves,
      hintsUsed: state.hintsUsed,
      durationMs: now - state.startedAt,
    });
  }
}
