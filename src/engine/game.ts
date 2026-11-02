import { dealInto } from './dealer';
import { createRng, shuffle } from './rng';
import { allTileIds } from './tiles';
import { DEFAULT_OPTIONS, type GameOptions, type GameState, type Photo, type TileId } from './types';

export { allTileIds, parseTile, tileId, visibleTiles } from './tiles';

/** Tableau size: capped at columns × rows, rounded up to whole rows for small decks. */
export function gridSizeFor(tileCount: number, options: GameOptions): number {
  const max = options.columns * options.rows;
  return Math.min(max, Math.ceil(tileCount / options.columns) * options.columns);
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
    version: 1,
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
