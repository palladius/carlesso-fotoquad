import { describe, expect, it } from 'vitest';
import { at } from './util';

describe('at', () => {
  it('returns the element at a valid index', () => {
    expect(at(['a', 'b'], 1)).toBe('b');
    expect(at([0], 0)).toBe(0);
  });

  it('throws on an invalid index instead of returning undefined', () => {
    expect(() => at(['a'], 1)).toThrow(RangeError);
    expect(() => at([], 0)).toThrow(/out of bounds/);
  });
});
