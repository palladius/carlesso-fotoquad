/**
 * Photo hygiene guard-rails: any agent (or human) adding a photo must register it properly.
 * These tests read the real files in the repo — they fail on orphans, broken manifest entries,
 * wrong aspect ratios, oversized files and stray image copies outside `public/`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const PHOTOS = join(ROOT, 'public', 'photos');
const DEMO = join(PHOTOS, 'demo');
const MANIFEST = join(PHOTOS, 'photos.json');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_BYTES = 600 * 1024;
const MIN_HEIGHT = 800;

interface Entry {
  id: unknown;
  src: unknown;
  title: unknown;
  year?: unknown;
  tags?: unknown;
}

const manifestText = readFileSync(MANIFEST, 'utf8');
const manifest = JSON.parse(manifestText) as Entry[];

/** Width/height from JPEG SOF, PNG IHDR or WebP VP8/VP8L/VP8X headers (no dependencies). */
export function imageSize(buf: Buffer): { width: number; height: number } {
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1] as number;
      const len = buf.readUInt16BE(i + 2);
      // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    throw new Error('JPEG without SOF marker');
  }
  if (buf.toString('ascii', 1, 4) === 'PNG') {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  throw new Error('unsupported image format');
}

function walk(dir: string, skip: Set<string>): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skip.has(relative(ROOT, p)) || name.startsWith('.')) continue;
    if (statSync(p).isDirectory()) out.push(...walk(p, skip));
    else out.push(p);
  }
  return out;
}

describe('public photo manifest (public/photos/photos.json)', () => {
  it('is a JSON array formatted with a trailing newline (Prettier)', () => {
    expect(Array.isArray(manifest)).toBe(true);
    expect(manifestText.endsWith('\n')).toBe(true);
  });

  it.each(manifest.map((e) => [String(e.id), e] as const))('%s has a valid, complete entry', (_id, e) => {
    expect(typeof e.id === 'string' && /^[a-z0-9]+(_[a-z0-9]+)*$/.test(e.id), 'id: lower_snake_case').toBe(
      true,
    );
    expect(typeof e.title === 'string' && e.title.trim().length > 0, 'title: non-empty string').toBe(true);
    if (e.year !== undefined)
      expect(Number.isInteger(e.year) && (e.year as number) > 1900, 'year').toBe(true);
    expect(Array.isArray(e.tags) && (e.tags as unknown[]).every((t) => typeof t === 'string'), 'tags').toBe(
      true,
    );
    // convention: demo/<id>.<ext>
    expect(
      typeof e.src === 'string' && new RegExp(`^demo/${String(e.id)}\\.(jpg|jpeg|png|webp)$`).test(e.src),
    ).toBe(true);
    expect(existsSync(join(PHOTOS, String(e.src))), `missing file public/photos/${String(e.src)}`).toBe(true);
  });

  it('has unique ids', () => {
    const ids = manifest.map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });
});

describe('demo images (public/photos/demo/)', () => {
  const files = readdirSync(DEMO).filter((f) => !f.startsWith('.'));
  const referenced = new Set(manifest.map((e) => String(e.src).replace(/^demo\//, '')));

  it('every image is registered in the manifest (no orphans)', () => {
    expect(files.filter((f) => !referenced.has(f))).toEqual([]);
  });

  it('contains only images', () => {
    expect(files.filter((f) => !IMAGE_EXT.has(extname(f).toLowerCase()))).toEqual([]);
  });

  it.each(files.filter((f) => IMAGE_EXT.has(extname(f).toLowerCase())))(
    '%s is a 3:4 portrait, ≥ 800px tall, ≤ 600 KB',
    (f) => {
      const p = join(DEMO, f);
      const buf = readFileSync(p);
      const { width, height } = imageSize(buf);
      expect(Math.abs(width / height - 0.75), `aspect ${width}x${height}`).toBeLessThan(0.01);
      expect(height).toBeGreaterThanOrEqual(MIN_HEIGHT);
      expect(statSync(p).size, 'file size').toBeLessThanOrEqual(MAX_BYTES);
    },
  );
});

describe('repository hygiene', () => {
  it('has no image files outside public/ and docs/ (no stray copies left by agents)', () => {
    const skip = new Set([
      'node_modules',
      'dist',
      'dev-dist',
      'coverage',
      'test-results',
      'playwright-report',
      'public',
      'docs',
    ]);
    const stray = walk(ROOT, skip)
      .filter((p) => IMAGE_EXT.has(extname(p).toLowerCase()))
      .map((p) => relative(ROOT, p));
    expect(stray).toEqual([]);
  });
});

describe('imageSize', () => {
  it('reads PNG and WebP headers too', () => {
    const png = Buffer.alloc(24);
    png.write('\x89PNG', 0, 'binary');
    png.writeUInt32BE(300, 16);
    png.writeUInt32BE(400, 20);
    expect(imageSize(png)).toEqual({ width: 300, height: 400 });
    const webp = Buffer.alloc(30);
    webp.write('RIFF', 0);
    webp.write('WEBPVP8X', 8);
    webp.writeUIntLE(299, 24, 3);
    webp.writeUIntLE(399, 27, 3);
    expect(imageSize(webp)).toEqual({ width: 300, height: 400 });
    expect(() => imageSize(Buffer.from('nope'))).toThrow();
  });
});
