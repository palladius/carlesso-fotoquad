import type { Rng } from '../engine/rng';
import { shuffle } from '../engine/rng';
import type { Photo } from '../engine/types';
import type { Difficulty } from './storage';

/** Photos per game (FR-2): Medio/Difficile overflow the 30-slot board on purpose, that's where the fun is. */
export const PHOTOS_PER_LEVEL: Record<Difficulty, number> = { facile: 6, medio: 16, difficile: 24 };

/**
 * FR-3 rotation: least-recently-played photos first (never played = oldest), ties broken by the RNG,
 * so every new game brings photos not seen recently.
 */
export function selectPhotos(
  library: readonly Photo[],
  count: number,
  lastPlayed: Readonly<Record<string, number>>,
  rng: Rng,
): Photo[] {
  const age = (p: Photo) => lastPlayed[p.id] ?? 0; // history counters start at 1
  // shuffle first, then a stable sort keeps the random order among equally old photos
  return shuffle(library, rng)
    .sort((a, b) => age(a) - age(b))
    .slice(0, count);
}
