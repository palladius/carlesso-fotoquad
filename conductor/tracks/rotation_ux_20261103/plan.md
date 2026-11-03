# Implementation Plan — Photo Rotation, Simpler Start & Snappy Celebration

Track: `rotation_ux_20261103` · Spec: [spec.md](./spec.md) · Workflow: [workflow.md](../../workflow.md)

## Phase 1: Photo selection & rotation
- [x] Task: `selectPhotos(library, count, history, rng)` — least-recently-played first, random ties (FR-2, FR-3) `17db510`
    - [x] Write tests: count cap, LRU order, ties random but seeded, consecutive games minimise overlap
    - [x] Implement in `src/platform/rotation.ts`
- [x] Task: Storage — `lastPlayed` history and per-level records (FR-3, FR-4) `17db510`
    - [x] Write tests: history persisted, game counter, records per level, garbage tolerated
    - [x] Implement in `storage.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Simpler start screen
- [x] Task: Start screen with 3 level buttons that start a game; small Continua + Album (FR-1) `15249a8`
    - [x] Write tests (jsdom): 3 buttons, tap starts a game with the level's photo count, Continua/Album
    - [x] Implement; remove packs UI and `packs.ts`
- [x] Task: Update e2e tests to the new start flow `15249a8`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Snappy celebration (adversarially reviewed)
- [ ] Task: Dismissible, shorter celebration popup (FR-7, hardened spec §2.1)
    - [ ] Write unit + e2e tests from the adversarial review
    - [ ] Implement
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Content
- [x] Task: 16 new demo illustrations + manifest entries (FR-6) `612b1fb`
- [ ] Task: Real private photos pipeline documented (Immich → `public/photos/private/`) (FR-5)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
