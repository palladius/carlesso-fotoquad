import { parseTile } from '../engine/tiles';
import { QUADRANTS, type GameEvent, type GameState, type Quadrant, type TileId } from '../engine/types';
import type { SlicedPhoto } from '../platform/slicer';
import { h, reducedMotion, sleep } from './dom';
import { confetti, flipFrom, moveWithFlip } from './fx';
import { computeTileSize } from './layout';

const Q_LABEL: Record<Quadrant, string> = {
  TL: 'alto sinistra',
  TR: 'alto destra',
  BL: 'basso sinistra',
  BR: 'basso destra',
};

export interface TableHandlers {
  onGridTap(gridIndex: number): void;
  onTrayTap(quadrant: Quadrant): void;
  onHint(): void;
  onAlbum(): void;
  onMenu(): void;
  onToggleMute(): boolean;
}

export interface TableOptions {
  muted: boolean;
  photosById: Map<string, SlicedPhoto>;
}

/** Renders the solitaire table and animates engine events (FR-3, FR-4). */
export class TableView {
  readonly root: HTMLElement;
  private readonly pileEls: HTMLElement[] = [];
  private readonly slotEls: HTMLElement[] = [];
  private readonly trayEl: HTMLElement;
  private readonly traySlots = {} as Record<Quadrant, HTMLElement>;
  private readonly tiles = new Map<TileId, HTMLButtonElement>();
  private readonly solvedEl: HTMLElement;
  private readonly movesEl: HTMLElement;
  private readonly albumBtn: HTMLButtonElement;
  private hintTimer: ReturnType<typeof setTimeout> | undefined;
  private onResize = () => this.layout();
  busy = false;

