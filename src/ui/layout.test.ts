import { describe, expect, it, vi } from 'vitest';
import { h, reducedMotion, sleep } from './dom';
import { computeTileSize } from './layout';

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

  it('shrinks when extra rows (the tray) must fit', () => {
    expect(computeTileSize(390, 844, 5, 8.3).w).toBeLessThan(computeTileSize(390, 844, 5, 6).w);
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
