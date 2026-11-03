import type { Rng } from './rng';
import { shuffle } from './rng';
import { findBlocks, parseTile, tileId, visibleTiles } from './tiles';
import { QUADRANTS, UNLIMITED, type GameEvent, type GameState, type TileId } from './types';

/** Unsolved photos whose 4 quadrants are all on the tableau. */
export function completablePhotos(state: GameState): string[] {
  const visible = new Set(visibleTiles(state));
  return unsolved(state).filter((p) => QUADRANTS.every((q) => visible.has(tileId(p, q))));
}

function unsolved(state: GameState): string[] {
  const solved = new Set(state.solved);
  return state.photoIds.filter((p) => !solved.has(p));
}

/** True if any photo already sits as its natural 2×2 block. */
export function hasNaturalAdjacency(grid: readonly (TileId | null)[], columns: number): boolean {
  return findBlocks(grid, columns).length > 0;
}

interface Pick {
  pile: number;
  index: number;
}

/** Positions of the next `k` cards, always drawn from the tallest pile (ties → lowest index). */
function planDraws(piles: readonly TileId[][], k: number): Pick[] {
  const heights = piles.map((p) => p.length);
  const picks: Pick[] = [];
  for (let n = 0; n < k; n++) {
    let best = -1;
    for (let p = 0; p < heights.length; p++) {
      if ((heights[p] ?? 0) > 0 && (best < 0 || (heights[p] ?? 0) > (heights[best] ?? 0))) best = p;
    }
    if (best < 0) break;
    heights[best] = (heights[best] ?? 0) - 1;
    picks.push({ pile: best, index: heights[best] ?? 0 });
  }
  return picks;
}

/**
 * Chooses which `k` hidden tiles to reveal so that the tableau holds at least 1 and (when possible) at most
 * `maxCompletable` completable photos (FR-5).
 */
function chooseDraw(state: GameState, k: number, rng: Rng): TileId[] {
  const pool = shuffle(state.piles.flat(), rng);
  if (k >= pool.length) return pool;
  const count = new Map<string, number>();
  for (const p of unsolved(state)) count.set(p, 0);
  for (const t of visibleTiles(state)) {
    const p = parseTile(t).photoId;
    if (count.has(p)) count.set(p, (count.get(p) ?? 0) + 1);
  }
  const chosen = new Set<TileId>();
  const take = (t: TileId) => {
    chosen.add(t);
    const p = parseTile(t).photoId;
    count.set(p, (count.get(p) ?? 0) + 1);
  };
  const complete = () => [...count.values()].filter((n) => n === 4).length;
  const unlimited = state.options.maxCompletable >= UNLIMITED;
  const target = Math.max(1, state.options.maxCompletable);
  const wanted = !unlimited && target > 1 ? 1 + rng.int(target) : 1;

  // 1. Complete photos (fewest missing tiles first) until at least `wanted` are completable.
  while (complete() < wanted) {
    const left = k - chosen.size;
    const candidates = [...count.entries()]
      .filter(([, n]) => n < 4 && 4 - n <= left)
      .sort((a, b) => b[1] - a[1] || rng.next() - 0.5);
    const best = candidates[0];
    if (!best) break;
    for (const q of QUADRANTS) {
      const t = tileId(best[0], q);
      if (pool.includes(t) && !chosen.has(t)) take(t);
    }
  }
  // 2. Fill the rest without completing new photos (any tile when unlimited).
  for (const t of pool) {
    if (chosen.size >= k) break;
    if (chosen.has(t)) continue;
    if (unlimited || (count.get(parseTile(t).photoId) ?? 0) < 3) take(t);
  }
  // 3. Unavoidable: any remaining tile now completes a photo.
  for (const t of pool) {
    if (chosen.size >= k) break;
    if (!chosen.has(t)) take(t);
  }
  return [...chosen];
}

/**
 * Deals cards from the piles into the given empty grid slots, honouring the difficulty and never dealing a
 * pre-solved 2×2 block. Mutates `state`; returns `dealt` events in deal order.
 */
export function dealInto(state: GameState, slots: readonly number[], rng: Rng): GameEvent[] {
  const total = state.piles.reduce((n, p) => n + p.length, 0);
  const k = Math.min(slots.length, total);
  if (k === 0) return [];
  const chosen = new Set(chooseDraw(state, k, rng));

  // Move the chosen (hidden) tiles to the top positions that will be drawn, keeping piles balanced.
  const picks = planDraws(state.piles, k);
  const pickKeys = new Set(picks.map((p) => `${p.pile}:${p.index}`));
  const misplaced: Pick[] = [];
  const freeAtTop: Pick[] = [];
  state.piles.forEach((pile, pi) =>
    pile.forEach((t, ii) => {
      const atTop = pickKeys.has(`${pi}:${ii}`);
      if (chosen.has(t) && !atTop) misplaced.push({ pile: pi, index: ii });
      if (!chosen.has(t) && atTop) freeAtTop.push({ pile: pi, index: ii });
    }),
  );
  misplaced.forEach((m, i) => {
    const f = freeAtTop[i] as Pick;
    const a = state.piles[m.pile] as TileId[];
    const b = state.piles[f.pile] as TileId[];
    [a[m.index], b[f.index]] = [b[f.index] as TileId, a[m.index] as TileId];
  });

  const drawn = picks.map((p) => ({
    tileId: (state.piles[p.pile] as TileId[]).pop() as TileId,
    pile: p.pile,
  }));
  const targets = slots.slice(0, k);
  let order = drawn;
  for (let attempt = 0; attempt < 60; attempt++) {
    order = shuffle(drawn, rng);
    order.forEach((d, i) => (state.grid[targets[i] as number] = d.tileId));
    if (!hasNaturalAdjacency(state.grid, state.options.columns)) break;
  }
  return order.map((d, i) => ({ type: 'dealt', tileId: d.tileId, pile: d.pile, to: targets[i] as number }));
}
