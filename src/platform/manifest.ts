import type { Photo } from '../engine/types';

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Validates a manifest (SPEC §3.1) and resolves `src` relative to the manifest URL. */
export function parseManifest(data: unknown, manifestUrl: string): Photo[] {
  if (!Array.isArray(data)) {
    console.warn('[fotoquad] manifest is not an array, ignoring', manifestUrl);
    return [];
  }
  const out: Photo[] = [];
  for (const entry of data) {
    // cast: untrusted JSON entry; fields are type-checked one by one below.
    const e = entry as Record<string, unknown> | null;
    if (!e || !isStr(e.id) || !isStr(e.src)) {
      console.warn('[fotoquad] skipping invalid manifest entry', entry);
      continue;
    }
    const photo: Photo = {
      id: e.id,
      src: new URL(e.src, manifestUrl).href,
      title: isStr(e.title) ? e.title : e.id,
      tags: Array.isArray(e.tags) ? e.tags.filter(isStr) : [],
    };
    if (typeof e.year === 'number') photo.year = e.year;
    out.push(photo);
  }
  return out;
}

async function fetchManifest(fetchFn: typeof fetch, url: string): Promise<Photo[]> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) return [];
    return parseManifest(await res.json(), url);
  } catch {
    return [];
  }
}

/** Loads the public demo manifest plus the optional git-ignored private one. */
export async function loadPhotos(fetchFn: typeof fetch, baseUrl: string): Promise<Photo[]> {
  const root = new URL('photos/', baseUrl).href;
  const [pub, priv] = await Promise.all([
    fetchManifest(fetchFn, `${root}photos.json`),
    fetchManifest(fetchFn, `${root}private/photos.json`),
  ]);
  const seen = new Set<string>();
  return [...pub, ...priv].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
