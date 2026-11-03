import { parseTile } from '../engine/tiles';
import { QUADRANTS, type GameEvent, type GameState, type Quadrant, type TileId } from '../engine/types';
import type { SlicedPhoto } from '../platform/slicer';
import { h, reducedMotion, sleep } from './dom';
import { confetti, flipFrom } from './fx';
import { computeTileSize } from './layout';

const Q_LABEL: Record<Quadrant, string> = {
  TL: 'alto sinistra',
  TR: 'alto destra',
  BL: 'basso sinistra',
  BR: 'basso destra',
};

export interface TableHandlers {
  onSwap(from: number, to: number): void;
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
  /** Immediate feedback sound for selections and drag starts. */
  tapSound?: () => void;
}

interface Drag {
  id: TileId;
  from: number;
  pointerId: number;
  x0: number;
  y0: number;
  dragging: boolean;
  target: number | null;
}

type Sfx = (s: 'tap' | 'land' | 'match' | 'deal') => void;

/** Renders the tableau, handles drag & drop / tap-tap swaps and animates engine events (FR-3, FR-4). */
export class TableView {
  readonly root: HTMLElement;
  private readonly pileEls: HTMLElement[] = [];
  private readonly slotEls: HTMLElement[] = [];
  private readonly tiles = new Map<TileId, HTMLButtonElement>();
  private readonly trayEl: HTMLElement | null = null;
  private readonly traySlots = {} as Record<Quadrant, HTMLElement>;
  private readonly trayMode: boolean;
  private readonly solvedEl: HTMLElement;
  private readonly movesEl: HTMLElement;
  private readonly albumBtn: HTMLButtonElement;
  private hintTimer: ReturnType<typeof setTimeout> | undefined;
  private drag: Drag | null = null;
  private selected: number | null = null;
  /** Visual rect of the tile just dropped, so the swap animation starts where the finger left it. */
  private dropRect: { id: TileId; rect: DOMRect } | null = null;
  private onResize = () => this.layout();
  busy = false;

  constructor(
    private state: GameState,
    private readonly handlers: TableHandlers,
    private readonly opts: TableOptions,
  ) {
    this.trayMode = state.options.mode === 'tray';
    const piles = h('div', { class: 'piles', 'aria-label': 'Mazzi di pesca' });
    for (let i = 0; i < state.options.piles; i++) {
      const pile = h('div', { class: 'pile' }, h('span', { class: 'pile-count' }));
      this.pileEls.push(pile);
      piles.append(pile);
    }
    const grid = h('div', { class: 'grid', role: 'group', 'aria-label': 'Tavolo' });
    grid.style.setProperty('--cols', String(state.options.columns));
    state.grid.forEach((_, i) => {
      const slot = h('div', { class: 'slot', 'data-slot': i });
      slot.addEventListener('click', () => {
        if (!slot.firstElementChild) this.tapSlot(i);
      });
      slot.addEventListener('keydown', (e) => {
        if (slot.firstElementChild || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        this.tapSlot(i);
      });
      this.slotEls.push(slot);
      grid.append(slot);
    });
    if (this.trayMode) {
      this.trayEl = h('div', { class: 'tray', role: 'group', 'aria-label': 'Vassoio di ricomposizione' });
      for (const q of QUADRANTS) {
        const slot = h('div', { class: `tray-slot tray-${q}`, 'data-q': q });
        this.traySlots[q] = slot;
        this.trayEl.append(slot);
      }
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
    this.root = h('main', { class: `table mode-${state.options.mode}` }, piles, grid, this.trayEl, hud);
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
    const { w, h: th } = computeTileSize(
      window.innerWidth,
      window.innerHeight,
      this.state.options.columns,
      this.state.grid.length / this.state.options.columns + (this.trayMode ? 2.3 : 0),
    );
    this.root.style.setProperty('--tile-w', `${w}px`);
    this.root.style.setProperty('--tile-h', `${th}px`);
  }

  // ---------- input ----------

  private tileEl(id: TileId): HTMLButtonElement {
    let el = this.tiles.get(id);
    if (!el) {
      const { photoId, quadrant } = parseTile(id);
      const src = this.opts.photosById.get(photoId)?.quadrants[quadrant];
      el = h('button', { class: 'tile', 'data-tile': id, 'aria-label': `Tessera ${Q_LABEL[quadrant]}` });
      if (src) el.style.backgroundImage = `url("${src}")`;
      const tile = el;
      tile.addEventListener('pointerdown', (e) => this.onPointerDown(e, id, tile));
      tile.addEventListener('pointermove', (e) => this.onPointerMove(e, tile));
      tile.addEventListener('pointerup', (e) => this.onPointerUp(e, tile));
      tile.addEventListener('pointercancel', () => this.cancelDrag(tile));
      tile.addEventListener('click', () => {
        if (this.trayMode) this.trayModeTap(id);
      });
      tile.addEventListener('keydown', (e) => {
        if (this.trayMode) return; // native button click handles Enter/Space
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.tapSlot(this.state.grid.indexOf(id));
        }
      });
      this.tiles.set(id, tile);
    }
    return el;
  }

  private onPointerDown(e: PointerEvent, id: TileId, el: HTMLElement): void {
    if (this.busy || e.button > 0 || this.trayMode) return;
    const from = this.state.grid.indexOf(id);
    if (from < 0) return;
    el.setPointerCapture?.(e.pointerId);
    this.drag = {
      id,
      from,
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      dragging: false,
      target: null,
    };
  }

  private onPointerMove(e: PointerEvent, el: HTMLElement): void {
    const d = this.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.dragging && Math.hypot(dx, dy) < 8) return;
    if (!d.dragging) {
      d.dragging = true;
      this.select(null);
      this.opts.tapSound?.();
      el.classList.add('dragging');
    }
    el.style.translate = `${dx}px ${dy}px`;
    const target = this.slotAt(e.clientX, e.clientY);
    if (target !== d.target) {
      if (d.target !== null) this.slotEls[d.target]?.classList.remove('drop-target');
      d.target = target !== null && target !== d.from ? target : null;
      if (d.target !== null) this.slotEls[d.target]?.classList.add('drop-target');
    }
  }

