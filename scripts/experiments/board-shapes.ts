// Experiment: which board shape maximises tile size on landscape screens?
// Piles column on the left + HUD column on the right (landscape grid mode).
import { computeTileSize } from '../../src/ui/layout';

const viewports: [string, number, number][] = [
  ['laptop browser 1024x538 (Riccardo)', 1024, 538],
  ['laptop 1366x657', 1366, 657],
  ['desktop 1440x900', 1440, 900],
  ['full HD 1920x969', 1920, 969],
  ['iPad landscape 1180x820', 1180, 820],
  ['phone landscape 844x390', 844, 390],
];
const shapes: [number, number][] = [
  [5, 6],
  [6, 5],
  [7, 4],
  [8, 4],
  [10, 3],
  [9, 3],
  [6, 4],
  [7, 5],
];

console.log(
  'cols×rows slots | ' + viewports.map((v) => v[0].split(' ')[0] + ' ' + v[0].split(' ').pop()).join(' | '),
);
for (const [c, r] of shapes) {
  const row = viewports.map(([, w, h]) => {
    const t = computeTileSize(w, h, c, r, { piles: true, pilesBeside: true, hudBeside: true });
    return String(t.w).padStart(4);
  });
  console.log(`${c}×${r} (${String(c * r).padStart(2)}) | ${row.join(' | ')}`);
}
