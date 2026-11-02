import type { Rng } from './rng';
import { shuffle } from './rng';
import { parseTile, tileId, visibleTiles } from './tiles';
import { QUADRANTS, type GameEvent, type GameState, type TileId } from './types';

/** Unsolved photos whose 4 quadrants are all visible (grid + tray). */
export function completablePhotos(state: GameState): string[] {
  return photosCompleteIn(new Set(visibleTiles(state)), unsolved(state));
}

function unsolved(state: GameState): string[] {
  const solved = new Set(state.solved);
  return state.photoIds.filter((p) => !solved.has(p));
}

function photosCompleteIn(tiles: ReadonlySet<TileId>, photoIds: readonly string[]): string[] {
  return photoIds.filter((p) => QUADRANTS.every((q) => tiles.has(tileId(p, q))));
}

/** True if any photo sits in the grid as its natural, already-solved 2×2 block. */
export function hasNaturalAdjacency(grid: readonly (TileId | null)[], columns: number): boolean {
  for (let i = 0; i < grid.length; i++) {
    const t = grid[i];
    if (!t || i % columns === columns - 1) continue;
    const { photoId, quadrant } = parseTile(t);
    if (quadrant !== 'TL') continue;
    if (
      grid[i + 1] === tileId(photoId, 'TR') &&
      grid[i + columns] === tileId(photoId, 'BL') &&
      grid[i + columns + 1] === tileId(photoId, 'BR')
    ) {
      return true;
    }
  }
  return false;
}

interface Pick {
  pile: number;
  index: number;
}

/** Simulates drawing `k` cards, always from the tallest pile (ties → lowest index). */
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

function tileAt(state: GameState, pick: Pick): TileId {
  return state.piles[pick.pile]?.[pick.index] as TileId;
}

function locate(state: GameState, id: TileId): Pick | null {
  for (let p = 0; p < state.piles.length; p++) {
    const index = state.piles[p]?.indexOf(id) ?? -1;
    if (index >= 0) return { pile: p, index };
  }
  return null;
}

function swap(state: GameState, a: Pick, b: Pick): void {
  const pa = state.piles[a.pile] as TileId[];
  const pb = state.piles[b.pile] as TileId[];
  const tmp = pa[a.index] as TileId;
  pa[a.index] = pb[b.index] as TileId;
  pb[b.index] = tmp;
}

/**
 * Re-orders pile cards so that the upcoming draws guarantee at least one completable photo
 * in the visible set (SPEC FR-5).
 */
function ensureSolvable(state: GameState, picks: Pick[], rng: Rng): void {
  const open = unsolved(state);
  if (open.length === 0 || picks.length === 0) return;
  const visible = new Set(visibleTiles(state));
  const drawn = () => new Set(picks.map((p) => tileAt(state, p)));
  const union = new Set([...visible, ...drawn()]);
  if (photosCompleteIn(union, open).length > 0) return;

  // Pick the photo needing the fewest extra tiles (ties broken by the RNG).
  let best: string[] = [];
  let bestMissing = Infinity;
  for (const p of open) {
    const missing = QUADRANTS.filter((q) => !union.has(tileId(p, q))).length;
    if (missing < bestMissing) {
      bestMissing = missing;
      best = [p];
    } else if (missing === bestMissing) {
      best.push(p);
    }
  }
  const target = best[rng.int(best.length)] as string;
  const missingTiles = QUADRANTS.map((q) => tileId(target, q)).filter((t) => !union.has(t));
  for (const m of missingTiles) {
    const from = locate(state, m);
    const current = drawn();
    const swappable = picks.filter((p) => {
      const t = tileAt(state, p);
      return parseTile(t).photoId !== target && current.has(t);
    });
    if (!from || swappable.length === 0) return;
    swap(state, from, swappable[rng.int(swappable.length)] as Pick);
  }
}

/**
 * Deals cards from the piles into the given empty grid slots, guaranteeing solvability and
 * avoiding trivial 2×2 layouts. Mutates `state`; returns `dealt` events in deal order.
 */
export function dealInto(state: GameState, slots: readonly number[], rng: Rng): GameEvent[] {
  const total = state.piles.reduce((n, p) => n + p.length, 0);
  const k = Math.min(slots.length, total);
  const picks = planDraws(state.piles, k);
  ensureSolvable(state, picks, rng);

  const drawn: { tileId: TileId; pile: number }[] = picks.map((p) => {
    const t = (state.piles[p.pile] as TileId[]).pop() as TileId;
    return { tileId: t, pile: p.pile };
  });

  const targets = slots.slice(0, k);
  let order = drawn;
  for (let attempt = 0; attempt < 50; attempt++) {
    order = shuffle(drawn, rng);
    order.forEach((d, i) => (state.grid[targets[i] as number] = d.tileId));
    if (!hasNaturalAdjacency(state.grid, state.options.columns)) break;
  }
  return order.map((d, i) => ({ type: 'dealt', tileId: d.tileId, pile: d.pile, to: targets[i] as number }));
}
