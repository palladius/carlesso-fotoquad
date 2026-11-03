import { completablePhotos } from './dealer';
import { reduce } from './reducer';
import { tileId } from './tiles';
import { QUADRANTS, type GameEvent, type GameState } from './types';
import type { Photo } from './types';

export function makePhotos(n: number, tags: string[] = []): Photo[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    src: `photos/p${i}.jpg`,
    title: `Photo ${i}`,
    tags,
  }));
}

export const pileCount = (s: GameState): number => s.piles.reduce((n, p) => n + p.length, 0);

/**
 * Bot: drags the 4 tiles of a completable photo into a 2×2 block at the top-left corner using swaps.
 * Returns the new state and all events; stops early if any match happens.
 */
export function assemble(
  s: GameState,
  photoId: string,
  now?: number,
): { state: GameState; events: GameEvent[] } {
  const cols = s.options.columns;
  const targets = [0, 1, cols, cols + 1];
  let state = s;
  const events: GameEvent[] = [];
  for (let k = 0; k < 4; k++) {
    const id = tileId(photoId, QUADRANTS[k] as (typeof QUADRANTS)[number]);
    const from = state.grid.indexOf(id);
    const to = targets[k] as number;
    if (from === to) continue;
    const r = reduce(state, { type: 'SWAP', from, to, now });
    state = r.state;
    events.push(...r.events);
    if (r.events.some((e) => e.type === 'matched')) break;
  }
  return { state, events };
}

/** Plays a whole game with the bot; returns the final state and every event. */
export function playToEnd(
  s: GameState,
  now?: number,
  maxTurns = 500,
): { state: GameState; events: GameEvent[] } {
  let state = s;
  const events: GameEvent[] = [];
  for (let turn = 0; turn < maxTurns && state.finishedAt === null; turn++) {
    const target = completablePhotos(state)[0];
    if (!target) throw new Error(`stuck at turn ${turn}`);
    const r = assemble(state, target, now);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}
