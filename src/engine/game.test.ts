import { describe, expect, it } from 'vitest';
import { allTileIds, createGame, gridSizeFor, parseTile, tileId, visibleTiles } from './game';
import { makePhotos } from './test-helpers';
import { DEFAULT_OPTIONS } from './types';

describe('tile ids', () => {
  it('round-trips photo id and quadrant', () => {
    const id = tileId('tennis_2026', 'BR');
    expect(parseTile(id)).toEqual({ id, photoId: 'tennis_2026', quadrant: 'BR' });
  });

  it('builds 4 tiles per photo', () => {
    expect(allTileIds(['a', 'b'])).toHaveLength(8);
  });
});

describe('gridSizeFor', () => {
  it('caps at columns × rows', () => {
    expect(gridSizeFor(200, DEFAULT_OPTIONS)).toBe(30);
  });
  it('rounds small decks up to whole rows, with at least 2 rows so a 2×2 block fits', () => {
    expect(gridSizeFor(12, DEFAULT_OPTIONS)).toBe(15);
    expect(gridSizeFor(20, DEFAULT_OPTIONS)).toBe(20);
    expect(gridSizeFor(4, DEFAULT_OPTIONS)).toBe(10);
  });
});

describe('createGame', () => {
  it('uses every tile exactly once across grid and piles', () => {
    const photos = makePhotos(10);
    const g = createGame(photos, 1);
    const all = [...g.grid.filter((t): t is string => t !== null), ...g.piles.flat()];
    expect(all).toHaveLength(40);
    expect(new Set(all)).toEqual(new Set(allTileIds(photos.map((p) => p.id))));
  });

  it('fills a 30-slot tableau and splits the rest across 5 piles', () => {
    const g = createGame(makePhotos(10), 1);
    expect(g.grid).toHaveLength(30);
    expect(g.grid.every((t) => t !== null)).toBe(true);
    expect(g.piles).toHaveLength(5);
    expect(g.piles.flat()).toHaveLength(10);
    const sizes = g.piles.map((p) => p.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('shows all tiles when the deck has fewer than 30', () => {
    const g = createGame(makePhotos(3), 1);
    expect(g.grid).toHaveLength(15);
    expect(g.grid.filter(Boolean)).toHaveLength(12);
    expect(g.piles.flat()).toHaveLength(0);
  });

  it('starts with zeroed counters', () => {
    const g = createGame(makePhotos(10), 1, undefined, 1000);
    expect(g.moves).toBe(0);
    expect(g.hintsUsed).toBe(0);
    expect(g.solved).toEqual([]);
    expect(g.startedAt).toBe(1000);
    expect(g.finishedAt).toBeNull();
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const a = createGame(makePhotos(10), 7);
    const b = createGame(makePhotos(10), 7);
    const c = createGame(makePhotos(10), 8);
    expect(a).toEqual(b);
    expect(a.grid).not.toEqual(c.grid);
  });

  it('rejects an empty photo list', () => {
    expect(() => createGame([], 1)).toThrow();
  });

  it('visibleTiles lists grid tiles', () => {
    const g = createGame(makePhotos(10), 1);
    expect(visibleTiles(g)).toHaveLength(30);
  });
});
