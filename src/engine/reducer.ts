import { dealInto } from './dealer';
import { createRng } from './rng';
import { parseTile } from './tiles';
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
    case 'PLACE_TILE':
      place(state, action.gridIndex, events);
      if (events.length) resolveMatch(state, events, action.now ?? 0);
      break;
    case 'RETURN_TILE':
      giveBack(state, action.quadrant, events);
      break;
    default:
      break;
  }
  return events.length ? { state, events } : { state: prev, events };
}

function place(state: GameState, gridIndex: number, events: GameEvent[]): void {
  const id = state.grid[gridIndex];
  if (!id) return;
  const { quadrant } = parseTile(id);
  const old = state.tray[quadrant];
  state.grid[gridIndex] = null;
  state.tray[quadrant] = id;
  state.moves += 1;
  events.push({ type: 'placed', tileId: id, from: gridIndex, to: quadrant });
  if (old) {
    // Conflict rule (FR-4.2): the old tile goes back to the slot just vacated; the new tile
    // inherits the old tile's (still empty) origin slot.
    state.grid[gridIndex] = old;
    events.push({ type: 'replaced', tileId: old, from: quadrant, to: gridIndex });
  } else {
    state.trayOrigin[quadrant] = gridIndex;
  }
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

/** FR-4.5/4.6: if the tray holds a full photo, discard it, refill empty slots and check victory. */
function resolveMatch(state: GameState, events: GameEvent[], now: number): void {
  const ids = QUADRANTS.map((q) => state.tray[q]);
  if (ids.some((t) => t === null)) return;
  const photos = new Set(ids.map((t) => parseTile(t as string).photoId));
  if (photos.size !== 1) return;
  const [photoId] = photos as Set<string>;

  for (const q of QUADRANTS) {
    state.tray[q] = null;
    state.trayOrigin[q] = null;
  }
  state.solved.push(photoId as string);
  events.push({ type: 'matched', photoId: photoId as string, tileIds: ids as string[] });

  const empty = state.grid.flatMap((t, i) => (t === null ? [i] : []));
  const rng = createRng(state.seed, state.rngState);
  events.push(...dealInto(state, empty, rng));
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
