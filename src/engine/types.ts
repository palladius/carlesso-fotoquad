/** Core engine types. The engine is pure: no DOM, no clock, no globals. */

export const QUADRANTS = ['TL', 'TR', 'BL', 'BR'] as const;
export type Quadrant = (typeof QUADRANTS)[number];

/** A photo as declared in the manifest (SPEC §3.1). */
export interface Photo {
  id: string;
  src: string;
  title: string;
  year?: number;
  tags: string[];
}

/** A tile id is `${photoId}#${quadrant}`. */
export type TileId = string;

export interface Tile {
  id: TileId;
  photoId: string;
  quadrant: Quadrant;
}

/**
 * `tray`: tap a tile and it flies to its slot in a 2×2 assembly tray (Facile, for small kids).
 * `grid`: drag & drop swaps inside the tableau; a natural 2×2 block is a match (Medio / Difficile).
 */
export type GameMode = 'tray' | 'grid';

export interface GameOptions {
  columns: number;
  rows: number;
  piles: number;
  mode: GameMode;
  /** Max completable photos after a deal: 1 = Difficile, 3 = Medio, UNLIMITED = Facile (FR-5). */
  maxCompletable: number;
}

export const UNLIMITED = 99;

export const DEFAULT_OPTIONS: GameOptions = {
  columns: 5,
  rows: 6,
  piles: 5,
  mode: 'grid',
  maxCompletable: 1,
};

export type Tray = Record<Quadrant, TileId | null>;

export interface GameState {
  version: 2;
  seed: number;
  rngState: number;
  options: GameOptions;
  photoIds: string[];
  /** Face-down draw piles; the last element of each array is the top card. */
  piles: TileId[][];
  /** Tableau slots (row-major, `columns` wide). */
  grid: (TileId | null)[];
  /** Assembly tray (tray mode only; always empty in grid mode). */
  tray: Tray;
  /** For each tray tile, the (empty) grid slot it returns to. */
  trayOrigin: Record<Quadrant, number | null>;
  /** Solved photo ids, in completion order. */
  solved: string[];
  moves: number;
  hintsUsed: number;
  startedAt: number;
  finishedAt: number | null;
}

export type Action =
  | { type: 'SWAP'; from: number; to: number; now?: number }
  | { type: 'PLACE_TILE'; gridIndex: number; now?: number }
  | { type: 'RETURN_TILE'; quadrant: Quadrant; now?: number }
  | { type: 'HINT'; now?: number };

export type GameEvent =
  | { type: 'swapped'; from: number; to: number; moved: TileId; displaced: TileId | null }
  | { type: 'placed'; tileId: TileId; from: number; to: Quadrant }
  | { type: 'replaced'; tileId: TileId; from: Quadrant; to: number }
  | { type: 'returned'; tileId: TileId; from: Quadrant; to: number }
  /** `slots` are grid slots in grid mode, empty in tray mode (tiles were in the tray). */
  | { type: 'matched'; photoId: string; tileIds: TileId[]; slots: number[] }
  | { type: 'dealt'; tileId: TileId; pile: number; to: number }
  | { type: 'hint'; photoId: string; tileIds: TileId[] }
  | { type: 'won'; moves: number; hintsUsed: number; durationMs: number };

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}
