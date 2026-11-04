# Track Spec — Background Music (Lyria): an endless, unresolved theme

**Track ID:** `music_lyria_20261104` · **Type:** Feature · **Source:** Riccardo, 2026-11-03 20:56

## 1. Overview
Add relaxing background music generated with **Lyria**: piano and strings, in the spirit of Jean-Michel Jarre —
music that builds expectation and **never resolves**, so it can loop forever without "ending" and without
becoming repetitive or annoying during long family sessions.

## 2. Functional Requirements

### FR-1 The main theme (generated offline with Lyria Pro)
- One full-length piece (2–3 min) generated with `lyria-3-pro-preview` (skill `musicgen-lyria3`, 2-min script).
- Musical brief: slow, calm (~70–80 BPM), felt piano arpeggios + warm string pads, a subtle analog-synth shimmer;
  **suspended / unresolved harmony** (sus2/sus4 chords, pedal tones, an ostinato that circles around the tonic
  without landing on it), gentle swells that build anticipation and fall back; no drums, no vocals,
  no big climax, no final cadence, no fade-out ending.
- The prompt, model and generation date are saved next to the audio (`*.txt` metadata from the skill).
- Generated **once** with a script (`scripts/generate-music.sh`); the result is committed (≤ ~3 MB, web-optimised
  MP3/OGG at ~96–128 kbps). Estimate cost before generating (AI Ethics: compute proportionality).

### FR-2 Seamless endless loop
- Played through Web Audio: the decoded buffer loops with a **crossfade** (~3–4 s) between the tail and the head,
  so there is no audible seam and no silence.
- Loop points chosen to avoid cutting a note (configurable `loopStart`/`loopEnd`/`crossfade` in the manifest).

### FR-3 Victory sting
- A short (≤ 30 s) brighter variation with `lyria-3-clip-preview`, played on the victory screen; the main theme
  ducks/fades out under it and returns on "Gioca ancora".

### FR-4 Controls & defaults
- Music starts at a **low volume** (≈ 25% of SFX loudness) after the first user gesture (autoplay policies).
- A dedicated 🎵 toggle in the HUD (separate from 🔊 sound effects); the choice is persisted.
- Music fades in (~2 s) and fades out (~0.5 s) on toggle / leaving the game; the celebration popup ducks it slightly.
- `prefers-reduced-motion` does not affect music; muting SFX does not mute music and vice versa.

### FR-5 Offline (PWA)
- Music is **runtime-cached** (not precached): the first install stays light and the game starts instantly.
  Offline on a first-ever launch → silent, no errors; after the first listen it plays offline too.

## 3. Non-Functional
- No impact on start-up: audio is fetched lazily after the start screen is interactive (cached start < 200 ms).
- Memory: the decoded buffer is created once and reused.
- Same quality gates: TDD, ≥ 80% coverage, e2e on the production build, axe 0 serious violations.

## 4. Acceptance Criteria
1. `scripts/generate-music.sh` produces the theme + victory sting with saved prompts/metadata.
2. Music starts softly after the first tap, loops with no audible seam (crossfade verified by unit tests on the
   scheduling logic), and never stops by itself.
3. 🎵 toggles music only; state persisted across reloads; 🔊 still controls only SFX.
4. Victory plays the sting and the theme returns afterwards.
5. Offline after a first visit plays music; offline on first visit is silent without errors.
6. Cached start-up stays < 200 ms; no console errors.

## 5. Out of Scope
- Per-level themes, adaptive/generative music that reacts to moves, Veo videos (#2), PuffinLogin (#1).
