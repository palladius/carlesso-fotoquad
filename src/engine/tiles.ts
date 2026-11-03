import { QUADRANTS, type GameState, type Quadrant, type Tile, type TileId } from './types';

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

export function visibleTiles(state: GameState): TileId[] {
  const out = state.grid.filter((t): t is TileId => t !== null);
  for (const q of QUADRANTS) {
    const t = state.tray[q];
    if (t) out.push(t);
  }
  return out;
}

export interface Block {
  photoId: string;
  /** Slots of TL, TR, BL, BR. */
  slots: [number, number, number, number];
}

/** All photos sitting in the grid as their natural, adjacent 2×2 block (FR-4.3). */
export function findBlocks(grid: readonly (TileId | null)[], columns: number): Block[] {
  const out: Block[] = [];
  for (let i = 0; i + columns + 1 < grid.length; i++) {
    const t = grid[i];
    if (!t || i % columns === columns - 1) continue;
    const { photoId, quadrant } = parseTile(t);
    if (quadrant !== 'TL') continue;
    if (
      grid[i + 1] === tileId(photoId, 'TR') &&
      grid[i + columns] === tileId(photoId, 'BL') &&
      grid[i + columns + 1] === tileId(photoId, 'BR')
    ) {
      out.push({ photoId, slots: [i, i + 1, i + columns, i + columns + 1] });
    }
  }
  return out;
}
