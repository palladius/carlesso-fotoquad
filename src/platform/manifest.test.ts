import { describe, expect, it, vi } from 'vitest';
import { loadPhotos, parseManifest } from './manifest';

const BASE = 'http://localhost/photos/photos.json';

describe('parseManifest', () => {
  it('parses valid entries and resolves src relative to the manifest URL', () => {
    const photos = parseManifest(
      [{ id: 'a', src: 'demo/a.jpg', title: 'A', year: 2026, tags: ['ale'] }],
      BASE,
    );
    expect(photos).toEqual([
      { id: 'a', src: 'http://localhost/photos/demo/a.jpg', title: 'A', year: 2026, tags: ['ale'] },
    ]);
  });

  it('skips invalid entries with a warning and defaults optional fields', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const photos = parseManifest(
      [
        { id: 'ok', src: 'x.jpg' },
        { id: 3 },
        null,
        { src: 'no-id.jpg' },
        { id: 'dup', src: 'd.jpg', tags: 'x' },
      ],
      BASE,
    );
    expect(photos.map((p) => p.id)).toEqual(['ok', 'dup']);
    expect(photos[0]).toMatchObject({ title: 'ok', tags: [] });
    expect(photos[1]?.tags).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('returns [] for a non-array manifest', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseManifest({ nope: true }, BASE)).toEqual([]);
  });
});

describe('loadPhotos', () => {
  const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

  it('merges the public and the optional private manifest, de-duplicating by id', async () => {
    const fetchFn = vi.fn((url: string) =>
      url.includes('private')
        ? ok([
            { id: 'b', src: 'b.jpg' },
            { id: 'a', src: 'a2.jpg' },
          ])
        : ok([{ id: 'a', src: 'a.jpg' }]),
    );
    const photos = await loadPhotos(fetchFn as unknown as typeof fetch, 'http://localhost/');
    expect(photos.map((p) => p.id)).toEqual(['a', 'b']);
    expect(photos[0]?.src).toBe('http://localhost/photos/a.jpg');
    expect(fetchFn).toHaveBeenCalledWith('http://localhost/photos/photos.json');
    expect(fetchFn).toHaveBeenCalledWith('http://localhost/photos/private/photos.json');
  });

  it('tolerates a missing private manifest (404 or network error)', async () => {
    const fetchFn = vi.fn((url: string) =>
      url.includes('private')
        ? Promise.resolve(new Response('nope', { status: 404 }))
        : ok([{ id: 'a', src: 'a.jpg' }]),
    );
    expect(await loadPhotos(fetchFn as unknown as typeof fetch, 'http://localhost/')).toHaveLength(1);
    const failing = vi.fn((url: string) =>
      url.includes('private') ? Promise.reject(new Error('offline')) : ok([{ id: 'a', src: 'a.jpg' }]),
    );
    expect(await loadPhotos(failing as unknown as typeof fetch, 'http://localhost/')).toHaveLength(1);
  });

  it('tolerates a private manifest that is not JSON (e.g. SPA fallback HTML)', async () => {
    const fetchFn = vi.fn((url: string) =>
      url.includes('private')
        ? Promise.resolve(new Response('<html></html>', { status: 200 }))
        : ok([{ id: 'a', src: 'a.jpg' }]),
    );
    expect(await loadPhotos(fetchFn as unknown as typeof fetch, 'http://localhost/')).toHaveLength(1);
  });
});
