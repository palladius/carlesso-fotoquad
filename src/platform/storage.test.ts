import { beforeEach, describe, expect, it } from 'vitest';
import { createGame } from '../engine/game';
import { makePhotos } from '../engine/test-helpers';
import { createStorage } from './storage';

describe('storage', () => {
  let backing: Storage;
  beforeEach(() => {
    backing = window.localStorage;
    backing.clear();
  });

  it('saves, loads and clears the in-progress game with its pack id', () => {
    const s = createStorage(backing);
    const g = createGame(makePhotos(3), 1);
    s.saveGame('bimbi', g);
    expect(s.loadGame()).toEqual({ packId: 'bimbi', state: g });
    s.clearGame();
    expect(s.loadGame()).toBeNull();
  });

  it('discards a corrupt saved game', () => {
    backing.setItem('fotoquad.game.v1', '{broken');
    expect(createStorage(backing).loadGame()).toBeNull();
    backing.setItem(
      'fotoquad.game.v1',
      JSON.stringify({ packId: 'x', state: JSON.stringify({ version: 9 }) }),
    );
    expect(createStorage(backing).loadGame()).toBeNull();
  });

  it('accumulates unlocked photos without duplicates', () => {
    const s = createStorage(backing);
    s.unlock(['a', 'b']);
    s.unlock(['b', 'c']);
    expect(s.unlocked()).toEqual(['a', 'b', 'c']);
  });

  it('keeps the best (fewest moves) record per pack', () => {
    const s = createStorage(backing);
    expect(s.record('all')).toBeNull();
    expect(s.submitRecord('all', 40)).toBe(true);
    expect(s.submitRecord('all', 50)).toBe(false);
    expect(s.submitRecord('all', 30)).toBe(true);
    expect(s.record('all')).toBe(30);
  });

  it('persists the mute flag', () => {
    const s = createStorage(backing);
    expect(s.muted()).toBe(false);
    s.setMuted(true);
    expect(createStorage(backing).muted()).toBe(true);
  });

  it('persists the difficulty (default medio) and ignores unknown values', () => {
    const s = createStorage(backing);
    expect(s.difficulty()).toBe('medio');
    s.setDifficulty('facile');
    expect(createStorage(backing).difficulty()).toBe('facile');
    backing.setItem('fotoquad.profile.v1', JSON.stringify({ difficulty: 'normale' }));
    expect(createStorage(backing).difficulty()).toBe('medio');
  });

  it('records play history as an increasing game counter (rotation)', () => {
    const s = createStorage(backing);
    expect(s.lastPlayed()).toEqual({});
    s.markPlayed(['a', 'b']);
    s.markPlayed(['b', 'c']);
    expect(createStorage(backing).lastPlayed()).toEqual({ a: 1, b: 2, c: 2 });
  });

  it('ignores garbage in the profile', () => {
    backing.setItem('fotoquad.profile.v1', '"string"');
    const s = createStorage(backing);
    expect(s.unlocked()).toEqual([]);
    expect(s.muted()).toBe(false);
    backing.setItem('fotoquad.profile.v1', JSON.stringify({ lastPlayed: { a: 'x', b: 3 }, games: 'n' }));
    expect(createStorage(backing).lastPlayed()).toEqual({ b: 3 });
  });

  it('survives a throwing storage (e.g. private mode quota)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    } as unknown as Storage;
    const s = createStorage(throwing);
    expect(s.loadGame()).toBeNull();
    expect(() => s.saveGame('all', createGame(makePhotos(1), 1))).not.toThrow();
    expect(() => s.clearGame()).not.toThrow();
    expect(s.unlocked()).toEqual([]);
  });
});
