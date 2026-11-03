import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '/tmp/fq';
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=gl', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
});
for (const [name, vp] of [
  ['mobile', { width: 390, height: 844 }],
  ['desktop', { width: 1440, height: 900 }],
]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-level]');
  await page.screenshot({ path: `${out}-${name}-start.png` });
  await page.locator('[data-level="medio"]').click();
  await page.waitForSelector('.grid .tile');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}-${name}-table.png` });
  // Solve the hinted photo by tap-tap swapping its 4 tiles into slots 0, 1, 5, 6.
  await page.getByRole('button', { name: 'Aiuto' }).click();
  const first = await page.locator('.tile.hint').first().getAttribute('data-tile');
  const photo = first.split('#')[0];
  const cols = Number(await page.locator('.grid').evaluate((el) => el.style.getPropertyValue('--cols')));
  const targets = [0, 1, cols, cols + 1];
  for (const [k, q] of ['TL', 'TR', 'BL', 'BR'].entries()) {
    const from = Number(
      await page.locator(`.slot:has([data-tile="${photo}#${q}"])`).getAttribute('data-slot'),
    );
    if (from === targets[k]) continue;
    await page.locator(`[data-tile="${photo}#${q}"]`).click();
    await page.locator(`.slot[data-slot="${targets[k]}"]`).click();
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}-${name}-match.png` });
  await page.close();
}
await browser.close();
