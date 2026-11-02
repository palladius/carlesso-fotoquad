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
  const out: TileId[] = [];
  for (const t of state.grid) if (t) out.push(t);
  for (const q of QUADRANTS) {
    const t = state.tray[q];
    if (t) out.push(t);
  }
  return out;
}
