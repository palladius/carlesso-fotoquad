import type { Photo } from '../engine/types';
import type { Difficulty } from '../platform/storage';
import { h } from './dom';
import { confetti } from './fx';

export interface StartScreenProps {
  records: Record<Difficulty, number | null>;
  resume: { level: Difficulty; solved: number; total: number } | null;
  albumCount: number;
  onLevel(level: Difficulty): void;
  onResume(): void;
  onAlbum(): void;
}

const LEVELS: [Difficulty, string, string, string][] = [
  ['facile', '🐣', 'Facile', 'tocca i pezzi: vanno nel vassoio'],
  ['medio', '🙂', 'Medio', 'trascina i pezzi nella scacchiera'],
  ['difficile', '🧠', 'Difficile', 'una sola foto alla volta è fattibile'],
];

const LEVEL_NAME: Record<Difficulty, string> = { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' };

/** FR-1: just three big level buttons; photos are chosen and rotated by the game. */
export function startScreen(p: StartScreenProps): HTMLElement {
  return h(
    'main',
    { class: 'screen start' },
    h('h1', { class: 'logo' }, h('span', { text: '📸🧩' }), ' FotoQuad'),
    h('p', { class: 'tagline', text: 'Il Solitario di Famiglia' }),
    h(
      'div',
      { class: 'levels' },
      ...LEVELS.map(([level, emoji, name, hint]) => {
        const rec = p.records[level];
        return h(
          'button',
          { class: `big-btn level level-${level}`, 'data-level': level, onclick: () => p.onLevel(level) },
          h('span', { class: 'emoji', text: emoji }),
          h('span', { class: 'label', text: name }),
          h('small', { text: rec ? `${hint} · 🏆 ${rec} mosse` : hint }),
        );
      }),
    ),
    h(
      'div',
      { class: 'secondary' },
      p.resume
        ? h('button', {
            class: 'small-btn resume',
            text: `▶️ Continua (${LEVEL_NAME[p.resume.level]} · ${p.resume.solved}/${p.resume.total})`,
            onclick: () => p.onResume(),
          })
        : null,
      h('button', {
        class: 'small-btn album-btn',
        'aria-label': `Album Ricordi, ${p.albumCount} foto sbloccate`,
        text: `📖 Album (${p.albumCount})`,
        onclick: () => p.onAlbum(),
      }),
    ),
  );
}

export interface VictoryProps {
  photos: number;
  moves: number;
  hints: number;
  durationMs: number;
  newRecord: boolean;
  onAgain(): void;
  onAlbum(): void;
  onMenu(): void;
}

function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function victoryScreen(p: VictoryProps): HTMLElement {
  const el = h(
    'div',
    { class: 'overlay victory', role: 'dialog', 'aria-label': 'Vittoria' },
    h(
      'div',
      { class: 'panel' },
      h('h2', { text: '🎉 Hai ricomposto tutte le foto! 🎉' }),
      p.newRecord ? h('p', { class: 'record', text: '🏆 Nuovo record!' }) : null,
      h(
        'dl',
        { class: 'stats' },
        h('dt', { text: '📸 Foto' }),
        h('dd', { text: String(p.photos) }),
        h('dt', { text: '👣 Mosse' }),
        h('dd', { text: String(p.moves) }),
        h('dt', { text: '💡 Aiuti' }),
        h('dd', { text: String(p.hints) }),
        h('dt', { text: '⏱️ Tempo' }),
        h('dd', { text: fmtDuration(p.durationMs) }),
      ),
      h(
        'button',
        { class: 'big-btn', onclick: () => p.onAgain() },
        h('span', { class: 'label', text: '🔄 Gioca ancora' }),
      ),
      h(
        'button',
        { class: 'big-btn', onclick: () => p.onAlbum() },
        h('span', { class: 'label', text: "📖 Sfoglia l'Album" }),
      ),
      h(
        'button',
        { class: 'big-btn ghost', onclick: () => p.onMenu() },
        h('span', { class: 'label', text: '🏠 Menu' }),
      ),
    ),
  );
  // fireworks
  for (let i = 0; i < 5; i++) {
    setTimeout(
      () =>
        confetti(
          window.innerWidth * (0.2 + Math.random() * 0.6),
          window.innerHeight * (0.2 + Math.random() * 0.4),
          50,
        ),
      i * 450,
    );
  }
  return el;
}

export function albumScreen(photos: Photo[], onClose: () => void, start = 0): HTMLElement {
  let index = Math.min(start, Math.max(0, photos.length - 1));
  const img = h('img', { class: 'album-img', alt: '' });
  const caption = h('figcaption');
  const counter = h('span', { class: 'album-counter' });
  const show = () => {
    const p = photos[index];
    if (!p) return;
    img.src = p.src;
    img.alt = p.title;
    caption.textContent = `${p.title}${p.year ? ` · ${p.year}` : ''}`;
    counter.textContent = `${index + 1} / ${photos.length}`;
  };
  const go = (d: number) => {
    if (!photos.length) return;
    index = (index + d + photos.length) % photos.length;
    show();
  };
  const close = () => {
    document.removeEventListener('keydown', onKey);
    el.remove();
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'Escape') close();
  };
  let startX: number | null = null;
  const el = h(
    'div',
    { class: 'overlay album', role: 'dialog', 'aria-label': 'Album Ricordi' },
    h('button', { class: 'album-close', 'aria-label': 'Chiudi', text: '✕', onclick: close }),
    photos.length
      ? h(
          'figure',
          {
            class: 'album-figure',
            onpointerdown: (e: Event) => (startX = e instanceof MouseEvent ? e.clientX : null),
            onpointerup: (e: Event) => {
              if (startX === null || !(e instanceof MouseEvent)) return;
              const dx = e.clientX - startX;
              startX = null;
              if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            },
          },
          img,
          caption,
        )
      : h('p', {
          class: 'album-empty',
          text: 'Nessuna foto ancora: ricomponi la prima per sbloccare l’Album! 📸',
        }),
    photos.length
      ? h(
          'div',
          { class: 'album-nav' },
          h('button', { class: 'hud-btn', 'aria-label': 'Precedente', text: '◀', onclick: () => go(-1) }),
          counter,
          h('button', { class: 'hud-btn', 'aria-label': 'Successiva', text: '▶', onclick: () => go(1) }),
        )
      : null,
  );
  document.addEventListener('keydown', onKey);
  show();
  return el;
}

export function loadingScreen(text: string): HTMLElement {
  return h(
    'main',
    { class: 'screen loading' },
    h('div', { class: 'spinner', 'aria-hidden': 'true' }),
    h('p', { text }),
  );
}
