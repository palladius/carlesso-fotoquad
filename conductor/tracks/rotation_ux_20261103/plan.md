# Implementation Plan — Photo Rotation, Simpler Start & Snappy Celebration

Track: `rotation_ux_20261103` · Spec: [spec.md](./spec.md) · Workflow: [workflow.md](../../workflow.md)

## Phase 1: Photo selection & rotation
- [ ] Task: `selectPhotos(library, count, history, rng)` — least-recently-played first, random ties (FR-2, FR-3)
    - [ ] Write tests: count cap, LRU order, ties random but seeded, consecutive games minimise overlap
    - [ ] Implement in `src/platform/rotation.ts`
- [ ] Task: Storage — `lastPlayed` history and per-level records (FR-3, FR-4)
    - [ ] Write tests: history persisted, game counter, records per level, garbage tolerated
    - [ ] Implement in `storage.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Simpler start screen
- [ ] Task: Start screen with 3 level buttons that start a game; small Continua + Album (FR-1)
    - [ ] Write tests (jsdom): 3 buttons, tap starts a game with the level's photo count, Continua/Album
    - [ ] Implement; remove packs UI and `packs.ts`
- [ ] Task: Update e2e tests to the new start flow
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Snappy celebration (adversarially reviewed)
- [ ] Task: Dismissible, shorter celebration popup (FR-7, hardened spec §2.1)
    - [ ] Write unit + e2e tests from the adversarial review
    - [ ] Implement
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Content
- [ ] Task: 16 new demo illustrations + manifest entries (FR-6)
- [ ] Task: Real private photos pipeline documented (Immich → `public/photos/private/`) (FR-5)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
