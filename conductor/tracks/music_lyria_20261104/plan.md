# Implementation Plan — Background Music (Lyria)

Track: `music_lyria_20261104` · Spec: [spec.md](./spec.md) · Workflow: [workflow.md](../../workflow.md)

## Phase 1: Generate the music (offline, once)
- [x] Task: `scripts/generate-music.sh` wrapping the `musicgen-lyria3` skill (Pro 2-min theme + 30 s victory sting) `1e4b0f2`
    - [x] Write the prompts (unresolved piano + strings, Jarre-like anticipation, no cadence/no ending) into the script
    - [x] Estimate cost/carbon; generate; save MP3 + metadata `.txt` under `public/music/`
    - [x] Optimise (96–128 kbps), listen-check, pick loop points; add `public/music/music.json` (src, loopStart, loopEnd, crossfade, gain)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Music engine (TDD)
- [ ] Task: Loop scheduler — pure function computing crossfade/loop schedule from duration and loop points
    - [ ] Write tests: seam-free schedule (overlap = crossfade), never ends, invalid loop points clamped
    - [ ] Implement `src/platform/music.ts` scheduling logic
- [ ] Task: `GameMusic` Web Audio adapter — lazy fetch/decode, gesture unlock, fade in/out, duck, sting, mute
    - [ ] Write tests with a mocked AudioContext: starts after unlock at low gain, toggling fades, duck during popup, sting then resume, fetch failure is silent
    - [ ] Implement
- [ ] Task: Storage — persisted music on/off (default on)
    - [ ] Write tests; implement
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Integration & PWA
- [ ] Task: 🎵 HUD toggle (separate from 🔊), music starts after the first tap, duck on celebration, sting on victory
    - [ ] Write UI tests (jsdom) for the toggle, persistence and victory flow; implement
- [ ] Task: Workbox runtime caching for `/music/` (CacheFirst), not precached
    - [ ] e2e: offline after a first visit plays (audio element/buffer loaded); first-visit offline is silent, no console errors; cached start < 200 ms still holds
- [ ] Task: README + CHANGELOG
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
