import type { Photo } from '../engine/types';

export interface Pack {
  id: 'bimbi' | 'viaggi' | 'gamberone' | 'all';
  name: string;
  emoji: string;
  photoIds: string[];
}

const THEMES: { id: Pack['id']; name: string; emoji: string; tags: string[] }[] = [
  { id: 'bimbi', name: 'I Bimbi', emoji: '👦👦', tags: ['ale', 'sebi', 'seby', 'alessandro', 'sebastian'] },
  { id: 'viaggi', name: 'Vacanze & Viaggi', emoji: '🏖️', tags: ['viaggi', 'vacanze', 'travel'] },
  { id: 'gamberone', name: 'Gamberone & Dreamworks', emoji: '🦐', tags: ['gamberone', 'dreamworks'] },
];

/** FR-2: themed packs derived from tags; empty packs are hidden; the full archive is always last. */
export function buildPacks(photos: readonly Photo[]): Pack[] {
  const packs: Pack[] = [];
  for (const t of THEMES) {
    const ids = photos
      .filter((p) => p.tags.some((tag) => t.tags.includes(tag.toLowerCase())))
      .map((p) => p.id);
    if (ids.length) packs.push({ id: t.id, name: t.name, emoji: t.emoji, photoIds: ids });
  }
  if (photos.length)
    packs.push({ id: 'all', name: "Tutto l'Archivio", emoji: '📚', photoIds: photos.map((p) => p.id) });
  return packs;
}
