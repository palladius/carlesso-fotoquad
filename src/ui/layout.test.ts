import { describe, expect, it, vi } from 'vitest';
import { h, reducedMotion, sleep } from './dom';
import { chooseBoardShape, computeTileSize } from './layout';

describe('computeTileSize', () => {
  it('keeps a 3:4 ratio and fits a phone in portrait', () => {
    const { w, h: th } = computeTileSize(390, 844);
    expect(th).toBe(Math.round(w / 0.75));
    expect(5 * w + 4 * 2).toBeLessThanOrEqual(390);
    expect(6 * th).toBeLessThan(844 - 56);
  });

  it('is limited by height on a wide desktop and capped at 180px', () => {
    const d = computeTileSize(1440, 900);
    expect(d.w).toBeLessThan(150);
    expect(computeTileSize(5000, 5000).w).toBe(180);
  });

  it('never goes below 28px', () => {
    expect(computeTileSize(50, 50).w).toBe(28);
  });

  it('grows when there are no piles to show (no overflow)', () => {
    expect(computeTileSize(1440, 900, 5, 5, { piles: false }).w).toBeGreaterThan(
      computeTileSize(1440, 900, 5, 5).w,
    );
  });

  it('a tray beside the grid (landscape) gives bigger tiles than a tray below it', () => {
    const below = computeTileSize(1440, 900, 5, 5 + 2.3, { piles: false });
    const beside = computeTileSize(1440, 900, 5, 5, { piles: false, extraCols: 2.4 });
    expect(beside.w).toBeGreaterThan(below.w);
    // still fits horizontally: grid + tray + gaps
    expect((5 + 2.4) * beside.w + 60).toBeLessThanOrEqual(1440);
  });

  it('landscape grid mode: piles and HUD beside the board give much bigger tiles', () => {
    const stacked = computeTileSize(1024, 538, 5, 6);
    const beside = computeTileSize(1024, 538, 5, 6, { pilesBeside: true, hudBeside: true });
    expect(beside.w).toBeGreaterThan(stacked.w * 1.15);
    // fits horizontally: piles column (0.6 tile) + board + HUD column + gaps
    expect(5.6 * beside.w + 4 * 2 + 64 + 2 * 32 + 16).toBeLessThanOrEqual(1024);
    // fits vertically: 6 rows only
    expect(6 * beside.h + 5 * 2).toBeLessThanOrEqual(538);
  });

  it('shrinks when extra rows (the tray) must fit', () => {
    expect(computeTileSize(390, 844, 5, 8.3).w).toBeLessThan(computeTileSize(390, 844, 5, 6).w);
  });
});

describe('chooseBoardShape', () => {
  it('keeps the classic 5×6 on a phone in portrait', () => {
    expect(chooseBoardShape(390, 844, false)).toEqual({ columns: 5, rows: 6 });
  });

  it('goes wide on landscape screens (bigger tiles), preferring more slots on ties', () => {
    expect(chooseBoardShape(1024, 538, false)).toEqual({ columns: 8, rows: 4 });
    expect(chooseBoardShape(1440, 900, false)).toEqual({ columns: 7, rows: 4 });
  });

  it('never picks a shape with smaller tiles than 5×6', () => {
    for (const [w, h] of [
      [1024, 538],
      [1366, 657],
      [1920, 969],
      [1180, 820],
      [844, 390],
      [768, 1024],
    ] as const) {
      for (const tray of [false, true]) {
        const s = chooseBoardShape(w, h, tray);
        expect(s.columns * s.rows).toBeGreaterThanOrEqual(24);
        expect(s.columns).toBeGreaterThanOrEqual(2);
        expect(s.rows).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('h()', () => {
  it('builds elements with classes, text, attributes, listeners and children', () => {
    const onClick = vi.fn();
    const el = h(
      'button',
      { class: 'a b', text: 'ciao', 'data-x': 3, disabled: true, hidden: false, onclick: onClick },
      null,
      undefined,
      false,
    );
    expect(el.className).toBe('a b');
    expect(el.textContent).toBe('ciao');
    expect(el.getAttribute('data-x')).toBe('3');
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('hidden')).toBe(false);
    el.dispatchEvent(new Event('click'));
    expect(onClick).toHaveBeenCalled();
    const parent = h('div', {}, el, 'testo');
    expect(parent.childNodes).toHaveLength(2);
  });
});

describe('reducedMotion / sleep', () => {
  it('reads prefers-reduced-motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('reduce'),
    })) as unknown as typeof window.matchMedia;
    expect(reducedMotion()).toBe(true);
    window.matchMedia = original;
  });

  it('sleep resolves after the delay', async () => {
    vi.useFakeTimers();
    const done = vi.fn();
    void sleep(100).then(done);
    await vi.advanceTimersByTimeAsync(100);
    expect(done).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('settle', () => {
  it('resolves when the animation finishes, or after a timeout if frames stop', async () => {
    const { settle } = await import('./fx');
    vi.useFakeTimers();
    const done = vi.fn();
    void settle({ finished: new Promise(() => {}) } as unknown as Animation, 100).then(done);
    await vi.advanceTimersByTimeAsync(200);
    expect(done).not.toHaveBeenCalled(); // still within duration + slack
    await vi.advanceTimersByTimeAsync(60);
    expect(done).toHaveBeenCalled();
    // a cancelled animation resolves at once, without waiting for the timeout
    await expect(
      settle({ finished: Promise.reject(new Error('cancelled')) } as unknown as Animation, 100),
    ).resolves.toBeUndefined();
    await expect(settle(null, 100)).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
