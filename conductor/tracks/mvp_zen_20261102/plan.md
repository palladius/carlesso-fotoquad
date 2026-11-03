# Implementation Plan — MVP: Zen Solitaire Core Loop (PWA)

Track: `mvp_zen_20261102` · Spec: [spec.md](./spec.md) · Workflow: [workflow.md](../../workflow.md)

## Phase 1: Scaffolding & Tooling [checkpoint: 9ef485d]
- [x] Task: Initialise Vite + strict TypeScript project `56f3e07`
    - [x] `npm create vite` (vanilla-ts), `tsconfig` strict, folder layout `src/engine`, `src/platform`, `src/ui`
    - [x] ESLint + Prettier config
    - [x] `justfile` with `dev`, `test`, `coverage`, `build`, `e2e`, `lint`
- [x] Task: Testing harness `18bb0fc`
    - [x] Vitest + jsdom + `@vitest/coverage-v8` (80% threshold), smoke test
    - [x] Playwright config (mobile portrait 390×844 + desktop 1440×900; system Chrome GPU flags on pupurabbux), smoke e2e
- [x] Task: CI & hosting `9ef485d`
    - [x] GitHub Actions: lint + unit tests + build on PR/push
    - [x] GitHub Pages deploy workflow (Vite `base` configured for `/carlesso-fotoquad/`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `9ef485d`

## Phase 2: Pure Game Engine (TDD, DOM-free) [checkpoint: 126a935]
- [x] Task: Core types & seeded RNG `3304a0e`
    - [x] Write tests: RNG determinism, `shuffle` reproducibility
    - [x] Implement `rng.ts` (e.g. mulberry32) and `shuffle`
    - [x] Define types: `Photo`, `Quadrant` (`TL|TR|BL|BR`), `Tile`, `GameState`, `Action`
- [x] Task: Deck building & dealing `5319e11`
    - [x] Write tests: N photos → N×4 tiles; round-robin split into 5 piles; initial 30-slot tableau; <30 tiles case
    - [x] Implement `createGame(photos, seed, options)`
- [x] Task: Solvability-aware dealer (FR-5) `3318df4`
    - [x] Write property tests over many seeds: visible set always contains ≥1 complete photo while unsolved; no photo laid out in natural 2×2 adjacency
    - [x] Implement dealer strategy for initial deal and refills
- [x] Task: Tray mechanics (FR-4.1–4.4) `93d1797`
    - [x] Write tests: tap grid→tray slot by quadrant; conflict replacement returns old tile to vacated slot; tap tray→grid; move counter
    - [x] Implement `reduce(state, action)` for `PLACE_TILE`, `RETURN_TILE`
- [x] Task: Match, discard & refill (FR-4.5–4.6) `3d91f8a`
    - [x] Write tests: 4 quadrants same photo → `MATCHED` event, tiles discarded, solved count++, slots refilled from piles, pile counts, pile exhaustion
    - [x] Implement match detection, discard, refill + emitted engine events (for UI animations/audio)
- [x] Task: Hint & victory (FR-6, FR-7 logic) `ad40674`
    - [x] Write tests: hint returns 4 visible tiles of a completable photo; hint counter; victory when all solved; stats
    - [x] Implement `findHint`, victory detection, stats
- [x] Task: State serialisation `126a935`
    - [x] Write tests: `serialize`/`deserialize` round-trip; schema version; invalid input rejected
    - [x] Implement versioned snapshot format
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `126a935`

## Phase 3: Platform Adapters [checkpoint: e1397d4]
- [x] Task: Photo manifest loader & packs (FR-1, FR-2) `f478385`
    - [x] Write tests: parse/validate manifest, merge optional private manifest (404 tolerated), skip broken entries, derive packs from tags, hide empty packs
    - [x] Implement `manifest.ts` and `packs.ts`
- [x] Task: Canvas slicer (FR-1) `88ffe1f`
    - [x] Write tests: quadrant geometry math (incl. 3:4 centre-crop for non-3:4 sources); pixel-colour check on a synthetic 4-colour image (Playwright/browser test where canvas is required)
    - [x] Implement `slicer.ts` (`createImageBitmap` / canvas), failed-image handling
- [x] Task: Storage (FR-8) `c296902`
    - [x] Write tests: save/load snapshot, unlocked album, records per pack, mute flag, corrupt/old data discarded
    - [x] Implement `storage.ts` over `localStorage` (injectable for tests)
- [x] Task: Audio (FR-9) `e1397d4`
    - [x] Write tests with mocked `AudioContext`: unlock on gesture, mute suppresses playback
    - [x] Implement synthesised SFX: tap, land, match chime, victory jingle
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `e1397d4`

## Phase 4: Demo Assets [checkpoint: cc35f7b]
- [x] Task: Generate 10 portrait 3:4 demo photos with Nano Banana (stylised family scenes / Gamberone, no real faces) → `public/photos/demo/` (optimised WebP/JPEG) `0875fae`
- [x] Task: `public/photos/photos.json` with titles, years, tags covering all packs `0875fae`
- [x] Task: Card-back art (Gamberone shrimp pattern) and PWA icons (192, 512, maskable) `0875fae`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `cc35f7b`

## Phase 5: UI — Table & Core Loop [checkpoint: cc35f7b]
- [x] Task: Start screen & pack selection `0875fae`
    - [x] Write tests (jsdom): renders available packs, starts game with chosen pack; "Continua" shown when a snapshot exists
    - [x] Implement start screen
- [x] Task: Table layout & theme (FR-3) `844aab1`
    - [x] Write tests: renders 5 piles with counts, 30 grid slots, 2×2 tray, HUD values from state
    - [x] Implement responsive CSS Grid layout, felt theme, card backs, tile styling (≥44px targets, focusable buttons)
- [x] Task: Interaction wiring (FR-4) `844aab1`
    - [x] Write tests: click grid tile dispatches `PLACE_TILE`; click tray tile dispatches `RETURN_TILE`; keyboard activation
    - [x] Implement controller: engine ↔ DOM, state persisted after every move
- [x] Task: Animations (FLIP) & celebration `0875fae`
    - [x] Write tests: reduced-motion path skips flying/confetti; match popup shows title then dismisses
    - [x] Implement FLIP tile moves, refill cascade, match popup (~1.5s), confetti, discard-to-album
- [x] Task: Hint button (FR-6) — highlight border + glow + pulse ~3s `0875fae`
- [x] Task: Mute toggle & audio hooks on engine events `0875fae`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `cc35f7b`

## Phase 5b: Gameplay Revision — in-grid drag & drop (user feedback 2026-11-03) [checkpoint: cc35f7b]
- [x] Task: Engine — SWAP action, natural 2×2 block match detection, refill into vacated slots; remove tray (schema v2) `844aab1`
    - [x] Write tests: swap/move, block detection anywhere on the grid, refill, full games via a swap-playing bot
    - [x] Implement reducer + serialisation v2
- [x] Task: Dealer — difficulty (`maxCompletable` 1 Normale / 3 Facile), keep tableau full `844aab1`
    - [x] Write property tests: completable count within [1, max(target, U − P)] after every deal
    - [x] Implement draw selection from hidden pile tiles
- [x] Task: UI — pointer drag & drop + tap-tap swap + keyboard, drop-target highlight, no tray, larger tiles `844aab1`
- [x] Task: UI — minimal borders (2px gap, ≤3px radius, no frame) `844aab1`
- [x] Task: Difficulty selector on the start screen (persisted): Facile = tray mode, Medio = grid ≤3, Difficile = grid 1 `844aab1`
- [x] Task: Update e2e tests to the new mechanic `844aab1`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `cc35f7b`

## Phase 6: Victory, Album & Persistence UX [checkpoint: cc35f7b]
- [x] Task: Victory screen (FR-7) `0875fae`
    - [x] Write tests: shows stats, records updated, "Gioca ancora" resets game
    - [x] Implement Grand Finale with fireworks/confetti
- [x] Task: Album gallery (FR-7) `0875fae`
    - [x] Write tests: lists unlocked photos, navigation via arrows/keys/swipe
    - [x] Implement fullscreen album
- [x] Task: Resume flow (FR-8) — reload mid-game restores exact state `0875fae`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `cc35f7b`

## Phase 7: PWA, E2E & Release
- [x] Task: PWA (FR-10) `cc35f7b`
    - [x] Configure `vite-plugin-pwa`: manifest (portrait, felt-green theme), precache app shell + photos
    - [x] Playwright test: after first load, go offline, reload, full game still playable
- [x] Task: End-to-end game test — play a full small-pack game to victory via the UI (uses engine hint to find matches) `844aab1`
- [x] Task: Responsive screenshots at 360×640, 390×844, 1440×900; no overflow assertions `cc35f7b`
- [x] Task: Accessibility pass (contrast, focus order, labels) and performance check (< 200ms interactive cached) `433e156`
- [x] Task: README update (how to add private family photos, dev commands, live URL) and deploy to GitHub Pages `cc35f7b`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 8: Convergence (Pass 1)
- [ ] Task: [CONVERGE][CRITICAL] Remove or justify type assertions (`as X`) in `src/` per code_styleguides/typescript.md §1 "Type Assertions" (contradicts) — ~50 unjustified casts, mostly `table.ts` (14) and `dealer.ts` (10)
    - [ ] Replace casts with typed helpers / narrowing; keep only unavoidable ones with a `// cast:` justification
    - [ ] Verify tsc, lint, unit + e2e still pass
- [x] Task: [CONVERGE][HIGH] Pixel-level slicer verification per spec.md AC-1 / FR-1 (partial) — only quadrant geometry is unit-tested `cdde481`
    - [x] Write e2e test: serve a synthetic 4-colour portrait image via a routed manifest, assert each tile's pixels match its quadrant colour
    - [x] Fix slicer if needed and verify
- [x] Task: [CONVERGE][HIGH] Accessibility pass + performance check per plan.md Phase 7 / spec.md NFR (missing) `433e156`
    - [x] Write e2e: axe-core scan of start screen and table (no serious/critical violations), HUD contrast WCAG AA
    - [x] Write e2e: cached (PWA) reload reaches an interactive start screen in < 200ms (navigation timing)
    - [x] Fix any violations found
- [x] Task: [CONVERGE][MEDIUM] Keyboard parity for moving a tile into an empty slot per spec.md FR-4.1 / AC-5 (partial) — empty slots are not focusable `c8bd89c`
    - [x] Write test: keyboard select tile + activate empty slot moves it
    - [x] Make empty slots focusable/activatable
- [x] Task: [CONVERGE][MEDIUM] Tap/drag feedback sound within 100ms per product-guidelines.md UX #2 (partial) — selecting a tile or starting a drag is silent `c8bd89c`
    - [x] Write test: selection and drag start play the `tap` sound
    - [x] Implement
- [x] Task: [CONVERGE][LOW] Accessible HUD labels per spec.md FR-3 ("Foto risolte: X / N", moves) (partial) — HUD shows emoji-only counters `c8bd89c`
    - [x] Add aria-label/title "Foto risolte" / "Mosse" + unit test
- [x] Task: [CONVERGE][LOW] Review unrequested leftovers (unrequested): dead `src/app.ts` APP_NAME (+ its smoke test) and stale hint-click flow in `scripts/screenshot.mjs` `c8bd89c`
    - [x] Remove dead code; fix or simplify the screenshot helper
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
