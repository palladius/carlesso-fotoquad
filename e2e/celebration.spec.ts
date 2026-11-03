import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { fresh, limitPhotos, startLevel } from './helpers';

// Celebration popup — tests derived from the adversarial review (track rotation_ux_20261103).
test.use({ serviceWorkers: 'block' });

const QUADS = ['TL', 'TR', 'BL', 'BR'];
const TARGETS = [0, 1, 5, 6];
const popup = (page: Page) => page.locator('.match-popup');

async function hintedPhoto(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Aiuto' }).click();
  const first = await page.locator('.tile.hint').first().getAttribute('data-tile');
  await page.waitForTimeout(50);
  return (first as string).split('#')[0] as string;
}

/** Swaps a photo into slots 0,1,5,6 with tap-tap; the completing move (BR → slot 6) is done by `last`. */
async function assemble(page: Page, last: (from: number, to: number) => Promise<void>) {
  const photo = await hintedPhoto(page);
  // make sure the completing move is the one performed by `last` (BR must not already sit in slot 6)
  const br = Number(await page.locator(`.slot:has([data-tile="${photo}#BR"])`).getAttribute('data-slot'));
  if (br === 6) {
    await page.locator('.slot[data-slot="6"] .tile').click();
    await page.locator('.slot[data-slot="10"]').click();
  }
  const moves: [number, number][] = [];
  for (let k = 0; k < 4; k++) {
    const id = `${photo}#${QUADS[k]}`;
    const from = Number(await page.locator(`.slot:has([data-tile="${id}"])`).getAttribute('data-slot'));
    if (from === TARGETS[k]) continue;
    moves.push([from, TARGETS[k] as number]);
    // perform all but the last later, because positions change after each swap
    if (k < 3) {
      await page.locator(`[data-tile="${id}"]`).click();
      await page.locator(`.slot[data-slot="${TARGETS[k]}"]`).click();
    }
  }
  const id = `${photo}#BR`;
  const from = Number(await page.locator(`.slot:has([data-tile="${id}"])`).getAttribute('data-slot'));
  await last(from, 6);
}

const tapTap = (page: Page) => async (from: number, to: number) => {
  await page.locator(`.slot[data-slot="${from}"] .tile`).click();
  await page.locator(`.slot[data-slot="${to}"]`).click();
};

async function setup(page: Page) {
  await limitPhotos(page, 3);
  await fresh(page);
  await startLevel(page, 'medio');
}

test('A: one tap dismisses the popup within 500ms and the board is usable right after', async ({ page }) => {
  await setup(page);
  await assemble(page, tapTap(page));
  await expect(popup(page)).toBeVisible();
  await page.waitForTimeout(400); // past the arm delay
  const t0 = Date.now();
  await page.mouse.click(30, 30);
  await expect(popup(page)).toBeHidden();
  expect(Date.now() - t0).toBeLessThan(500);
  await expect(page.locator('.hud-solved')).toHaveText('📸 1 / 3');
  await page.locator('.slot[data-slot="10"] .tile').click();
  await expect(page.locator('.tile.selected')).toHaveCount(1);
});

test('B: tapping the popup where the Menu button is does not leave the game', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-portrait', 'touch test');
  await setup(page);
  await assemble(page, tapTap(page));
  await expect(popup(page)).toBeVisible();
  await page.waitForTimeout(400);
  const menu = await page.getByRole('button', { name: 'Menu' }).boundingBox();
  if (!menu) throw new Error('no menu');
  await page.touchscreen.tap(menu.x + menu.width / 2, menu.y + menu.height / 2);
  await expect(popup(page)).toBeHidden();
  await page.waitForTimeout(600);
  await expect(page.locator('.grid')).toBeVisible();
  await expect(page.locator('[data-level]')).toHaveCount(0);
  await expect(page.locator('.album')).toHaveCount(0);
});

test('C: tapping every popup immediately still shows (and keeps) the victory screen', async ({ page }) => {
  await setup(page);
  for (let i = 0; i < 3; i++) {
    await assemble(page, tapTap(page));
    await expect(popup(page)).toBeVisible();
    await page.waitForTimeout(400);
    await page.mouse.click(30, 30);
    await expect(popup(page)).toBeHidden();
    if (i < 2) await expect(page.locator('.hud-solved')).toHaveText(`📸 ${i + 1} / 3`);
  }
  const victory = page.getByRole('dialog', { name: 'Vittoria' });
  await expect(victory).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(victory).toBeVisible();
});

test('D: without interaction the popup goes away on its own (~2s)', async ({ page }) => {
  await setup(page);
  await assemble(page, tapTap(page));
  await expect(popup(page)).toBeVisible();
  const t0 = Date.now();
  await expect(popup(page)).toBeHidden({ timeout: 4000 });
  expect(Date.now() - t0).toBeLessThan(2600);
});

test('E: the drag that completes a photo does not dismiss its own popup', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile-portrait', 'mouse drag');
  await setup(page);
  await assemble(page, async (from, to) => {
    const a = await page.locator(`.slot[data-slot="${from}"]`).boundingBox();
    const b = await page.locator(`.slot[data-slot="${to}"]`).boundingBox();
    if (!a || !b) throw new Error('no boxes');
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  });
  await expect(popup(page)).toBeVisible();
  await page.waitForTimeout(300);
  await expect(popup(page)).toBeVisible();
});

test('F: reduced motion + keyboard: Escape dismisses and focus returns to the board', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'mobile-portrait', 'keyboard');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await assemble(page, async (from, to) => {
    await page.locator(`.slot[data-slot="${from}"] .tile`).focus();
    await page.keyboard.press('Enter');
    await page.locator(`.slot[data-slot="${to}"] .tile`).focus();
    await page.keyboard.press('Enter');
  });
  await expect(popup(page)).toBeVisible();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await expect(popup(page)).toBeHidden();
  await expect(page.locator('.hud-solved')).toHaveText('📸 1 / 3');
  // focus is restored when the discard + deal animation ends (after the HUD counter updates)
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.grid'))).toBe(true);
});

test('G: no serious accessibility violations while the popup is open', async ({ page }) => {
  await setup(page);
  await assemble(page, tapTap(page));
  await expect(popup(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`)).toEqual([]);
});
