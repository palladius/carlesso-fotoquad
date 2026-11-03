import { expect, test } from '@playwright/test';

// Requires a production build (service worker is disabled in dev): `npx vite build && npx vite preview`.
test('PWA: after the first visit the game works fully offline', async ({ page, context, baseURL }) => {
  test.skip(baseURL?.includes(':5173') ?? false, 'service worker only exists in production builds');
  await page.goto('/');
  await expect(page.locator('[data-level]').first()).toBeVisible();
  // wait for the service worker to install and take control
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifest).toContain('manifest.webmanifest');

  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-level="facile"]').click();
  await expect(page.locator('.grid .tile')).toHaveCount(24);
  // tiles are real sliced images (blob URLs), proving photos came from the cache
  await expect(page.locator('.grid .tile').first()).toHaveAttribute('style', /blob:/);
  await context.setOffline(false);
});

test('PWA: manifest is valid and installable', async ({ request, baseURL }) => {
  test.skip(baseURL?.includes(':5173') ?? false, 'manifest only exists in production builds');
  const res = await request.get('manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toContain('FotoQuad');
  expect(m.display).toBe('standalone');
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
});
