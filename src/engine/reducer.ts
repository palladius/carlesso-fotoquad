import { parseTile } from './tiles';
import type { Action, GameEvent, GameState, Quadrant, StepResult } from './types';

/** Pure reducer: returns a new state and the events the UI should animate. */
export function reduce(prev: GameState, action: Action): StepResult {
  if (prev.finishedAt !== null) return { state: prev, events: [] };
  const state = structuredClone(prev);
  const events: GameEvent[] = [];
  switch (action.type) {
    case 'PLACE_TILE':
      place(state, action.gridIndex, events);
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
