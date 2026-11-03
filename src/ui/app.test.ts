import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { completablePhotos } from '../engine/dealer';
import { tileId } from '../engine/tiles';
import { QUADRANTS, type Photo } from '../engine/types';
import type { GameAudio, Sound } from '../platform/audio';
import type { SlicedPhoto } from '../platform/slicer';
import { createStorage } from '../platform/storage';
import { createGame } from '../engine/game';
import { reduce } from '../engine/reducer';
import { App, optionsFor } from './app';
import { victoryScreen } from './screens';
import { TableView, TIMING } from './table';

const PHOTOS: Photo[] = [
  ...['a', 'b', 'c'].map((id) => ({
    id,
    src: `${id}.jpg`,
    title: `Gamberone ${id}`,
    year: 2026,
    tags: ['gamberone'],
  })),
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `k${i}`,
    src: `k${i}.jpg`,
    title: `Bimbi ${i}`,
    tags: ['ale', 'viaggi'],
  })),
];

const fakeSlice = (photos: Photo[]): Promise<SlicedPhoto[]> =>
  Promise.resolve(
    photos.map((photo) => ({
      photo,
      full: `blob:${photo.id}`,
      quadrants: Object.fromEntries(
        QUADRANTS.map((q) => [q, `blob:${photo.id}-${q}`]),
      ) as SlicedPhoto['quadrants'],
    })),
  );

function fakeAudio(): GameAudio & { play: Mock<(s: Sound) => void> } {
  let muted = false;
  return {
    unlock: vi.fn(),
    play: vi.fn<(s: Sound) => void>(),
    setMuted: (m: boolean) => (muted = m),
    get muted() {
      return muted;
    },
  };
}

function pointer(el: Element, type: string, x = 0, y = 0) {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  el.dispatchEvent(e);
}

const tap = (el: Element) => {
  pointer(el, 'pointerdown');
  pointer(el, 'pointerup');
};

let root: HTMLElement;
let audio: ReturnType<typeof fakeAudio>;
let slice: typeof fakeSlice;

function makeApp(seed = 7, photos: Photo[] = PHOTOS) {
  return new App({
    root,
    photos,
    storage: createStorage(window.localStorage),
    audio,
    slice: (p) => slice(p),
    now: () => 1000,
    seed: () => seed,
  });
}

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel) as T;
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)];
const flush = () => vi.advanceTimersByTimeAsync(10_000);
const slotEl = (i: number) => $(`.slot[data-slot="${i}"]`);
const tileAt = (i: number) => slotEl(i).querySelector('.tile') as HTMLElement;

async function start(app: App, level: 'facile' | 'medio' | 'difficile') {
  app.showStart();
  $(`[data-level="${level}"]`).click();
  await flush();
}

const THREE = PHOTOS.slice(0, 3);

