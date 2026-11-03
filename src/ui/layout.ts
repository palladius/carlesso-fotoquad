export interface TileSize {
  w: number;
  h: number;
}

export const GAP = 2;
const PAD = 8;
const HUD = 56;
const PILE_SCALE = 0.6;

/** Largest 3:4 tile so that piles + tableau + HUD fit the viewport (no tray). */
export function computeTileSize(width: number, height: number, columns = 5, rows = 6): TileSize {
  const byW = (width - 2 * PAD - (columns - 1) * GAP) / columns;
  const byH = ((height - HUD - 2 * PAD - (rows + 2) * GAP - 16) / (rows + PILE_SCALE)) * 0.75;
  const w = Math.max(28, Math.floor(Math.min(byW, byH, 180)));
  return { w, h: Math.round(w / 0.75) };
}
