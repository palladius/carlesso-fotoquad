# Tech Stack — Carlesso FotoQuad

## Language
- **TypeScript** (strict mode), ES Modules. No UI framework.

## Frontend
- **Rendering**: DOM + CSS Grid for the table layout; tiles are `<button>` elements whose images are generated
  quadrant bitmaps (`<canvas>`/`ImageBitmap` → object URLs or drawn canvases).
- **Animations**: FLIP technique (First-Last-Invert-Play) via the Web Animations API; CSS transitions for simple
  states. `prefers-reduced-motion` respected.
- **Styling**: plain modern CSS (custom properties, container queries, `:has()`), no Tailwind.
- **Image slicing**: HTML5 Canvas / `OffscreenCanvas` + `createImageBitmap` (see SPEC §3.1).
- **Audio**: Web Audio API, synthesised sounds (card snap, click, victory chime) — no audio files required.

## Architecture
- **Pure game engine** (`src/engine/`): deterministic, framework-free, DOM-free state machine (deck, tableau,
  tray, match detection, refill, scoring, modes). Seeded RNG for reproducible shuffles and tests.
- **Platform adapters** (`src/platform/`): slicer (Canvas), audio, storage, PWA registration.
- **UI layer** (`src/ui/`): renders engine state to the DOM and forwards user intents to the engine.

## Persistence
- `localStorage` (versioned JSON schema): unlocked album, personal records, in-progress game snapshot.
- No backend, no database.

## Build & Tooling
- **Vite** (dev server + production build), **npm**.
- **vite-plugin-pwa** (Workbox) for `manifest.webmanifest` + Service Worker precaching code and photos.
- **ESLint** + **Prettier**.
- **justfile** for common tasks (`just dev`, `just test`, `just build`, `just e2e`).

## Testing
- **Vitest** (+ jsdom where needed) for unit tests of the engine and adapters; coverage via `@vitest/coverage-v8`.
- **@axe-core/playwright** for automated accessibility audits (WCAG 2 A/AA) in e2e *(added 2026-11-03, convergence pass 1)*.
- **Playwright** for end-to-end tests (mobile portrait + desktop viewports) and screenshot verification.
  On `pupurabbux`, use system Chrome with GPU flags (see user setup notes).

## Hosting
- Static hosting via **GitHub Pages** (built by GitHub Actions). Any static host works.
