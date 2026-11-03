// Live Runtime UAT (conductor-converge §4B, archetype B: Game). Plays real games with mouse drags.
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:42173/';
const outDir = process.argv[3] ?? 'docs/screenshots';
const errors = [];
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (m) => m.type() === 'error' && errors.push(`console.error: ${m.text()}`));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on(
  'response',
  (r) => r.status() >= 400 && !r.url().includes('/private/') && errors.push(`HTTP ${r.status()} ${r.url()}`),
);

await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('[data-level]');
await page.screenshot({ path: `${outDir}/mvp_zen_20261102-uat-t0.png` });

await page.locator('[data-level="difficile"]').click();
await page.waitForSelector('.grid .tile');
const t0 = Date.now();

async function centre(sel) {
  const b = await page.locator(sel).boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
}
async function drag(fromSlot, toSlot) {
  const [x1, y1] = await centre(`.slot[data-slot="${fromSlot}"]`);
  const [x2, y2] = await centre(`.slot[data-slot="${toSlot}"]`);
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
}

const report = { solved: [], completableCounts: [] };
for (let round = 0; round < 3; round++) {
  await page.getByRole('button', { name: 'Aiuto' }).click();
  const ids = await page.locator('.tile.hint').evaluateAll((els) => els.map((e) => e.dataset.tile));
  report.completableCounts.push(ids.length / 4);
  const photo = ids[0].split('#')[0];
  const cols = Number(await page.locator('.grid').evaluate((el) => el.style.getPropertyValue('--cols')));
  const targets = [0, 1, cols, cols + 1];
  for (const [k, q] of ['TL', 'TR', 'BL', 'BR'].entries()) {
    const from = Number(
      await page.locator(`.slot:has([data-tile="${photo}#${q}"])`).getAttribute('data-slot'),
    );
    if (from !== targets[k]) await drag(from, targets[k]);
    if (k === 3) await page.waitForTimeout(400);
  }
  if (round === 0) await page.screenshot({ path: `${outDir}/mvp_zen_20261102-uat-match.png` });
  await page.waitForFunction(
    (n) => document.querySelector('.hud-solved')?.textContent?.includes(`${n} /`),
    round + 1,
    {
      timeout: 8000,
    },
  );
  report.solved.push(photo);
  await page.waitForTimeout(2600);
}
await page.screenshot({ path: `${outDir}/mvp_zen_20261102-uat.png` });
report.hud = await page.locator('.hud-stats').textContent();
report.tiles = await page.locator('.grid .tile').count();
report.seconds = Math.round((Date.now() - t0) / 1000);
report.errors = errors;
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(errors.length ? 1 : 0);
