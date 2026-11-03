import { expect, type Page } from '@playwright/test';

/** Clears saved state and opens the start screen. */
export async function fresh(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-level]').first()).toBeVisible();
}

/**
 * Serves only the first `n` demo photos (and no private ones), so a test game is short and deterministic in size.
 * Requires `test.use({ serviceWorkers: 'block' })` on production builds, otherwise the SW answers first.
 */
export async function limitPhotos(page: Page, n: number): Promise<void> {
  await page.route('**/photos/photos.json', async (route) => {
    const res = await route.fetch();
    const all = (await res.json()) as unknown[];
    await route.fulfill({ json: all.slice(0, n) });
  });
  await page.route('**/photos/private/photos.json', (route) => route.fulfill({ status: 404, body: '' }));
}

export async function startLevel(page: Page, level: 'facile' | 'medio' | 'difficile'): Promise<void> {
  await page.locator(`[data-level="${level}"]`).click();
  await expect(page.locator('.grid .tile').first()).toBeVisible();
}

/** Dismisses the celebration popup if it is showing (one tap anywhere). */
export async function dismissPopup(page: Page): Promise<void> {
  const popup = page.locator('.match-popup');
  if (await popup.isVisible().catch(() => false)) {
    await page.waitForTimeout(400); // arm delay
    await page.mouse.click(5, 5);
    await expect(popup).toBeHidden();
  }
}

/** Slots of a 2×2 block in the top-left corner, for whatever board shape the game picked. */
export async function blockTargets(page: Page): Promise<number[]> {
  const cols = await page
    .locator('.grid')
    .evaluate((el) =>
      Number(
        getComputedStyle(el).getPropertyValue('--cols') ||
          (el as HTMLElement).style.getPropertyValue('--cols'),
      ),
    );
  return [0, 1, cols, cols + 1];
}

export async function slotCount(page: Page): Promise<number> {
  return page.locator('.slot').count();
}

/** Waits for the board, then asserts every slot holds a tile (a full board, whatever its shape). */
export async function expectFullBoard(page: Page): Promise<void> {
  await expect(page.locator('.slot').first()).toBeVisible();
  const slots = await page.locator('.slot').count();
  await expect(page.locator('.grid .tile')).toHaveCount(slots);
}
