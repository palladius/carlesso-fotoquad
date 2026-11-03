import { describe, expect, it } from 'vitest';
import { cropRect, quadrantRects } from './slicer';

describe('cropRect (3:4 centre crop)', () => {
  it('keeps a 3:4 image intact', () => {
    expect(cropRect(300, 400)).toEqual({ x: 0, y: 0, w: 300, h: 400 });
  });
  it('trims the sides of a landscape image', () => {
    expect(cropRect(1600, 900)).toEqual({ x: 462.5, y: 0, w: 675, h: 900 });
  });
  it('trims top and bottom of a tall 9:16 image', () => {
    expect(cropRect(900, 1600)).toEqual({ x: 0, y: 200, w: 900, h: 1200 });
  });
});

describe('quadrantRects', () => {
  it('splits the crop into 4 equal quadrants', () => {
    const r = quadrantRects({ x: 10, y: 20, w: 300, h: 400 });
    expect(r).toEqual({
      TL: { x: 10, y: 20, w: 150, h: 200 },
      TR: { x: 160, y: 20, w: 150, h: 200 },
      BL: { x: 10, y: 220, w: 150, h: 200 },
      BR: { x: 160, y: 220, w: 150, h: 200 },
    });
  });
});
