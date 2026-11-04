# Implementation Plan — Photo Rotation, Simpler Start & Snappy Celebration

Track: `rotation_ux_20261103` · Spec: [spec.md](./spec.md) · Workflow: [workflow.md](../../workflow.md)

## Phase 1: Photo selection & rotation [checkpoint: 8f6c248]
- [x] Task: `selectPhotos(library, count, history, rng)` — least-recently-played first, random ties (FR-2, FR-3) `17db510`
    - [x] Write tests: count cap, LRU order, ties random but seeded, consecutive games minimise overlap
    - [x] Implement in `src/platform/rotation.ts`
- [x] Task: Storage — `lastPlayed` history and per-level records (FR-3, FR-4) `17db510`
    - [x] Write tests: history persisted, game counter, records per level, garbage tolerated
    - [x] Implement in `storage.ts`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `8f6c248`

## Phase 2: Simpler start screen
- [x] Task: Start screen with 3 level buttons that start a game; small Continua + Album (FR-1) `15249a8`
    - [x] Write tests (jsdom): 3 buttons, tap starts a game with the level's photo count, Continua/Album
    - [x] Implement; remove packs UI and `packs.ts`
- [x] Task: Update e2e tests to the new start flow `15249a8`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Snappy celebration (adversarially reviewed)
- [x] Task: Dismissible, shorter celebration popup (FR-7, hardened spec §2.1) `76e965a`
    - [x] Write unit + e2e tests from the adversarial review
    - [x] Implement
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3b: Smarter Facile layout (FR-8)
- [x] Task: Hide decks when the game doesn't overflow; landscape tray beside the grid `89959b0`
    - [x] Write tests: layout sizes, no-piles / landscape classes, e2e 1024×620 fits with tray beside grid
    - [x] Implement in `layout.ts`, `table.ts`, CSS

## Phase 3c: Landscape board (FR-9) & card back (FR-10)
- [x] Task: Piles/HUD columns in landscape grid mode; adaptive board shape chosen at game start `4fb5908`
    - [x] Write tests: computeTileSize options, chooseBoardShape per viewport, dealer invariants on 8×4/7×4/6×5, app picks shape
    - [x] Implement; make e2e helpers shape-agnostic; settle() fallback for animations
- [x] Task: Family card back (Nano Banana), kids' hair colours fixed (Seby light brown/blond, Ale chestnut) `4fb5908`

## Phase 4: Content
- [x] Task: 16 new demo illustrations + manifest entries (FR-6) `612b1fb`
- [x] Task: Real private photos pipeline documented (Immich → `public/photos/private/`) (FR-5) `76e965a`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
