import { at } from '../engine/util';
import { h, reducedMotion } from './dom';

/** FLIP: moves `el` into `parent` (or keeps it) and animates from its previous on-screen rect. */
export function flipFrom(el: HTMLElement, first: DOMRect, duration = 280): Animation | null {
  const last = el.getBoundingClientRect();
  if (reducedMotion() || !last.width || typeof el.animate !== 'function') return null;
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  const sx = first.width / last.width;
  const sy = first.height / last.height;
  return el.animate(
    [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }],
    { duration, easing: 'cubic-bezier(.2,.8,.2,1)' },
  );
}

export function moveWithFlip(el: HTMLElement, parent: HTMLElement, duration?: number): Animation | null {
  const first = el.getBoundingClientRect();
  parent.append(el);
  return flipFrom(el, first, duration);
}

const COLORS = ['#f4c542', '#e8734a', '#5aa9e6', '#7bd389', '#f28dc3', '#ffffff'];

/** Micro-confetti burst from a point (skipped with reduced motion). */
export function confetti(x: number, y: number, count = 70): HTMLElement | null {
  if (reducedMotion() || typeof document.body.animate !== 'function') return null;
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  document.body.append(layer);
  for (let i = 0; i < count; i++) {
    const p = h('i');
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = at(COLORS, i % COLORS.length);
    layer.append(p);
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 260;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 120;
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy + 380}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ],
      { duration: 1300 + Math.random() * 700, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' },
    );
  }
  setTimeout(() => layer.remove(), 2200);
  return layer;
}
