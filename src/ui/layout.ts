export interface TileSize {
  w: number;
  h: number;
}

export interface LayoutOptions {
  /** Whether the draw piles row is shown above the grid. */
  piles?: boolean;
  /** Extra tile-widths placed beside the grid (e.g. the tray in landscape). */
  extraCols?: number;
}

export const GAP = 2;
const PAD = 8;
const HUD = 56;
const PILE_SCALE = 0.6;
const SIDE_GAP = 32;

/** Largest 3:4 tile so that (piles +) tableau (+ tray) + HUD fit the viewport. */
export function computeTileSize(
  width: number,
  height: number,
  columns = 5,
  rows = 6,
  { piles = true, extraCols = 0 }: LayoutOptions = {},
): TileSize {
  const sideGap = extraCols > 0 ? SIDE_GAP : 0;
  const byW = (width - 2 * PAD - (columns - 1) * GAP - sideGap) / (columns + extraCols);
  const pileRows = piles ? PILE_SCALE : 0;
  const byH = ((height - HUD - 2 * PAD - (rows + 2) * GAP - 16) / (rows + pileRows)) * 0.75;
  const w = Math.max(28, Math.floor(Math.min(byW, byH, 180)));
  return { w, h: Math.round(w / 0.75) };
}
