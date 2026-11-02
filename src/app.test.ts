import { describe, expect, it } from 'vitest';
import { APP_NAME } from './app';

describe('smoke', () => {
  it('exposes the app name', () => {
    expect(APP_NAME).toBe('FotoQuad');
  });
});
