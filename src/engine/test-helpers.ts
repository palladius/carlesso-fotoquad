import type { Photo } from './types';

export function makePhotos(n: number, tags: string[] = []): Photo[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    src: `photos/p${i}.jpg`,
    title: `Photo ${i}`,
    tags,
  }));
}
