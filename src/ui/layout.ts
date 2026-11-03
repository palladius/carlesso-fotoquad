export interface TileSize {
  w: number;
  h: number;
  landscape: boolean;
}

export const GAP = 6;
const PAD = 10;
const HUD = 52;
const PILE_SCALE = 0.7;

/**
 * Computes the largest 3:4 tile that fits the viewport.
 * Portrait: piles / grid / tray stacked. Landscape: tray beside the grid.
 */
export function computeTileSize(width: number, height: number, columns = 5, rows = 6): TileSize {
  const landscape = width > height * 1.1;
  let byW: number;
  let byH: number;
  if (landscape) {
    byW = (width - 2 * PAD - (columns + 3) * GAP - 32) / (columns + 2);
    const vUnits = rows + PILE_SCALE;
    byH = ((height - HUD - 2 * PAD - (rows + 2) * GAP) / vUnits) * 0.75;
  } else {
    byW = (width - 2 * PAD - (columns - 1) * GAP) / columns;
    const vUnits = rows + 2 + PILE_SCALE;
    byH = ((height - HUD - 2 * PAD - (rows + 5) * GAP) / vUnits) * 0.75;
  }
  const w = Math.max(28, Math.floor(Math.min(byW, byH, 150)));
  return { w, h: Math.round(w / 0.75), landscape };
}
