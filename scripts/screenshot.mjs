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
  await page.waitForSelector('[data-pack]');
  await page.screenshot({ path: `${out}-${name}-start.png` });
  await page.locator('[data-pack="all"]').click();
  await page.waitForSelector('.grid .tile');
  await page.waitForTimeout(800);
  await page.locator('.grid .tile').nth(0).click();
  await page.locator('.grid .tile').nth(3).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}-${name}-table.png` });
  await page.getByRole('button', { name: 'Aiuto' }).click();
  const ids = await page
    .locator('.tile.hint')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-tile')));
  for (const id of ids) {
    const t = page.locator(`.grid [data-tile="${id}"]`);
    if (await t.count()) await t.click();
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}-${name}-match.png` });
  await page.close();
}
await browser.close();
