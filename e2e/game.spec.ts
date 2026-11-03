import { expect, test, type Page } from '@playwright/test';
import { blockTargets, dismissPopup, fresh, limitPhotos, slotCount, startLevel } from './helpers';

test.use({ serviceWorkers: 'block' });

const QUADS = ['TL', 'TR', 'BL', 'BR'];

const slotOf = (page: Page, id: string) =>
  page.locator(`.slot:has([data-tile="${id}"])`).getAttribute('data-slot').then(Number);

/** Uses the hint, then tap-tap swaps the 4 tiles into slots 0,1,5,6. */
async function solveWithHint(page: Page) {
  await page.getByRole('button', { name: 'Aiuto' }).click();
  const first = await page.locator('.tile.hint').first().getAttribute('data-tile');
  const photo = (first as string).split('#')[0];
  const targets = await blockTargets(page);
  for (let k = 0; k < 4; k++) {
    const id = `${photo}#${QUADS[k]}`;
    const from = await slotOf(page, id);
    if (from === targets[k]) continue;
    await page.locator(`[data-tile="${id}"]`).click();
    await page.locator(`.slot[data-slot="${targets[k]}"]`).click();
  }
}

test('start screen offers only the three levels', async ({ page }) => {
  await fresh(page);
  await expect(page.locator('[data-level]')).toHaveCount(3);
  await expect(page.locator('[data-pack]')).toHaveCount(0);
});

test('Medio with the full demo library overflows the board', async ({ page }) => {
  await fresh(page);
  await limitPhotos(page, 100); // demo photos only (no private ones)
  await startLevel(page, 'medio');
  await expect(page.locator('.grid .tile')).toHaveCount(await slotCount(page));
  const piles = await page.locator('.pile-count').allTextContents();
  expect(piles.reduce((n, t) => n + Number(t || 0), 0)).toBeGreaterThan(0);
});

test('plays a full small game to victory via tap-tap swaps and unlocks the album', async ({ page }) => {
  await limitPhotos(page, 3);
  await fresh(page);
  await startLevel(page, 'medio');
  await expect(page.locator('.hud-solved')).toHaveText('📸 0 / 3');
  for (let i = 1; i <= 3; i++) {
    await solveWithHint(page);
    if (i < 3) {
      await expect(page.locator('.hud-solved')).toHaveText(`📸 ${i} / 3`, { timeout: 10_000 });
      await dismissPopup(page);
    }
  }
  await expect(page.getByRole('dialog', { name: 'Vittoria' })).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: "📖 Sfoglia l'Album" }).click();
  await expect(page.locator('.album-counter')).toHaveText('1 / 3');
});

test('drag & drop swaps two tiles', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile-portrait', 'mouse drag covered on desktop');
  await fresh(page);
  await startLevel(page, 'medio');
  const a = await page.locator('.slot[data-slot="2"] .tile').getAttribute('data-tile');
  const b = await page.locator('.slot[data-slot="12"] .tile').getAttribute('data-tile');
  const from = await page.locator('.slot[data-slot="2"]').boundingBox();
  const to = await page.locator('.slot[data-slot="12"]').boundingBox();
  if (!from || !to) throw new Error('no boxes');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await expect(page.locator('.slot[data-slot="12"]')).toHaveClass(/drop-target/);
  await page.mouse.up();
  await expect(page.locator('.slot[data-slot="12"] .tile')).toHaveAttribute('data-tile', a as string);
  await expect(page.locator('.slot[data-slot="2"] .tile')).toHaveAttribute('data-tile', b as string);
  await expect(page.locator('.hud-moves')).toHaveText('👣 1');
});

test('resumes an in-progress game after reload', async ({ page }) => {
  await fresh(page);
  await startLevel(page, 'medio');
  await page.locator('.slot[data-slot="0"] .tile').click();
  await page.locator('.slot[data-slot="7"]').click();
  await expect(page.locator('.hud-moves')).toHaveText('👣 1');
  const before = await page.locator('.slot[data-slot="7"] .tile').getAttribute('data-tile');
  await page.reload();
  await page.getByRole('button', { name: /Continua/ }).click();
  await expect(page.locator('.hud-moves')).toHaveText('👣 1');
  await expect(page.locator('.slot[data-slot="7"] .tile')).toHaveAttribute('data-tile', before as string);
});

test('Facile: tap-to-tray full game to victory', async ({ page }) => {
  await limitPhotos(page, 3);
  await fresh(page);
  await startLevel(page, 'facile');
  await expect(page.locator('.tray')).toBeVisible();
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: 'Aiuto' }).click();
    const ids = await page
      .locator('.tile.hint')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-tile')));
    for (const id of ids) {
      const t = page.locator(`.grid [data-tile="${id}"]`);
      if (await t.count()) await t.click();
    }
    if (i < 3) {
      await expect(page.locator('.hud-solved')).toHaveText(`📸 ${i} / 3`, { timeout: 10_000 });
      await dismissPopup(page);
    }
  }
  await expect(page.getByRole('dialog', { name: 'Vittoria' })).toBeVisible({ timeout: 10_000 });
});

test('Facile: tapping a tray tile sends it back to the grid', async ({ page }) => {
  await fresh(page);
  await startLevel(page, 'facile');
  const first = page.locator('.grid .tile').first();
  const id = await first.getAttribute('data-tile');
  await first.click();
  await expect(page.locator(`.tray [data-tile="${id}"]`)).toBeVisible();
  await page.locator(`.tray [data-tile="${id}"]`).click();
  await expect(page.locator(`.grid [data-tile="${id}"]`)).toBeVisible();
});
