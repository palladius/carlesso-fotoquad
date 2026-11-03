import { expect, test, type Page } from '@playwright/test';

async function solveWithHints(page: Page) {
  await page.getByRole('button', { name: 'Aiuto' }).click();
  const hinted = page.locator('.tile.hint');
  await expect(hinted).toHaveCount(4);
  const ids = await hinted.evaluateAll((els) => els.map((e) => e.getAttribute('data-tile')));
  for (const id of ids) {
    const tile = page.locator(`.grid [data-tile="${id}"]`);
    if (await tile.count()) await tile.click();
  }
}

test('plays a full small-pack game to victory and unlocks the album', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-pack="gamberone"]').click();
  await expect(page.locator('.grid .tile').first()).toBeVisible();
  await expect(page.locator('.hud-solved')).toHaveText('📸 0 / 3');

  for (let i = 1; i <= 3; i++) {
    await solveWithHints(page);
    if (i < 3) await expect(page.locator('.hud-solved')).toHaveText(`📸 ${i} / 3`, { timeout: 10_000 });
  }
  await expect(page.getByRole('dialog', { name: 'Vittoria' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: "📖 Sfoglia l'Album" }).click();
  await expect(page.locator('.album-counter')).toHaveText('1 / 3');
});

test('resumes an in-progress game after reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-pack="all"]').click();
  await page.locator('.grid .tile').first().click();
  await expect(page.locator('.hud-moves')).toHaveText('👣 1');
  const before = await page.locator('.tray .tile').getAttribute('data-tile');
  await page.reload();
  await page.getByRole('button', { name: /Continua la partita/ }).click();
  await expect(page.locator('.hud-moves')).toHaveText('👣 1');
  await expect(page.locator('.tray .tile')).toHaveAttribute('data-tile', before as string);
});

test('tapping a tray tile sends it back to the grid', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-pack="all"]').click();
  const first = page.locator('.grid .tile').first();
  const id = await first.getAttribute('data-tile');
  await first.click();
  await expect(page.locator(`.tray [data-tile="${id}"]`)).toBeVisible();
  await page.locator(`.tray [data-tile="${id}"]`).click();
  await expect(page.locator(`.grid [data-tile="${id}"]`)).toBeVisible();
});
