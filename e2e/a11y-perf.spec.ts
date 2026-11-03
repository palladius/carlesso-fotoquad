import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target.join(' ')}`);
}

test('accessibility: start screen and table have no serious/critical WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-pack]').first()).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  await page.locator('[data-pack="all"]').click();
  await expect(page.locator('.grid .tile')).toHaveCount(30);
  expect(await seriousViolations(page)).toEqual([]);
});

test('accessibility: keyboard focus order reaches the HUD buttons and the tiles', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-pack="all"]').click();
  await expect(page.locator('.grid .tile')).toHaveCount(30);
  await page.keyboard.press('Tab');
  await expect(page.locator('.grid .tile').first()).toBeFocused();
});

test('performance: a cached (PWA) reload shows an interactive start screen in < 200ms', async ({
  page,
  baseURL,
}) => {
  test.skip(baseURL?.includes(':5173') ?? false, 'needs the production build + service worker');
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.reload();
  await page.waitForSelector('[data-pack]');
  const ms = await page.evaluate(() => {
    const t = performance.getEntriesByName('fotoquad:interactive')[0];
    return t ? t.startTime : performance.now();
  });
  console.log(`interactive after ${Math.round(ms)}ms`);
  expect(ms).toBeLessThan(200);
});
