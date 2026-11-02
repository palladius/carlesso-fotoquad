/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// GitHub Pages serves the app under /carlesso-fotoquad/; local dev uses /.
const base = process.env.GITHUB_PAGES === 'true' ? '/carlesso-fotoquad/' : '/';

export default defineConfig({
  base,
  server: { port: 5173, host: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/main.ts', 'src/**/*.d.ts'],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
