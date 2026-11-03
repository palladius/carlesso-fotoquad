import { deserialize, serialize } from '../engine/serialize';
import type { GameState } from '../engine/types';

const GAME_KEY = 'fotoquad.game.v1';
const PROFILE_KEY = 'fotoquad.profile.v1';

interface Profile {
  unlocked: string[];
  records: Record<string, number>;
  muted: boolean;
}

export interface SavedGame {
  packId: string;
  state: GameState;
}

export interface GameStorage {
  saveGame(packId: string, state: GameState): void;
  loadGame(): SavedGame | null;
  clearGame(): void;
  unlock(photoIds: readonly string[]): void;
  unlocked(): string[];
  record(packId: string): number | null;
  /** Returns true if `moves` is a new personal best. */
  submitRecord(packId: string, moves: number): boolean;
  muted(): boolean;
  setMuted(muted: boolean): void;
}

/** FR-8: versioned localStorage persistence; never throws, discards corrupt data. */
export function createStorage(backing: Storage): GameStorage {
  const read = (key: string): string | null => {
    try {
      return backing.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (key: string, value: string | null): void => {
    try {
      if (value === null) backing.removeItem(key);
      else backing.setItem(key, value);
    } catch {
      /* storage unavailable: play on without persistence */
    }
  };
  const profile = (): Profile => {
    const fresh: Profile = { unlocked: [], records: {}, muted: false };
    try {
      const p = JSON.parse(read(PROFILE_KEY) ?? 'null') as Partial<Profile> | null;
      if (!p || typeof p !== 'object') return fresh;
      return {
        unlocked: Array.isArray(p.unlocked) ? p.unlocked.filter((x) => typeof x === 'string') : [],
        records: p.records && typeof p.records === 'object' ? p.records : {},
        muted: p.muted === true,
      };
    } catch {
      return fresh;
    }
  };
  const saveProfile = (p: Profile) => write(PROFILE_KEY, JSON.stringify(p));

  return {
    saveGame(packId, state) {
      write(GAME_KEY, JSON.stringify({ packId, state: serialize(state) }));
    },
    loadGame() {
      try {
        const raw = JSON.parse(read(GAME_KEY) ?? 'null') as { packId?: unknown; state?: unknown } | null;
        if (!raw || typeof raw.packId !== 'string' || typeof raw.state !== 'string') return null;
        const state = deserialize(raw.state);
        return state ? { packId: raw.packId, state } : null;
      } catch {
        return null;
      }
    },
    clearGame() {
      write(GAME_KEY, null);
    },
    unlock(ids) {
      const p = profile();
      p.unlocked = [...new Set([...p.unlocked, ...ids])];
      saveProfile(p);
    },
    unlocked: () => profile().unlocked,
    record: (packId) => profile().records[packId] ?? null,
    submitRecord(packId, moves) {
      const p = profile();
      const best = p.records[packId];
      if (best !== undefined && best <= moves) return false;
      p.records[packId] = moves;
      saveProfile(p);
      return true;
    },
    muted: () => profile().muted,
    setMuted(muted) {
      const p = profile();
      p.muted = muted;
      saveProfile(p);
    },
  };
}