  private onPointerUp(e: PointerEvent, el: HTMLElement): void {
    const d = this.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.dragging) {
      this.drag = null;
      this.tapSlot(d.from);
      return;
    }
    const rect = el.getBoundingClientRect();
    this.cancelDrag(el);
    if (d.target !== null) {
      this.dropRect = { id: d.id, rect };
      this.handlers.onSwap(d.from, d.target);
    } else {
      flipFrom(el, rect, 200); // snap back
    }
  }

  private cancelDrag(el: HTMLElement): void {
    const d = this.drag;
    if (d?.target !== null && d?.target !== undefined)
      this.slotEls[d.target]?.classList.remove('drop-target');
    el.classList.remove('dragging');
    el.style.translate = '';
    this.drag = null;
  }

  private slotAt(x: number, y: number): number | null {
    for (const el of document.elementsFromPoint(x, y)) {
      const slot = (el as HTMLElement).closest?.('.slot') as HTMLElement | null;
      if (slot && this.root.contains(slot)) return Number(slot.dataset.slot);
    }
    return null;
  }

  /** Facile: tap a grid tile → tray; tap a tray tile → back to the grid. */
  private trayModeTap(id: TileId): void {
    if (this.busy) return;
    const q = QUADRANTS.find((x) => this.state.tray[x] === id);
    if (q) this.handlers.onTrayTap(q);
    else {
      const i = this.state.grid.indexOf(id);
      if (i >= 0) this.handlers.onGridTap(i);
    }
  }

  /** Tap-tap alternative: first tap selects, second tap on another slot swaps. */
  private tapSlot(i: number): void {
    if (this.busy || i < 0 || this.trayMode) return;
    if (this.selected === null) {
      if (this.state.grid[i]) {
        this.select(i);
        this.opts.tapSound?.();
      }
    } else if (this.selected === i) {
      this.select(null);
    } else {
      const from = this.selected;
      this.select(null);
      this.handlers.onSwap(from, i);
    }
  }

  private select(i: number | null): void {
    if (this.selected !== null) this.slotEls[this.selected]?.firstElementChild?.classList.remove('selected');
    this.selected = i;
    if (i !== null) this.slotEls[i]?.firstElementChild?.classList.add('selected');
  }

  // ---------- rendering ----------

  /** Empty slots are keyboard targets (move a tile into a hole); filled slots delegate to their tile. */
  private setEmpty(i: number, empty: boolean): void {
    const slot = this.slotEls[i];
    if (!slot) return;
    slot.classList.toggle('empty', empty);
    if (empty) {
      slot.setAttribute('tabindex', '0');
      slot.setAttribute('role', 'button');
      slot.setAttribute('aria-label', 'Spazio vuoto');
    } else {
      slot.removeAttribute('tabindex');
      slot.removeAttribute('role');
      slot.removeAttribute('aria-label');
    }
  }

  /** Brings the DOM in line with `state` without animation. */
  reconcile(state: GameState): void {
    this.state = state;
    const keep = new Set<TileId>();
    state.grid.forEach((id, i) => {
      const slot = this.slotEls[i] as HTMLElement;
      this.setEmpty(i, !id);
      if (id) {
        keep.add(id);
        const el = this.tileEl(id);
        if (el.parentElement !== slot) slot.append(el);
      }
    });
    for (const q of QUADRANTS) {
      const id = state.tray[q];
      if (id && this.trayEl) {
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
    this.solvedEl.setAttribute(
      'aria-label',
      `Foto risolte: ${state.solved.length} di ${state.photoIds.length}`,
    );
    this.solvedEl.title = 'Foto risolte';
    this.movesEl.textContent = `👣 ${state.moves}`;
    this.movesEl.setAttribute('aria-label', `Mosse: ${state.moves}`);
    this.movesEl.title = 'Mosse';
    pileCounts.forEach((n, i) => {
      const pile = this.pileEls[i] as HTMLElement;
      pile.classList.toggle('empty', n === 0);
      pile.style.setProperty('--depth', String(Math.min(n, 6)));
      (pile.firstElementChild as HTMLElement).textContent = n ? String(n) : '';
    });
  }

  /** Animates engine events, then reconciles with the new state. */
  async play(events: GameEvent[], next: GameState, sfx: Sfx): Promise<void> {
    const prevPiles = this.state.piles.map((p) => p.length);
    this.state = next;
    for (const e of events) {
      switch (e.type) {
        case 'swapped': {
          sfx('land');
          const moved = this.tileEl(e.moved);
          const first = this.dropRect?.id === e.moved ? this.dropRect.rect : moved.getBoundingClientRect();
          this.dropRect = null;
          const displaced = e.displaced ? this.tileEl(e.displaced) : null;
          const firstD = displaced?.getBoundingClientRect();
          (this.slotEls[e.to] as HTMLElement).append(moved);
          if (displaced) (this.slotEls[e.from] as HTMLElement).append(displaced);
          this.setEmpty(e.from, !displaced);
          this.setEmpty(e.to, false);
          flipFrom(moved, first, 220);
          if (displaced && firstD) flipFrom(displaced, firstD, 260);
          break;
        }
        case 'placed': {
          sfx('tap');
          const el = this.tileEl(e.tileId);
          const first = el.getBoundingClientRect();
          this.traySlots[e.to].append(el);
          this.setEmpty(e.from, true);
          flipFrom(el, first);
          break;
        }
        case 'replaced':
        case 'returned': {
          sfx('land');
          const el = this.tileEl(e.tileId);
          const first = el.getBoundingClientRect();
          (this.slotEls[e.to] as HTMLElement).append(el);
          this.setEmpty(e.to, false);
          flipFrom(el, first);
          break;
        }
        case 'matched':
          this.busy = true;
          this.clearHint();
          if (!reducedMotion()) await sleep(260);
          await this.celebrate(e.photoId, e.slots, sfx);
          break;
        case 'dealt': {
          const el = this.tileEl(e.tileId);
          const first = (this.pileEls[e.pile] as HTMLElement).getBoundingClientRect();
          (this.slotEls[e.to] as HTMLElement).append(el);
          this.setEmpty(e.to, false);
          prevPiles[e.pile] = (prevPiles[e.pile] ?? 1) - 1;
          this.updateHud(next, prevPiles);
          sfx('deal');
          flipFrom(el, first, 420);
          if (!reducedMotion()) await sleep(110);
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

  private async celebrate(photoId: string, slots: number[], sfx: Sfx): Promise<void> {
    const sliced = this.opts.photosById.get(photoId);
    const motion = !reducedMotion();
    const blockTiles = slots.length
      ? slots.map((i) => this.slotEls[i]?.firstElementChild as HTMLElement | null)
      : QUADRANTS.map((q) => this.traySlots[q]?.firstElementChild as HTMLElement | null);
    for (const t of blockTiles) t?.classList.add('solved');
    this.trayEl?.classList.toggle('merged', !slots.length);
    sfx('match');
    const first = blockTiles[0]?.getBoundingClientRect();
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
    const fig = popup.firstElementChild as HTMLElement;
    if (motion && first) {
      const r = fig.getBoundingClientRect();
      await fig
        .animate(
          [
            {
              transform: `translate(${first.left - r.left}px, ${first.top - r.top}px) scale(${(first.width * 2) / r.width})`,
              opacity: 0.6,
            },
            { transform: 'rotate(-2deg)', opacity: 1 },
          ],
          { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1.15)' },
        )
        .finished.catch(() => undefined);
    }
    await sleep(1500);
    if (motion)
      await popup
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' })
        .finished.catch(() => undefined);
    popup.remove();
    const target = this.albumBtn.getBoundingClientRect();
    await Promise.all(
      blockTiles.map((el) => {
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
      }),
    );
    for (const i of slots) {
      this.slotEls[i]?.replaceChildren();
      this.setEmpty(i, true);
    }
    if (!slots.length) for (const q of QUADRANTS) this.traySlots[q]?.replaceChildren();
    this.trayEl?.classList.remove('merged');
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
