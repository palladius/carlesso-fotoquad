import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test(`layout fits ${vp.width}×${vp.height} without overflow`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'viewport set explicitly; run once');
    await page.setViewportSize(vp);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('[data-pack="all"]').click();
    await expect(page.locator('.grid .tile')).toHaveCount(30);
    const m = await page.evaluate(() => {
      const grid = document.querySelector('.grid')!.getBoundingClientRect();
      const hud = document.querySelector('.hud')!.getBoundingClientRect();
      return {
        scrollW: document.documentElement.scrollWidth,
        scrollH: document.documentElement.scrollHeight,
        gridRight: grid.right,
        hudBottom: hud.bottom,
      };
    });
    expect(m.scrollW).toBeLessThanOrEqual(vp.width);
    expect(m.gridRight).toBeLessThanOrEqual(vp.width);
    expect(m.hudBottom).toBeLessThanOrEqual(vp.height + 1);
    expect(m.scrollH).toBeLessThanOrEqual(vp.height + 1);
    await page.screenshot({ path: `test-results/layout-${vp.width}x${vp.height}.png` });
  });
}
