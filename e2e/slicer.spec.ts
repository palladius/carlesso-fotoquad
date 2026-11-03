import { expect, test } from '@playwright/test';

// spec.md AC-1 / FR-1: the slicer must produce 4 correct geometric quadrants (pixel-level check).
test.use({ serviceWorkers: 'block' }); // let page.route() intercept the manifest and images

const COLORS = { TL: [255, 0, 0], TR: [0, 200, 0], BL: [0, 0, 255], BR: [255, 220, 0] } as const;

function svg(w: number, h: number): string {
  const [cx, cy] = [w / 2, h / 2];
  const rect = (x: number, y: number, c: readonly number[]) =>
    `<rect x="${x}" y="${y}" width="${cx}" height="${cy}" fill="rgb(${c.join(',')})"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rect(0, 0, COLORS.TL)}${rect(cx, 0, COLORS.TR)}${rect(0, cy, COLORS.BL)}${rect(cx, cy, COLORS.BR)}</svg>`;
}

test('each tile shows exactly its quadrant colour, also after a 3:4 centre crop', async ({ page }) => {
  await page.route('**/photos/photos.json', (r) =>
    r.fulfill({
      json: [
        { id: 'portrait', src: 'portrait.svg', title: 'Portrait', tags: [] },
        { id: 'wide', src: 'wide.svg', title: 'Wide', tags: [] },
      ],
    }),
  );
  await page.route('**/photos/private/photos.json', (r) => r.fulfill({ status: 404, body: '' }));
  await page.route('**/photos/portrait.svg', (r) =>
    r.fulfill({ contentType: 'image/svg+xml', body: svg(300, 400) }),
  );
  await page.route('**/photos/wide.svg', (r) =>
    r.fulfill({ contentType: 'image/svg+xml', body: svg(1600, 400) }),
  );

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-pack="all"]').click();
  await expect(page.locator('.grid .tile')).toHaveCount(8);

  const samples = await page.locator('.grid .tile').evaluateAll(async (els) => {
    const out: { id: string; rgb: number[]; corner: number[]; ratio: number }[] = [];
    for (const el of els) {
      const url = /url\("(.+)"\)/.exec((el as HTMLElement).style.backgroundImage)?.[1] as string;
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d') as CanvasRenderingContext2D;
      ctx.drawImage(img, 0, 0);
      const px = (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)];
      out.push({
        id: (el as HTMLElement).dataset.tile as string,
        rgb: px(c.width / 2, c.height / 2),
        corner: px(2, 2),
        ratio: img.naturalWidth / img.naturalHeight,
      });
    }
    return out;
  });

  for (const s of samples) {
    const q = s.id.split('#')[1] as keyof typeof COLORS;
    for (const sample of [s.rgb, s.corner]) {
      sample.forEach((v, i) =>
        expect(Math.abs(v - (COLORS[q][i] as number)), `${s.id} ${sample}`).toBeLessThan(40),
      );
    }
    expect(s.ratio).toBeCloseTo(0.75, 1);
  }
});