  constructor(
    private state: GameState,
    private readonly handlers: TableHandlers,
    private readonly opts: TableOptions,
  ) {
    const piles = h('div', { class: 'piles', 'aria-label': 'Mazzi di pesca' });
    for (let i = 0; i < state.options.piles; i++) {
      const pile = h('div', { class: 'pile' }, h('span', { class: 'pile-count' }));
      this.pileEls.push(pile);
      piles.append(pile);
    }
    const grid = h('div', { class: 'grid', role: 'group', 'aria-label': 'Tavolo' });
    grid.style.setProperty('--cols', String(state.options.columns));
    state.grid.forEach(() => {
      const slot = h('div', { class: 'slot' });
      this.slotEls.push(slot);
      grid.append(slot);
    });
    this.trayEl = h('div', { class: 'tray', role: 'group', 'aria-label': 'Vassoio di ricomposizione' });
    for (const q of QUADRANTS) {
      const s = h('div', { class: `tray-slot tray-${q}`, 'data-q': q });
      this.traySlots[q] = s;
      this.trayEl.append(s);
    }
    this.solvedEl = h('span', { class: 'hud-solved' });
    this.movesEl = h('span', { class: 'hud-moves' });
    const muteBtn = h('button', {
      class: 'hud-btn',
      'aria-label': 'Audio',
      text: opts.muted ? '🔇' : '🔊',
      onclick: () => (muteBtn.textContent = this.handlers.onToggleMute() ? '🔇' : '🔊'),
    });
    this.albumBtn = h('button', {
      class: 'hud-btn',
      'aria-label': 'Album Ricordi',
      text: '📖',
      onclick: () => this.handlers.onAlbum(),
    });
    const hud = h(
      'div',
      { class: 'hud' },
      h('button', {
        class: 'hud-btn',
        'aria-label': 'Menu',
        text: '🏠',
        onclick: () => this.handlers.onMenu(),
      }),
      h('div', { class: 'hud-stats' }, this.solvedEl, this.movesEl),
      h('button', {
        class: 'hud-btn hint-btn',
        'aria-label': 'Aiuto',
        text: '💡',
        onclick: () => this.handlers.onHint(),
      }),
      this.albumBtn,
      muteBtn,
    );
    this.root = h('main', { class: 'table' }, piles, grid, this.trayEl, hud);
    this.reconcile(state);
    window.addEventListener('resize', this.onResize);
    this.layout();
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.hintTimer);
    this.root.remove();
  }

  layout(): void {
    const {
      w,
      h: th,
      landscape,
    } = computeTileSize(
      window.innerWidth,
      window.innerHeight,
      this.state.options.columns,
      this.state.options.rows,
    );
    this.root.style.setProperty('--tile-w', `${w}px`);
    this.root.style.setProperty('--tile-h', `${th}px`);
    this.root.classList.toggle('landscape', landscape);
  }

  private tileEl(id: TileId): HTMLButtonElement {
    let el = this.tiles.get(id);
    if (!el) {
      const { photoId, quadrant } = parseTile(id);
      const src = this.opts.photosById.get(photoId)?.quadrants[quadrant];
      el = h('button', {
        class: `tile q-${quadrant}`,
        'data-tile': id,
        'aria-label': `Tessera ${Q_LABEL[quadrant]}`,
      });
      if (src) el.style.backgroundImage = `url("${src}")`;
      el.addEventListener('click', () => this.onTileClick(id));
      this.tiles.set(id, el);
    }
    return el;
  }

  private onTileClick(id: TileId): void {
    if (this.busy) return;
    const q = QUADRANTS.find((x) => this.state.tray[x] === id);
    if (q) this.handlers.onTrayTap(q);
    else {
      const i = this.state.grid.indexOf(id);
      if (i >= 0) this.handlers.onGridTap(i);
    }
  }

  /** Brings the DOM in line with `state` without animation. */
  reconcile(state: GameState): void {
    this.state = state;
    const keep = new Set<TileId>();
    state.grid.forEach((id, i) => {
      const slot = this.slotEls[i] as HTMLElement;
      if (id) {
        keep.add(id);
        const el = this.tileEl(id);
        if (el.parentElement !== slot) slot.append(el);
      }
    });
    for (const q of QUADRANTS) {
      const id = state.tray[q];
      if (id) {
        keep.add(id);
        const el = this.tileEl(id);
        if (el.parentElement !== this.traySlots[q]) this.traySlots[q].append(el);
      }
    }
    for (const [id, el] of this.tiles) {
      if (!keep.has(id)) {
        el.remove();
        this.tiles.delete(id);
      }
    }
    this.updateHud(state);
  }

  private updateHud(state: GameState, pileCounts = state.piles.map((p) => p.length)): void {
    this.solvedEl.textContent = `📸 ${state.solved.length} / ${state.photoIds.length}`;
    this.movesEl.textContent = `👣 ${state.moves}`;
    pileCounts.forEach((n, i) => {
      const pile = this.pileEls[i] as HTMLElement;
      pile.classList.toggle('empty', n === 0);
      pile.style.setProperty('--depth', String(Math.min(n, 6)));
      (pile.firstElementChild as HTMLElement).textContent = n ? String(n) : '';
    });
  }

  /** Animates engine events, then reconciles with the new state. Resolves when done. */
  async play(
    events: GameEvent[],
    next: GameState,
    sfx: (s: 'tap' | 'land' | 'match' | 'deal') => void,
  ): Promise<void> {
    const prevPiles = this.state.piles.map((p) => p.length);
    this.state = next;
    for (const e of events) {
      switch (e.type) {
        case 'placed':
          sfx('tap');
          moveWithFlip(this.tileEl(e.tileId), this.traySlots[e.to]);
          break;
        case 'replaced':
        case 'returned':
          sfx('land');
          moveWithFlip(this.tileEl(e.tileId), this.slotEls[e.to] as HTMLElement);
          break;
        case 'matched':
          this.busy = true;
          this.clearHint();
          await this.celebrate(e.photoId, sfx);
          break;
        case 'dealt': {
          const el = this.tileEl(e.tileId);
          const pile = this.pileEls[e.pile] as HTMLElement;
          const first = pile.getBoundingClientRect();
          (this.slotEls[e.to] as HTMLElement).append(el);
          prevPiles[e.pile] = (prevPiles[e.pile] ?? 1) - 1;
          this.updateHud(next, prevPiles);
          sfx('deal');
          flipFrom(el, first, 420);
          if (!reducedMotion()) await sleep(90);
          break;
        }
        case 'hint':
          this.showHint(e.tileIds);
          break;
        default:
          break;
      }
    }
    this.reconcile(next);
    this.busy = false;
  }

  private async celebrate(photoId: string, sfx: (s: 'match') => void): Promise<void> {
    const sliced = this.opts.photosById.get(photoId);
    const motion = !reducedMotion();
    await sleep(motion ? 320 : 50);
    this.trayEl.classList.add('merged');
    sfx('match');
    const r = this.trayEl.getBoundingClientRect();
    const popup = h(
      'div',
      { class: 'match-popup', role: 'status' },
      h(
        'figure',
        {},
        sliced ? h('img', { src: sliced.full, alt: sliced.photo.title }) : null,
        h('figcaption', {
          text: sliced ? `${sliced.photo.title}${sliced.photo.year ? ` · ${sliced.photo.year}` : ''}` : '',
        }),
      ),
    );
    document.body.append(popup);
    confetti(window.innerWidth / 2, window.innerHeight / 2);
    if (motion)
      await popup
        .animate(
          [
            { transform: `translateY(${r.top - window.innerHeight / 2}px) scale(.4)`, opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1.2)' },
        )
        .finished.catch(() => {});
    await sleep(1500);
    if (motion)
      await popup
        .animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.9)' }], {
          duration: 250,
          fill: 'forwards',
        })
        .finished.catch(() => {});
    popup.remove();
    // discard the 4 tiles towards the Album button
    const target = this.albumBtn.getBoundingClientRect();
    const anims = QUADRANTS.map((q) => {
      const el = this.traySlots[q].firstElementChild as HTMLElement | null;
      if (!el || !motion || typeof el.animate !== 'function') return Promise.resolve();
      const b = el.getBoundingClientRect();
      return el
        .animate(
          [
            { transform: 'none', opacity: 1 },
            {
              transform: `translate(${target.left - b.left}px, ${target.top - b.top}px) scale(.15)`,
              opacity: 0,
            },
          ],
          { duration: 380, easing: 'ease-in', fill: 'forwards' },
        )
        .finished.then(() => undefined)
        .catch(() => undefined);
    });
    await Promise.all(anims);
    for (const q of QUADRANTS) this.traySlots[q].replaceChildren();
    this.trayEl.classList.remove('merged');
  }

  showHint(tileIds: readonly TileId[]): void {
    this.clearHint();
    for (const id of tileIds) this.tiles.get(id)?.classList.add('hint');
    this.hintTimer = setTimeout(() => this.clearHint(), 3000);
  }

  private clearHint(): void {
    clearTimeout(this.hintTimer);
    for (const el of this.tiles.values()) el.classList.remove('hint');
  }
}
