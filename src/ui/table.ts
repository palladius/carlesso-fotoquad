import { parseTile } from '../engine/tiles';
import { QUADRANTS, type GameEvent, type GameState, type Quadrant, type TileId } from '../engine/types';
import type { SlicedPhoto } from '../platform/slicer';
import { at } from '../engine/util';
import { h, reducedMotion, sleep } from './dom';
import { confetti, flipFrom } from './fx';
import { computeTileSize } from './layout';

/**
 * Celebration timings (track rotation_ux_20261103, adversarially reviewed).
 * Auto path match → playable ≈ 2.6s (was ≈ 3.7s); a tap after ARM_MS skips it in ≈ 0.85s.
 */
export const TIMING = {
  PRE_MS: 150, // pause after the completing move (motion only)
  INTRO_MS: 320, // photo flies from the board into the popup
  HOLD_MS: 1400, // time the photo stays up after the intro: recognise the face, read the caption
  ARM_MS: 350, // taps before this (from popup append) are ignored: the completing gesture can't dismiss it
  FADE_MS: 180,
  FADE_DISMISS_MS: 100,
  DISCARD_MS: 250,
  DEAL_STAGGER_MS: 70,
  SWALLOW_MS: 500, // the click that follows a dismissing tap is swallowed
  POINTERUP_CAP_MS: 600, // keep the popup (shield) until the dismissing finger lifts, at most this long
  VICTORY_GUARD_MS: 400,
} as const;

