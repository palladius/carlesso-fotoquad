export interface TileSize {
  w: number;
  h: number;
}

export interface LayoutOptions {
  /** Whether the draw piles are shown at all. */
  piles?: boolean;
  /** Extra tile-widths placed beside the grid (e.g. the Facile tray in landscape). */
  extraCols?: number;
  /** Landscape: the piles become a column left of the board instead of a row above it. */
  pilesBeside?: boolean;
  /** Landscape: the HUD becomes a column right of the board instead of a bar below it. */
  hudBeside?: boolean;
}

export const GAP = 2;
const PAD = 8;
const HUD = 56; // HUD bar height (stacked) / column width (beside)
const HUD_W = 64;
const PILE_SCALE = 0.6;
const SIDE_GAP = 32;

/** Largest 3:4 tile so that piles, tableau, tray and HUD all fit the viewport. */
export function computeTileSize(
  width: number,
  height: number,
  columns = 5,
  rows = 6,
  { piles = true, extraCols = 0, pilesBeside = false, hudBeside = false }: LayoutOptions = {},
): TileSize {
  const pileCols = piles && pilesBeside ? PILE_SCALE : 0;
  const pileRows = piles && !pilesBeside ? PILE_SCALE : 0;
  const fixedW =
    2 * PAD +
    (columns - 1) * GAP +
    (extraCols > 0 ? SIDE_GAP : 0) +
    (pileCols > 0 ? SIDE_GAP : 0) +
    (hudBeside ? HUD_W + SIDE_GAP : 0);
  const fixedH = 2 * PAD + (rows + 2) * GAP + (hudBeside ? 0 : HUD + 16);
  const byW = (width - fixedW) / (columns + extraCols + pileCols);
  const byH = ((height - fixedH) / (rows + pileRows)) * 0.75;
  const w = Math.max(28, Math.floor(Math.min(byW, byH, 180)));
  return { w, h: Math.round(w / 0.75) };
}

/** Board shapes with 28–32 slots (the engine needs ≥ 2 rows and columns for a 2×2 block). */
export const BOARD_SHAPES: readonly (readonly [number, number])[] = [
  [5, 6],
  [6, 5],
  [7, 4],
  [8, 4],
];

/**
 * Picks the board shape giving the biggest tiles for this viewport (ties → more slots), using the same layout
 * rules as the table: on wide screens piles/HUD (grid mode) or the tray (Facile) move beside the board.
 * Chosen once at game start: the engine's 2×2 adjacency depends on the number of columns.
 */
export function chooseBoardShape(
  width: number,
  height: number,
  trayMode: boolean,
): { columns: number; rows: number } {
  const landscape = width > height * 1.1;
  let best = { columns: 5, rows: 6, w: 0 };
  for (const [columns, rows] of BOARD_SHAPES) {
    const { w } = computeTileSize(
      width,
      height,
      columns,
      rows + (trayMode && !landscape ? 2.3 : 0),
      trayMode
        ? { piles: false, extraCols: landscape ? 2.4 : 0 }
        : { pilesBeside: landscape, hudBeside: landscape },
    );
    if (w > best.w || (w === best.w && columns * rows > best.columns * best.rows))
      best = { columns, rows, w };
  }
  return { columns: best.columns, rows: best.rows };
}
