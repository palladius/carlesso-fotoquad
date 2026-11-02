import { createRng, shuffle, type Rng } from './rng';
import {
  DEFAULT_OPTIONS,
  QUADRANTS,
  type GameOptions,
  type GameState,
  type Photo,
  type Quadrant,
  type Tile,
  type TileId,
} from './types';

export function tileId(photoId: string, quadrant: Quadrant): TileId {
  return `${photoId}#${quadrant}`;
}

export function parseTile(id: TileId): Tile {
  const cut = id.lastIndexOf('#');
  return { id, photoId: id.slice(0, cut), quadrant: id.slice(cut + 1) as Quadrant };
}

export function allTileIds(photoIds: readonly string[]): TileId[] {
  return photoIds.flatMap((p) => QUADRANTS.map((q) => tileId(p, q)));
}

/** Tableau size: capped at columns × rows, rounded up to whole rows for small decks. */
export function gridSizeFor(tileCount: number, options: GameOptions): number {
  const max = options.columns * options.rows;
  return Math.min(max, Math.ceil(tileCount / options.columns) * options.columns);
}

export function visibleTiles(state: GameState): TileId[] {
  const out: TileId[] = [];
  for (const t of state.grid) if (t) out.push(t);
  for (const q of QUADRANTS) {
    const t = state.tray[q];
    if (t) out.push(t);
  }
  return out;
}

export function createGame(
  photos: readonly Pick<Photo, 'id'>[],
  seed: number,
  options: GameOptions = DEFAULT_OPTIONS,
  now = 0,
): GameState {
  if (photos.length === 0) throw new Error('createGame: at least one photo is required');
  const photoIds = photos.map((p) => p.id);
  const rng = createRng(seed);
  const deck = shuffle(allTileIds(photoIds), rng);
  const size = gridSizeFor(deck.length, options);

  const piles: TileId[][] = Array.from({ length: options.piles }, () => []);
  deck.slice(size).forEach((t, i) => piles[i % options.piles]?.push(t));

  const state: GameState = {
    version: 1,
    seed,
    rngState: rng.state,
    options,
    photoIds,
    piles,
    grid: Array.from({ length: size }, () => null),
    tray: { TL: null, TR: null, BL: null, BR: null },
    trayOrigin: { TL: null, TR: null, BL: null, BR: null },
    solved: [],
    moves: 0,
    hintsUsed: 0,
    startedAt: now,
    finishedAt: null,
  };
  const initial = deck.slice(0, size);
  initial.forEach((t, i) => (state.grid[i] = t));
  syncRng(state, rng);
  return state;
}

export function syncRng(state: GameState, rng: Rng): void {
  state.rngState = rng.state;
}