/** Solves one completable photo by swapping its tiles into slots 0,1,5,6 through the app. */
async function solveOne(app: App) {
  const s = app.currentState!;
  const photo = completablePhotos(s)[0] as string;
  const targets = [0, 1, 5, 6];
  for (let k = 0; k < 4; k++) {
    const st = app.currentState!;
    const from = st.grid.indexOf(tileId(photo, QUADRANTS[k] as (typeof QUADRANTS)[number]));
    if (from < 0 || from === targets[k]) continue;
    const pending = app.dispatch({ type: 'SWAP', from, to: targets[k] as number, now: 2000 });
    await flush();
    await pending;
    if (app.currentState!.solved.includes(photo)) break;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = $('#app');
  audio = fakeAudio();
  slice = fakeSlice;
  window.matchMedia = ((q: string) => ({
    matches: q.includes('reduce'),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('start screen', () => {
  it('offers just three level buttons and the album (FR-1)', () => {
    const app = makeApp();
    app.showStart();
    expect($$('[data-level]').map((b) => b.dataset.level)).toEqual(['facile', 'medio', 'difficile']);
    expect($('[data-pack]')).toBeNull();
    expect($('.resume')).toBeNull();
    expect($('.album-btn').textContent).toContain('Album (0)');
    root.dispatchEvent(new Event('pointerdown'));
    expect(audio.unlock).toHaveBeenCalled();
  });

  it('a level button starts a game with that level and its photo count (FR-2)', async () => {
    const app = makeApp();
    await start(app, 'difficile');
    expect(app.currentState?.options).toMatchObject({ mode: 'grid', maxCompletable: 1 });
    expect(app.currentState?.photoIds).toHaveLength(12); // library (12) < 24
    expect(createStorage(localStorage).difficulty()).toBe('difficile');
    $('[aria-label="Menu"]').click();
    await start(app, 'facile');
    expect(app.currentState?.options.mode).toBe('tray');
    expect(app.currentState?.photoIds).toHaveLength(6);
  });

  it('consecutive games rotate photos (FR-3)', async () => {
    const lib = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, src: '', title: `R${i}`, tags: [] }));
    const app = makeApp(1, lib);
    await start(app, 'facile');
    const first = [...app.currentState!.photoIds];
    $('[aria-label="Menu"]').click();
    const app2 = makeApp(2, lib);
    await start(app2, 'facile');
    const second = app2.currentState!.photoIds;
    expect(second.filter((id) => first.includes(id))).toEqual([]);
  });

  it('maps difficulty to engine options', () => {
    expect(optionsFor('facile')).toMatchObject({ mode: 'tray' });
    expect(optionsFor('medio')).toMatchObject({ mode: 'grid', maxCompletable: 3 });
    expect(optionsFor('difficile')).toMatchObject({ mode: 'grid', maxCompletable: 1 });
  });
});

describe('grid mode table', () => {
  it('renders piles, a full tableau and the HUD', async () => {
    const app = makeApp();
    await start(app, 'medio');
    expect($$('.pile')).toHaveLength(5);
    expect($$('.grid .tile')).toHaveLength(30);
    expect($('.hud-solved').textContent).toBe('📸 0 / 12');
    expect($('.hud-moves').textContent).toBe('👣 0');
    expect($('.tray')).toBeNull();
    expect(tileAt(0).style.backgroundImage).toContain('blob:');
  });

  it('tap-tap swaps two tiles and taps on the same tile deselect', async () => {
    const app = makeApp();
    await start(app, 'medio');
    const [a, b] = [tileAt(2).dataset.tile, tileAt(9).dataset.tile];
    tap(tileAt(2));
    expect(tileAt(2).classList.contains('selected')).toBe(true);
    tap(tileAt(2));
    expect(tileAt(2).classList.contains('selected')).toBe(false);
    tap(tileAt(2));
    tap(tileAt(9));
    await flush();
    expect(tileAt(9).dataset.tile).toBe(a);
    expect(tileAt(2).dataset.tile).toBe(b);
    expect($('.hud-moves').textContent).toBe('👣 1');
    expect(audio.play).toHaveBeenCalledWith('land');
  });

  it('keyboard Enter/Space selects and swaps', async () => {
    const app = makeApp();
    await start(app, 'medio');
    const a = tileAt(0).dataset.tile;
    tileAt(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    tileAt(4).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await flush();
    expect(tileAt(4).dataset.tile).toBe(a);
  });

  it('drag & drop swaps onto the slot under the pointer; dropping nowhere cancels', async () => {
    const app = makeApp();
    await start(app, 'medio');
    const a = tileAt(3).dataset.tile;
    const target = slotEl(20);
    document.elementsFromPoint = vi.fn(() => [target]);
    const el = tileAt(3);
    pointer(el, 'pointerdown', 10, 10);
    pointer(el, 'pointermove', 12, 11); // below the drag threshold
    expect(el.classList.contains('dragging')).toBe(false);
    pointer(el, 'pointermove', 80, 200);
    expect(el.classList.contains('dragging')).toBe(true);
    expect(target.classList.contains('drop-target')).toBe(true);
    pointer(el, 'pointerup', 80, 200);
    await flush();
    expect(tileAt(20).dataset.tile).toBe(a);
    expect(target.classList.contains('drop-target')).toBe(false);

    document.elementsFromPoint = vi.fn(() => []);
    const moves = app.currentState!.moves;
    const el2 = tileAt(5);
    pointer(el2, 'pointerdown', 0, 0);
    pointer(el2, 'pointermove', 300, 300);
    pointer(el2, 'pointerup', 300, 300);
    await flush();
    expect(app.currentState!.moves).toBe(moves);
    pointer(el2, 'pointerdown', 0, 0);
    el2.dispatchEvent(new Event('pointercancel'));
    expect(el2.classList.contains('dragging')).toBe(false);
  });

  it('HUD counters have accessible labels (FR-3)', async () => {
    const app = makeApp();
    await start(app, 'medio');
    expect($('.hud-solved').getAttribute('aria-label')).toBe('Foto risolte: 0 di 12');
    expect($('.hud-moves').getAttribute('aria-label')).toBe('Mosse: 0');
  });

  it('selecting a tile or starting a drag gives immediate tap feedback (guidelines UX #2)', async () => {
    const app = makeApp();
    await start(app, 'medio');
    audio.play.mockClear();
    tap(tileAt(2));
    expect(audio.play).toHaveBeenCalledWith('tap');
    tap(tileAt(2));
    audio.play.mockClear();
    document.elementsFromPoint = vi.fn(() => []);
    pointer(tileAt(4), 'pointerdown', 0, 0);
    pointer(tileAt(4), 'pointermove', 100, 100);
    expect(audio.play).toHaveBeenCalledWith('tap');
    pointer(tileAt(4), 'pointerup', 100, 100);
  });

  it('keyboard can move a tile into an empty slot (FR-4.1 / AC-5)', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio'); // 12 tiles on a 15-slot tableau: 3 empty slots
    const empty = $$('.slot.empty')[0] as HTMLElement;
    expect(empty.getAttribute('tabindex')).toBe('0');
    expect(empty.getAttribute('aria-label')).toBe('Spazio vuoto');
    const to = Number(empty.dataset.slot);
    const id = tileAt(0).dataset.tile;
    tileAt(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    empty.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    expect(tileAt(to).dataset.tile).toBe(id);
    expect(slotEl(0).classList.contains('empty')).toBe(true);
    expect(slotEl(0).getAttribute('tabindex')).toBe('0');
    expect(slotEl(to).hasAttribute('tabindex')).toBe(false);
  });

  it('hint highlights the 4 tiles of a completable photo for ~3s', async () => {
    const app = makeApp();
    await start(app, 'medio');
    $('.hint-btn').click();
    await vi.advanceTimersByTimeAsync(10);
    expect($$('.tile.hint')).toHaveLength(4);
    await vi.advanceTimersByTimeAsync(3100);
    expect($$('.tile.hint')).toHaveLength(0);
    expect(app.currentState!.hintsUsed).toBe(1);
  });

  it('mute toggle is persisted', async () => {
    const app = makeApp();
    await start(app, 'medio');
    const btn = $('[aria-label="Audio"]');
    btn.click();
    expect(btn.textContent).toBe('🔇');
    expect(createStorage(localStorage).muted()).toBe(true);
    btn.click();
    expect(btn.textContent).toBe('🔊');
  });

  it('plays a full game to victory, unlocks the album and restarts', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    for (let i = 0; i < 3; i++) await solveOne(app);
    expect($('.victory')).not.toBeNull();
    expect($('.victory').textContent).toContain('Nuovo record');
    expect(audio.play).toHaveBeenCalledWith('match');
    expect(audio.play).toHaveBeenCalledWith('victory');
    expect(createStorage(localStorage).unlocked().sort()).toEqual(['a', 'b', 'c']);
    expect(createStorage(localStorage).loadGame()).toBeNull();

    // album from the victory screen
    [...$$('.victory button')].find((b) => b.textContent?.includes('Album'))?.click();
    expect($('.album-counter').textContent).toBe('1 / 3');
    $('[aria-label="Successiva"]').click();
    expect($('.album-counter').textContent).toBe('2 / 3');
    $('[aria-label="Precedente"]').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect($('.album-counter').textContent).toBe('3 / 3');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    const fig = $('.album-figure');
    pointer(fig, 'pointerdown', 200, 0);
    pointer(fig, 'pointerup', 100, 0);
    expect($('.album-counter').textContent).toBe('2 / 3');
    pointer(fig, 'pointerup', 100, 0); // no pointerdown: ignored
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect($('.album')).toBeNull();

    [...$$('.victory button')].find((b) => b.textContent?.includes('Gioca ancora'))?.click();
    await flush();
    expect($('.hud-solved').textContent).toBe('📸 0 / 3');
  });

  it('victory menu button returns to the start screen showing the record', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    for (let i = 0; i < 3; i++) await solveOne(app);
    [...$$('.victory button')].find((b) => b.textContent?.includes('Menu'))?.click();
    expect($('[data-level="medio"]').textContent).toContain('🏆');
  });

  it('resumes an in-progress game from the start screen', async () => {
    const app = makeApp();
    await start(app, 'medio');
    const pending = app.dispatch({ type: 'SWAP', from: 0, to: 1 });
    await flush();
    await pending;
    const grid = [...app.currentState!.grid];
    $('[aria-label="Menu"]').click();
    const resume = $('.resume');
    expect(resume.textContent).toContain('Continua');
    const app2 = makeApp(99);
    app2.showStart();
    $('.resume').click();
    await flush();
    expect(app2.currentState!.grid).toEqual(grid);
    expect(app2.currentState!.moves).toBe(1);
  });

  it('starts fresh when some photos of a saved game cannot be sliced', async () => {
    const app = makeApp();
    await start(app, 'medio');
    slice = (p) => fakeSlice(p.slice(1));
    const app2 = makeApp();
    app2.showStart();
    $('.resume').click();
    await flush();
    expect(app2.currentState!.photoIds).toHaveLength(11);
  });

  it('opens an empty album from the start screen', () => {
    const app = makeApp();
    app.showStart();
    $('.album-btn').click();
    expect($('.album-empty')).not.toBeNull();
    $('[aria-label="Chiudi"]').click();
    expect($('[data-level]')).not.toBeNull();
  });
});

describe('tray mode (Facile)', () => {
  it('tap sends a tile to the tray and back; full game ends in victory', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'facile');
    expect($('.tray')).not.toBeNull();
    const id = tileAt(0).dataset.tile as string;
    tileAt(0).click();
    await flush();
    expect($(`.tray [data-tile="${id}"]`)).not.toBeNull();
    expect(slotEl(0).classList.contains('empty')).toBe(true);
    $(`.tray [data-tile="${id}"]`).click();
    await flush();
    expect($(`.grid [data-tile="${id}"]`)).not.toBeNull();
    // drag is disabled in tray mode
    pointer(tileAt(1), 'pointerdown');
    pointer(tileAt(1), 'pointermove', 200, 200);
    expect(tileAt(1).classList.contains('dragging')).toBe(false);

    for (let i = 0; i < 3; i++) {
      const photo = completablePhotos(app.currentState!)[0] as string;
      for (const q of QUADRANTS) {
        $(`.grid [data-tile="${tileId(photo, q)}"]`)?.click();
        await flush();
      }
    }
    expect($('.victory')).not.toBeNull();
  });

  it('a conflicting tile replaces the tray tile, which returns to the grid', async () => {
    const app = makeApp();
    await start(app, 'facile');
    const tl = $$('.grid .tile').filter((t) => t.dataset.tile?.endsWith('#TL'));
    const [first, second] = [tl[0]!.dataset.tile!, tl[1]!.dataset.tile!];
    $(`[data-tile="${first}"]`).click();
    await flush();
    $(`[data-tile="${second}"]`).click();
    await flush();
    expect($(`.tray [data-tile="${second}"]`)).not.toBeNull();
    expect($(`.grid [data-tile="${first}"]`)).not.toBeNull();
  });
});

