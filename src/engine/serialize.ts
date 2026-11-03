import { QUADRANTS, type GameState } from './types';

export const SCHEMA_VERSION = 2;

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isSlot = (v: unknown) => v === null || isStr(v);
const isSlotOrNum = (v: unknown) => v === null || isNum(v);

/** Parses a saved game; returns null for corrupt or incompatible data (FR-8). */
export function deserialize(raw: string): GameState | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const s = data as Record<string, unknown>;
  if (s.version !== SCHEMA_VERSION) return null;
  const opts = s.options as Record<string, unknown> | undefined;
  const tray = s.tray as Record<string, unknown> | undefined;
  const origin = s.trayOrigin as Record<string, unknown> | undefined;
  const ok =
    isNum(s.seed) &&
    isNum(s.rngState) &&
    !!opts &&
    isNum(opts.columns) &&
    isNum(opts.rows) &&
    isNum(opts.piles) &&
    isNum(opts.maxCompletable) &&
    (opts.mode === 'tray' || opts.mode === 'grid') &&
    !!tray &&
    QUADRANTS.every((q) => q in tray && isSlot(tray[q])) &&
    !!origin &&
    QUADRANTS.every((q) => q in origin && isSlotOrNum(origin[q])) &&
    Array.isArray(s.photoIds) &&
    s.photoIds.every(isStr) &&
    Array.isArray(s.piles) &&
    s.piles.every((p) => Array.isArray(p) && p.every(isStr)) &&
    Array.isArray(s.grid) &&
    s.grid.every(isSlot) &&
    Array.isArray(s.solved) &&
    s.solved.every(isStr) &&
    isNum(s.moves) &&
    isNum(s.hintsUsed) &&
    isNum(s.startedAt) &&
    isSlotOrNum(s.finishedAt);
  return ok ? (s as unknown as GameState) : null;
}
