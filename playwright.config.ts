import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// On pupurabbux use the system Chrome with real GPU acceleration (RTX 5080) instead of SwiftShader.
const systemChrome = '/usr/bin/google-chrome';
const launchOptions = existsSync(systemChrome)
  ? {
      executablePath: systemChrome,
      args: [
        '--use-gl=angle',
        '--use-angle=gl',
        '--enable-gpu-rasterization',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
      ],
    }
  : {};

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-portrait',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
