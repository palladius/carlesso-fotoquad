# Implementation Plan — MVP: Zen Solitaire Core Loop (PWA)

Track: `mvp_zen_20261102` · Spec: [spec.md](./spec.md) · Workflow: [workflow.md](../../workflow.md)

## Phase 1: Scaffolding & Tooling
- [x] Task: Initialise Vite + strict TypeScript project `56f3e07`
    - [x] `npm create vite` (vanilla-ts), `tsconfig` strict, folder layout `src/engine`, `src/platform`, `src/ui`
    - [x] ESLint + Prettier config
    - [x] `justfile` with `dev`, `test`, `coverage`, `build`, `e2e`, `lint`
- [ ] Task: Testing harness
    - [ ] Vitest + jsdom + `@vitest/coverage-v8` (80% threshold), smoke test
    - [ ] Playwright config (mobile portrait 390×844 + desktop 1440×900; system Chrome GPU flags on pupurabbux), smoke e2e
- [ ] Task: CI & hosting
    - [ ] GitHub Actions: lint + unit tests + build on PR/push
    - [ ] GitHub Pages deploy workflow (Vite `base` configured for `/carlesso-fotoquad/`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Pure Game Engine (TDD, DOM-free)
- [ ] Task: Core types & seeded RNG
    - [ ] Write tests: RNG determinism, `shuffle` reproducibility
    - [ ] Implement `rng.ts` (e.g. mulberry32) and `shuffle`
    - [ ] Define types: `Photo`, `Quadrant` (`TL|TR|BL|BR`), `Tile`, `GameState`, `Action`
- [ ] Task: Deck building & dealing
    - [ ] Write tests: N photos → N×4 tiles; round-robin split into 5 piles; initial 30-slot tableau; <30 tiles case
    - [ ] Implement `createGame(photos, seed, options)`
- [ ] Task: Solvability-aware dealer (FR-5)
    - [ ] Write property tests over many seeds: visible set always contains ≥1 complete photo while unsolved; no photo laid out in natural 2×2 adjacency
    - [ ] Implement dealer strategy for initial deal and refills
- [ ] Task: Tray mechanics (FR-4.1–4.4)
    - [ ] Write tests: tap grid→tray slot by quadrant; conflict replacement returns old tile to vacated slot; tap tray→grid; move counter
    - [ ] Implement `reduce(state, action)` for `PLACE_TILE`, `RETURN_TILE`
- [ ] Task: Match, discard & refill (FR-4.5–4.6)
    - [ ] Write tests: 4 quadrants same photo → `MATCHED` event, tiles discarded, solved count++, slots refilled from piles, pile counts, pile exhaustion
    - [ ] Implement match detection, discard, refill + emitted engine events (for UI animations/audio)
- [ ] Task: Hint & victory (FR-6, FR-7 logic)
    - [ ] Write tests: hint returns 4 visible tiles of a completable photo; hint counter; victory when all solved; stats
    - [ ] Implement `findHint`, victory detection, stats
- [ ] Task: State serialisation
    - [ ] Write tests: `serialize`/`deserialize` round-trip; schema version; invalid input rejected
    - [ ] Implement versioned snapshot format
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Platform Adapters
- [ ] Task: Photo manifest loader & packs (FR-1, FR-2)
    - [ ] Write tests: parse/validate manifest, merge optional private manifest (404 tolerated), skip broken entries, derive packs from tags, hide empty packs
    - [ ] Implement `manifest.ts` and `packs.ts`
- [ ] Task: Canvas slicer (FR-1)
    - [ ] Write tests: quadrant geometry math (incl. 3:4 centre-crop for non-3:4 sources); pixel-colour check on a synthetic 4-colour image (Playwright/browser test where canvas is required)
    - [ ] Implement `slicer.ts` (`createImageBitmap` / canvas), failed-image handling
- [ ] Task: Storage (FR-8)
    - [ ] Write tests: save/load snapshot, unlocked album, records per pack, mute flag, corrupt/old data discarded
    - [ ] Implement `storage.ts` over `localStorage` (injectable for tests)
- [ ] Task: Audio (FR-9)
    - [ ] Write tests with mocked `AudioContext`: unlock on gesture, mute suppresses playback
    - [ ] Implement synthesised SFX: tap, land, match chime, victory jingle
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Demo Assets
- [ ] Task: Generate 10 portrait 3:4 demo photos with Nano Banana (stylised family scenes / Gamberone, no real faces) → `public/photos/demo/` (optimised WebP/JPEG)
- [ ] Task: `public/photos/photos.json` with titles, years, tags covering all packs
- [ ] Task: Card-back art (Gamberone shrimp pattern) and PWA icons (192, 512, maskable)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: UI — Table & Core Loop
- [ ] Task: Start screen & pack selection
    - [ ] Write tests (jsdom): renders available packs, starts game with chosen pack; "Continua" shown when a snapshot exists
    - [ ] Implement start screen
- [ ] Task: Table layout & theme (FR-3)
    - [ ] Write tests: renders 5 piles with counts, 30 grid slots, 2×2 tray, HUD values from state
    - [ ] Implement responsive CSS Grid layout, felt theme, card backs, tile styling (≥44px targets, focusable buttons)
- [ ] Task: Interaction wiring (FR-4)
    - [ ] Write tests: click grid tile dispatches `PLACE_TILE`; click tray tile dispatches `RETURN_TILE`; keyboard activation
    - [ ] Implement controller: engine ↔ DOM, state persisted after every move
- [ ] Task: Animations (FLIP) & celebration
    - [ ] Write tests: reduced-motion path skips flying/confetti; match popup shows title then dismisses
    - [ ] Implement FLIP tile moves, refill cascade, match popup (~1.5s), confetti, discard-to-album
- [ ] Task: Hint button (FR-6) — highlight border + glow + pulse ~3s
- [ ] Task: Mute toggle & audio hooks on engine events
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6: Victory, Album & Persistence UX
- [ ] Task: Victory screen (FR-7)
    - [ ] Write tests: shows stats, records updated, "Gioca ancora" resets game
    - [ ] Implement Grand Finale with fireworks/confetti
- [ ] Task: Album gallery (FR-7)
    - [ ] Write tests: lists unlocked photos, navigation via arrows/keys/swipe
    - [ ] Implement fullscreen album
- [ ] Task: Resume flow (FR-8) — reload mid-game restores exact state
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 7: PWA, E2E & Release
- [ ] Task: PWA (FR-10)
    - [ ] Configure `vite-plugin-pwa`: manifest (portrait, felt-green theme), precache app shell + photos
    - [ ] Playwright test: after first load, go offline, reload, full game still playable
- [ ] Task: End-to-end game test — play a full small-pack game to victory via the UI (uses engine hint to find matches)
- [ ] Task: Responsive screenshots at 360×640, 390×844, 1440×900; no overflow assertions
- [ ] Task: Accessibility pass (contrast, focus order, labels) and performance check (< 200ms interactive cached)
- [ ] Task: README update (how to add private family photos, dev commands, live URL) and deploy to GitHub Pages
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
