import { dealInto } from './dealer';
import { createRng, shuffle } from './rng';
import { allTileIds } from './tiles';
import { DEFAULT_OPTIONS, type GameOptions, type GameState, type Photo, type TileId } from './types';

export { allTileIds, findBlocks, parseTile, tileId, visibleTiles } from './tiles';

/** Tableau size: capped at columns × rows, whole rows for small decks, at least 2 rows (a 2×2 must fit). */
export function gridSizeFor(tileCount: number, options: GameOptions): number {
  const rows = Math.min(options.rows, Math.max(2, Math.ceil(tileCount / options.columns)));
  return rows * options.columns;
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
  deck.forEach((t, i) => piles[i % options.piles]?.push(t));

  const state: GameState = {
    version: 2,
    seed,
    rngState: 0,
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
  dealInto(
    state,
    Array.from({ length: size }, (_, i) => i),
    rng,
  );
  state.rngState = rng.state;
  return state;
}