describe('animations enabled', () => {
  it('runs FLIP, confetti, popup and discard animations without errors', async () => {
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const anim = { finished: Promise.resolve() };
    Element.prototype.animate = vi.fn(() => anim as unknown as Animation);
    const rect = {
      left: 10,
      top: 10,
      width: 60,
      height: 80,
      right: 70,
      bottom: 90,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    for (let i = 0; i < 3; i++) await solveOne(app);
    expect(Element.prototype.animate).toHaveBeenCalled();
    expect($('.victory')).not.toBeNull();
    await flush();
    expect($('.confetti')).toBeNull(); // cleaned up
    vi.restoreAllMocks();
    delete (Element.prototype as { animate?: unknown }).animate;
  });
});

describe('celebration popup (adversarially reviewed)', () => {
  /** Swaps tiles of a completable photo; returns the still-pending dispatch of the swap that completes it. */
  async function swapUntilMatch(app: App): Promise<{ done: Promise<void> }> {
    const photo = completablePhotos(app.currentState!)[0] as string;
    const targets = [0, 1, 5, 6];
    for (let k = 0; k < 4; k++) {
      const st = app.currentState!;
      const from = st.grid.indexOf(tileId(photo, QUADRANTS[k] as (typeof QUADRANTS)[number]));
      if (from === targets[k]) continue;
      const action = { type: 'SWAP' as const, from, to: targets[k] as number, now: 2000 };
      if (reduce(st, action).events.some((e) => e.type === 'matched')) return { done: app.dispatch(action) };
      const p = app.dispatch(action);
      await flush();
      await p;
    }
    throw new Error('no match');
  }
  const popup = () => document.querySelector('.match-popup');
  const winPointer = (type: string) => pointer(document.body, type);

  it('auto-dismisses after HOLD_MS and announces the photo in a live region', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    const { done: pending } = await swapUntilMatch(app);
    await vi.advanceTimersByTimeAsync(0);
    expect(popup()).not.toBeNull();
    expect(popup()?.getAttribute('aria-hidden')).toBe('true');
    expect($('.sr-only[aria-live="polite"]').textContent).toMatch(/^Foto completata: Gamberone /);
    await vi.advanceTimersByTimeAsync(TIMING.HOLD_MS - 20);
    expect(popup()).not.toBeNull();
    await vi.advanceTimersByTimeAsync(40);
    expect(popup()).toBeNull();
    await flush();
    await pending;
  });

  it('one tap after the arm delay dismisses it at once and the board is playable again', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    const { done: pending } = await swapUntilMatch(app);
    await vi.advanceTimersByTimeAsync(TIMING.ARM_MS + 10);
    winPointer('pointerdown');
    winPointer('pointerup');
    await vi.advanceTimersByTimeAsync(TIMING.FADE_DISMISS_MS + 5);
    expect(popup()).toBeNull();
    await vi.advanceTimersByTimeAsync(TIMING.DISCARD_MS + 50);
    await pending;
    const moves = app.currentState!.moves;
    const p = app.dispatch({ type: 'SWAP', from: 10, to: 11 });
    await flush();
    await p;
    expect(app.currentState!.moves).toBe(moves + 1);
  });

  it('ignores taps before the arm delay (the completing gesture cannot dismiss its own popup)', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    const { done: pending } = await swapUntilMatch(app);
    await vi.advanceTimersByTimeAsync(100);
    winPointer('pointerdown');
    await vi.advanceTimersByTimeAsync(10);
    expect(popup()).not.toBeNull();
    await flush();
    await pending;
  });

  it('tray mode: the click that completes the photo does not dismiss it', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'facile');
    const photo = completablePhotos(app.currentState!)[0] as string;
    for (const q of QUADRANTS) {
      $(`.grid [data-tile="${tileId(photo, q)}"]`)?.click();
      if (q !== 'BR') await flush();
    }
    await vi.advanceTimersByTimeAsync(TIMING.ARM_MS - 5);
    expect(popup()).not.toBeNull();
    await flush();
  });

  it('keyboard: repeat and Tab are ignored, Escape/Enter/Space dismiss after arming', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    const { done: pending } = await swapUntilMatch(app);
    await vi.advanceTimersByTimeAsync(TIMING.ARM_MS + 10);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    await vi.advanceTimersByTimeAsync(5);
    expect(popup()).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await vi.advanceTimersByTimeAsync(TIMING.FADE_DISMISS_MS + 5);
    expect(popup()).toBeNull();
    await flush();
    await pending;
  });

  it('swallows the dismissing tap: it never reaches the HUD (no accidental Menu)', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    const { done: pending } = await swapUntilMatch(app);
    await vi.advanceTimersByTimeAsync(TIMING.ARM_MS + 10);
    const menu = $('[aria-label="Menu"]');
    pointer(menu, 'pointerdown');
    pointer(menu, 'pointerup');
    menu.click();
    await flush();
    await pending;
    expect($('[data-level]')).toBeNull(); // still in the game
    expect($('.grid')).not.toBeNull();
  });

  it('double dismiss is idempotent and leaves no timers or listeners behind', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    const { done: pending } = await swapUntilMatch(app);
    await vi.advanceTimersByTimeAsync(TIMING.ARM_MS + 10);
    winPointer('pointerdown');
    winPointer('pointerdown');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    winPointer('pointerup');
    await flush();
    await pending;
    expect(vi.getTimerCount()).toBe(0);
    expect(app.currentState!.solved).toHaveLength(1);
    // a later Escape is not swallowed and does nothing
    const ev = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('leaving the game mid-celebration removes the popup and never shows a stale victory', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    await solveOne(app);
    await solveOne(app);
    const { done: pending } = await swapUntilMatch(app); // last photo → victory would follow
    await vi.advanceTimersByTimeAsync(10);
    expect(popup()).not.toBeNull();
    app.showStart();
    expect(popup()).toBeNull();
    await flush();
    await pending;
    expect($('.victory')).toBeNull();
    expect($('[data-level]')).not.toBeNull();
  });

  it('victory buttons ignore clicks for the first 400ms (a held finger cannot press them)', async () => {
    const onAgain = vi.fn();
    const el = victoryScreen({
      photos: 3,
      moves: 9,
      hints: 0,
      durationMs: 1000,
      newRecord: false,
      onAgain,
      onAlbum: vi.fn(),
      onMenu: vi.fn(),
    });
    document.body.append(el);
    const again = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Gioca ancora'))!;
    again.click();
    expect(onAgain).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(TIMING.VICTORY_GUARD_MS + 1);
    again.click();
    expect(onAgain).toHaveBeenCalledTimes(1);
  });

  it('several matches in one move: a tap skips the remaining popups too (hurry mode)', async () => {
    const lib = PHOTOS.slice(0, 3);
    const sliced = new Map((await fakeSlice(lib)).map((s) => [s.photo.id, s]));
    const state = createGame(lib, 3);
    const table = new TableView(
      state,
      {
        onSwap: vi.fn(),
        onGridTap: vi.fn(),
        onTrayTap: vi.fn(),
        onHint: vi.fn(),
        onAlbum: vi.fn(),
        onMenu: vi.fn(),
        onToggleMute: () => false,
      },
      { muted: true, photosById: sliced },
    );
    root.replaceChildren(table.root);
    const ids = (slots: number[]) => slots.map((i) => state.grid[i] as string);
    const next = structuredClone(state);
    for (const i of [0, 1, 5, 6, 2, 3, 7, 8]) next.grid[i] = null;
    const play = table.play(
      [
        { type: 'matched', photoId: 'a', tileIds: ids([0, 1, 5, 6]), slots: [0, 1, 5, 6] },
        { type: 'matched', photoId: 'b', tileIds: ids([2, 3, 7, 8]), slots: [2, 3, 7, 8] },
      ],
      next,
      () => {},
    );
    await vi.advanceTimersByTimeAsync(TIMING.ARM_MS + 10);
    expect($('.sr-only[aria-live]').textContent).toContain('Gamberone a');
    winPointer('pointerdown');
    winPointer('pointerup');
    await flush();
    await play;
    expect($('.sr-only[aria-live]').textContent).toContain('Gamberone a'); // b's popup was skipped
    expect(document.querySelector('.match-popup')).toBeNull();
    expect(table.busy).toBe(false);
    table.destroy();
  });

  it('keyboard players get focus back on the board after the discard', async () => {
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    const photo = completablePhotos(app.currentState!)[0] as string;
    const targets = [0, 1, 5, 6];
    for (let k = 0; k < 4; k++) {
      const from = app.currentState!.grid.indexOf(tileId(photo, QUADRANTS[k] as (typeof QUADRANTS)[number]));
      if (from === targets[k]) continue;
      tileAt(from).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const target = slotEl(targets[k] as number);
      const key = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      (target.querySelector('.tile') ?? target).dispatchEvent(key);
      await flush();
    }
    expect(app.currentState!.solved).toContain(photo);
    expect(document.activeElement).not.toBe(document.body);
    expect(slotEl(0).contains(document.activeElement)).toBe(true);
  });

  it('with animations: dismissing removes the confetti at once and cuts a running intro short', async () => {
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    const finish = vi.fn();
    Element.prototype.animate = vi.fn(function (this: Element) {
      // the photo's intro never finishes by itself (simulates a long intro); other animations end at once
      const isIntro = this.tagName === 'FIGURE';
      return {
        finished: isIntro ? new Promise(() => {}) : Promise.resolve(),
        playState: isIntro ? 'running' : 'finished',
        finish,
      } as unknown as Animation;
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 10,
      width: 60,
      height: 80,
      right: 70,
      bottom: 90,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect);
    const app = makeApp(7, THREE);
    await start(app, 'medio');
    const { done } = await swapUntilMatch(app);
    await vi.advanceTimersByTimeAsync(TIMING.PRE_MS + TIMING.ARM_MS + 10);
    expect(document.querySelector('.confetti')).not.toBeNull();
    winPointer('pointerdown');
    winPointer('pointerup');
    await vi.advanceTimersByTimeAsync(5);
    expect(finish).toHaveBeenCalled();
    expect(document.querySelector('.confetti')).toBeNull();
    await flush();
    await done;
    expect(document.querySelector('.match-popup')).toBeNull();
    vi.restoreAllMocks();
    delete (Element.prototype as { animate?: unknown }).animate;
  });
});
