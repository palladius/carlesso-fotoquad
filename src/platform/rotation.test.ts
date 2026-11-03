import { describe, expect, it } from 'vitest';
import { createRng } from '../engine/rng';
import type { Photo } from '../engine/types';
import { PHOTOS_PER_LEVEL, selectPhotos } from './rotation';

const lib = (n: number): Photo[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, src: '', title: '', tags: [] }));

describe('selectPhotos', () => {
  it('returns `count` distinct photos, or the whole library if smaller', () => {
    const picked = selectPhotos(lib(26), 16, {}, createRng(1));
    expect(picked).toHaveLength(16);
    expect(new Set(picked.map((p) => p.id)).size).toBe(16);
    expect(selectPhotos(lib(5), 16, {}, createRng(1))).toHaveLength(5);
  });

  it('prefers never-played, then least-recently-played photos', () => {
    const history = { p0: 5, p1: 1, p2: 9, p3: 3 }; // p4, p5 never played
    const picked = selectPhotos(lib(6), 4, history, createRng(2)).map((p) => p.id);
    expect(picked.slice(0, 2).sort()).toEqual(['p4', 'p5']);
    expect(picked.slice(2)).toEqual(['p1', 'p3']);
  });

  it('breaks ties randomly but deterministically for a given seed', () => {
    const a = selectPhotos(lib(26), 6, {}, createRng(7)).map((p) => p.id);
    const b = selectPhotos(lib(26), 6, {}, createRng(7)).map((p) => p.id);
    const c = selectPhotos(lib(26), 6, {}, createRng(8)).map((p) => p.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('consecutive games rotate: with 26 photos two Medio games share as few photos as possible', () => {
    const history: Record<string, number> = {};
    const first = selectPhotos(lib(26), 16, history, createRng(3));
    first.forEach((p) => (history[p.id] = 1));
    const second = selectPhotos(lib(26), 16, history, createRng(4));
    const overlap = second.filter((p) => first.some((f) => f.id === p.id)).length;
    expect(overlap).toBe(16 + 16 - 26); // 6: the unavoidable minimum
    // the 10 unseen photos all come first
    expect(second.slice(0, 10).every((p) => !first.some((f) => f.id === p.id))).toBe(true);
  });

  it('defines how many photos each level plays', () => {
    expect(PHOTOS_PER_LEVEL).toEqual({ facile: 6, medio: 16, difficile: 24 });
  });
});
