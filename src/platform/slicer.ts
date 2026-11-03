import type { Photo, Quadrant } from '../engine/types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ASPECT = 3 / 4;

/** Centre crop to 3:4 portrait (FR-1). */
export function cropRect(width: number, height: number): Rect {
  if (width / height > ASPECT) {
    const w = height * ASPECT;
    return { x: (width - w) / 2, y: 0, w, h: height };
  }
  const h = width / ASPECT;
  return { x: 0, y: (height - h) / 2, w: width, h };
}

/** The 4 quadrants of a crop (SPEC §3.1). */
export function quadrantRects(c: Rect): Record<Quadrant, Rect> {
  const w = c.w / 2;
  const h = c.h / 2;
  return {
    TL: { x: c.x, y: c.y, w, h },
    TR: { x: c.x + w, y: c.y, w, h },
    BL: { x: c.x, y: c.y + h, w, h },
    BR: { x: c.x + w, y: c.y + h, w, h },
  };
}

export interface SlicedPhoto {
  photo: Photo;
  /** Object URL of the full 3:4 crop (popup + album). */
  full: string;
  /** Object URLs of the 4 quadrant images. */
  quadrants: Record<Quadrant, string>;
}

/* v8 ignore start -- browser-only canvas code, covered by Playwright e2e */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

function draw(img: HTMLImageElement, r: Rect, w: number, h: number): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('no 2d context'));
  ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.88,
    ),
  );
}

/** Slices one photo into its full crop + 4 quadrants. Tiles are rendered at most `tileHeight` px tall. */
export async function slicePhoto(photo: Photo, tileHeight = 480): Promise<SlicedPhoto> {
  const img = await loadImage(photo.src);
  const crop = cropRect(img.naturalWidth, img.naturalHeight);
  const th = Math.min(tileHeight, crop.h / 2);
  const tw = th * ASPECT;
  const rects = quadrantRects(crop);
  const [full, tl, tr, bl, br] = await Promise.all([
    draw(img, crop, tw * 2, th * 2),
    draw(img, rects.TL, tw, th),
    draw(img, rects.TR, tw, th),
    draw(img, rects.BL, tw, th),
    draw(img, rects.BR, tw, th),
  ]);
  return { photo, full, quadrants: { TL: tl, TR: tr, BL: bl, BR: br } };
}

/** Slices all photos, skipping (with a warning) the ones that fail to load. */
export async function sliceAll(photos: readonly Photo[]): Promise<SlicedPhoto[]> {
  const results = await Promise.allSettled(photos.map((p) => slicePhoto(p)));
  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return [r.value];
    console.warn('[fotoquad] skipping photo', photos[i]?.id, r.reason);
    return [];
  });
}
/* v8 ignore stop */