const DISMISS_KEYS = new Set(['Enter', ' ', 'Escape']);

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
  private readonly traySlots: Record<Quadrant, HTMLElement>;
  private readonly pileCountEls: HTMLElement[] = [];
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
  private readonly liveEl: HTMLElement;
  /** Set when the player skips a celebration: the rest of the current move is fast-forwarded. */
  private hurry = false;
  private celebration: AbortController | null = null;
  /** Keyboard players get focus restored on the board after tiles are discarded. */
  private keyboardInput = false;
  private popupEl: HTMLElement | null = null;
  private confettiEl: HTMLElement | null = null;
  busy = false;

  constructor(
    private state: GameState,
    private readonly handlers: TableHandlers,
    private readonly opts: TableOptions,
  ) {
    this.trayMode = state.options.mode === 'tray';
    const piles = h('div', { class: 'piles', role: 'group', 'aria-label': 'Mazzi di pesca' });
    for (let i = 0; i < state.options.piles; i++) {
      const count = h('span', { class: 'pile-count' });
      this.pileCountEls.push(count);
      const pile = h('div', { class: 'pile' }, count);
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
        this.keyboardInput = true;
        this.tapSlot(i);
      });
      this.slotEls.push(slot);
      grid.append(slot);
    });
    const traySlot = (q: Quadrant) => h('div', { class: `tray-slot tray-${q}`, 'data-q': q });
    this.traySlots = { TL: traySlot('TL'), TR: traySlot('TR'), BL: traySlot('BL'), BR: traySlot('BR') };
    if (this.trayMode) {
      this.trayEl = h(
        'div',
        { class: 'tray', role: 'group', 'aria-label': 'Vassoio di ricomposizione' },
        ...QUADRANTS.map((q) => this.traySlots[q]),
      );
    }
    // role=img: a counter with an accessible name (aria-label is not allowed on a bare span)
    this.solvedEl = h('span', { class: 'hud-solved', role: 'img' });
    this.movesEl = h('span', { class: 'hud-moves', role: 'img' });
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
    this.liveEl = h('div', { class: 'sr-only', 'aria-live': 'polite' });
    this.root = h(
      'main',
      { class: `table mode-${state.options.mode}` },
      piles,
      grid,
      this.trayEl,
      hud,
      this.liveEl,
    );
    this.reconcile(state);
    window.addEventListener('resize', this.onResize);
    this.layout();
  }

  destroy(): void {
    this.celebration?.abort();
    this.popupEl?.remove();
    this.confettiEl?.remove();
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
          this.keyboardInput = true;
          this.tapSlot(this.state.grid.indexOf(id));
        }
      });
      this.tiles.set(id, tile);
    }
    return el;
  }

  private onPointerDown(e: PointerEvent, id: TileId, el: HTMLElement): void {
    this.keyboardInput = false;
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
      const slot = el.closest<HTMLElement>('.slot');
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

  private slot(i: number): HTMLElement {
    return at(this.slotEls, i);
  }

  private tileIn(parent: Element | undefined): HTMLElement | null {
    return parent?.querySelector<HTMLElement>('.tile') ?? null;
  }

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
      const slot = this.slot(i);
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
      const pile = at(this.pileEls, i);
      pile.classList.toggle('empty', n === 0);
      pile.style.setProperty('--depth', String(Math.min(n, 6)));
      at(this.pileCountEls, i).textContent = n ? String(n) : '';
    });
  }

  /** Animates engine events, then reconciles with the new state. */
  async play(events: GameEvent[], next: GameState, sfx: Sfx): Promise<void> {
    const prevPiles = this.state.piles.map((p) => p.length);
    this.state = next;
    this.hurry = false;
    let vacated: number | null = null;
    for (const e of events) {
      switch (e.type) {
        case 'swapped': {
          sfx('land');
          const moved = this.tileEl(e.moved);
          const first = this.dropRect?.id === e.moved ? this.dropRect.rect : moved.getBoundingClientRect();
          this.dropRect = null;
          const displaced = e.displaced ? this.tileEl(e.displaced) : null;
          const firstD = displaced?.getBoundingClientRect();
          this.slot(e.to).append(moved);
          if (displaced) this.slot(e.from).append(displaced);
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
          this.slot(e.to).append(el);
          this.setEmpty(e.to, false);
          flipFrom(el, first);
          break;
        }
        case 'matched': {
          this.busy = true;
          this.clearHint();
          const tiles = this.markSolved(e.slots, sfx);
          vacated ??= e.slots[0] ?? null;
          if (!this.hurry) {
            if (!reducedMotion()) await sleep(TIMING.PRE_MS);
            await this.celebrate(e.photoId, tiles);
          }
          await this.discard(e.slots, tiles);
          break;
        }
        case 'dealt': {
          const el = this.tileEl(e.tileId);
          const first = at(this.pileEls, e.pile).getBoundingClientRect();
          this.slot(e.to).append(el);
          this.setEmpty(e.to, false);
          prevPiles[e.pile] = (prevPiles[e.pile] ?? 1) - 1;
          this.updateHud(next, prevPiles);
          sfx('deal');
          flipFrom(el, first, 420);
          if (!reducedMotion() && !this.hurry) await sleep(TIMING.DEAL_STAGGER_MS);
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
    const active = document.activeElement;
    if (this.keyboardInput && vacated !== null && (!active || active === document.body)) {
      const slot = this.slot(vacated);
      (this.tileIn(slot) ?? slot).focus();
    }
  }

  private markSolved(slots: number[], sfx: Sfx): (HTMLElement | null)[] {
    const tiles = slots.length
      ? slots.map((i) => this.tileIn(this.slotEls[i]))
      : QUADRANTS.map((q) => this.tileIn(this.traySlots[q]));
    for (const t of tiles) t?.classList.add('solved');
    this.trayEl?.classList.toggle('merged', !slots.length);
    sfx('match');
    return tiles;
  }

  /**
   * Shows the completed photo. Auto-hides after INTRO + HOLD; one tap (anywhere) or Enter/Space/Escape
   * dismisses it once armed. The dismissing gesture is swallowed so it can't hit the board, HUD or victory screen.
   */
  private async celebrate(photoId: string, tiles: (HTMLElement | null)[]): Promise<void> {
    const sliced = this.opts.photosById.get(photoId);
    const motion = !reducedMotion();
    const caption = sliced
      ? `${sliced.photo.title}${sliced.photo.year ? ` · ${sliced.photo.year}` : ''}`
      : '';
    const ac = new AbortController();
    const { signal } = ac;
    this.celebration = ac;
    const first = tiles[0]?.getBoundingClientRect();
    const fig = h(
      'figure',
      {},
      sliced ? h('img', { src: sliced.full, alt: '' }) : null,
      h('figcaption', { text: caption }),
    );
    const popup = h('div', { class: 'match-popup', 'aria-hidden': 'true' }, fig);
    this.popupEl = popup;
    document.body.append(popup);
    this.liveEl.textContent = `Foto completata: ${caption}`;
    this.confettiEl = confetti(window.innerWidth / 2, window.innerHeight / 2);

    const armedAt = Date.now() + TIMING.ARM_MS;
    let dismissed = false;
    let downPointer: number | null = null;
    let resolveDismiss: () => void = () => {};
    let resolvePointerUp: () => void = () => {};
    const dismissedP = new Promise<void>((res) => (resolveDismiss = res));
    const pointerUpP = new Promise<void>((res) => (resolvePointerUp = res));
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((res) => timers.push(setTimeout(res, ms)));
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      this.hurry = true;
      resolveDismiss();
    };
    signal.addEventListener('abort', () => {
      dismissed = true;
      resolveDismiss();
      resolvePointerUp();
    });
    const swallowClickOnce = () => {
      const swallow = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), TIMING.SWALLOW_MS);
    };
    // Listen from the next task on, so the event that completed the photo can't reach these listeners.
    timers.push(
      setTimeout(() => {
        if (signal.aborted) return;
        const opts = { capture: true, signal };
        window.addEventListener(
          'pointerdown',
          (e) => {
            if (Date.now() < armedAt || e.isPrimary === false || e.button > 0) return;
            e.preventDefault();
            e.stopPropagation();
            if (dismissed) return;
            downPointer = e.pointerId ?? 1;
            swallowClickOnce();
            dismiss();
          },
          opts,
        );
        const lift = (e: PointerEvent) => {
          if (downPointer === null || (e.pointerId ?? 1) !== downPointer) return;
          e.stopPropagation();
          downPointer = null;
          resolvePointerUp();
        };
        window.addEventListener('pointerup', lift, opts);
        window.addEventListener('pointercancel', lift, opts);
        window.addEventListener(
          'keydown',
          (e) => {
            if (Date.now() < armedAt || e.repeat || !DISMISS_KEYS.has(e.key)) return;
            e.preventDefault();
            e.stopPropagation();
            dismiss();
          },
          opts,
        );
      }, 0),
    );

    try {
      let intro: Animation | null = null;
      if (motion && first && typeof fig.animate === 'function') {
        const r = fig.getBoundingClientRect();
        intro = fig.animate(
          [
            {
              transform: `translate(${first.left - r.left}px, ${first.top - r.top}px) scale(${(first.width * 2) / r.width})`,
              opacity: 0.6,
            },
            { transform: 'rotate(-2deg)', opacity: 1 },
          ],
          { duration: TIMING.INTRO_MS, easing: 'cubic-bezier(.2,.9,.3,1.15)' },
        );
      }
      const introDone = intro
        ? intro.finished.then(
            () => undefined,
            () => undefined,
          )
        : Promise.resolve();
      await Promise.race([introDone.then(() => wait(TIMING.HOLD_MS)), dismissedP]);
      if (dismissed && intro && intro.playState === 'running') {
        try {
          intro.finish();
        } catch {
          /* animation already gone */
        }
      }
      if (signal.aborted) return;
      if (motion && typeof popup.animate === 'function') {
        await popup
          .animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: dismissed ? TIMING.FADE_DISMISS_MS : TIMING.FADE_MS,
            fill: 'forwards',
          })
          .finished.catch(() => undefined);
      }
      // keep the shield until the dismissing finger lifts, so pointerup/click can't land underneath
      if (downPointer !== null) await Promise.race([pointerUpP, wait(TIMING.POINTERUP_CAP_MS)]);
    } finally {
      ac.abort();
      for (const t of timers) clearTimeout(t);
      popup.remove();
      if (this.hurry) this.confettiEl?.remove();
      if (this.popupEl === popup) this.popupEl = null;
      if (this.celebration === ac) this.celebration = null;
    }
  }

  /** The 4 tiles fly to the Album button and the slots are cleared. */
  private async discard(slots: number[], tiles: (HTMLElement | null)[]): Promise<void> {
    const motion = !reducedMotion();
    const target = this.albumBtn.getBoundingClientRect();
    await Promise.all(
      tiles.map((el) => {
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
            { duration: TIMING.DISCARD_MS, easing: 'ease-in', fill: 'forwards' },
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
