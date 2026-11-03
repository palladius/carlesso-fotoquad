# Track Spec — Photo Rotation, Simpler Start & Snappy Celebration

**Track ID:** `rotation_ux_20261103` · **Type:** Feature · **Source:** Riccardo's feedback 2026-11-03 17:07

## 1. Overview
After the MVP, playtesting showed: (1) the board is only fun when it **overflows** (more tiles than the 30 slots),
(2) the start screen offers too many choices, (3) waiting ~5s after each completed photo kills the flow.
This track makes the game pick and **rotate** photos automatically, simplifies the start to 3 big buttons, adds
16 new funny demo illustrations, supports real (private, local-only) photos, and makes the celebration snappy and
dismissible with one tap.

## 2. Functional Requirements

### FR-1 Start screen: just three buttons
- Logo + **three big buttons**: 🐣 Facile, 🙂 Medio, 🧠 Difficile. One tap starts a game immediately.
- Secondary, small: "▶️ Continua" (only if a saved game exists) and 📖 Album.
- No pack selection anymore (packs UI removed).

### FR-2 Photos per game (overflow by design)
| Level | Photos per game | Tiles | Overflow vs 30-slot board |
|---|---|---|---|
| Facile | 6 | 24 | none (gentle, for small kids) |
| Medio | 16 | 64 | +34 hidden in the decks |
| Difficile | 24 | 96 | +66 hidden in the decks |
- If the library has fewer photos, use all of them.

### FR-3 Rotation ("effetto novità")
- The game picks photos itself, **least-recently-played first** (ties broken randomly), so each new game brings
  photos not seen recently. Play history is persisted locally (`lastPlayed` per photo id).
- Real private photos (FR-5) take part in the rotation alongside the demo ones.

### FR-4 Records per level
- Personal best (fewest moves) is kept per level instead of per pack.

### FR-5 Real photos (local only)
- Real family photos live in the git-ignored `public/photos/private/` (+ `photos.json`) and are only available in
  local builds. Never committed, never deployed.

### FR-6 New demo illustrations
- 16 additional Nano Banana illustrations (Ale & Seby scuba divers, Oktoberfest in lederhosen, rock band with Ale
  on drums and Seby on piano, pirates, Halloween, Gamberone rock star/surfer, …) → 26 public demo photos.

### FR-7 Snappy, dismissible celebration
- Shorter automatic celebration; one tap/key dismisses it. Hardened by an adversarial review — see §2.1.

### 2.1 Celebration — hardened spec (adversarial review, 2026-11-03)
An adversarial reviewer agent attacked the first proposal ("auto-hide after 1.2s, any tap dismisses") and found
ghost-dismiss, ghost-click-through and victory-screen hazards. Final rules (constants in `src/ui/table.ts` `TIMING`):
- **Timings:** PRE 150ms → INTRO 320ms → **HOLD 1400ms** → FADE 180ms → DISCARD 250ms → deal stagger 70ms.
  Auto path match → playable ≈ 2.6s (was ≈ 3.7s); skipping ≈ 0.85s.
- **Dismiss:** any primary pointerdown anywhere (photo included — kids tap what they look at) or Enter/Space/Escape,
  only after **ARM 350ms** from the popup appearing, so the gesture that completed the photo can't dismiss it.
  Listeners are attached in the next task; `e.repeat` and Tab are ignored; idempotent.
- **No ghost clicks:** the popup is a full-screen shield (`pointer-events:auto`, `touch-action:none`); it stays until
  the dismissing finger lifts (≤ 600ms) and the following `click` is swallowed (500ms). Victory buttons ignore
  clicks for 400ms after mounting.
- **Hurry mode:** after a dismiss, the rest of the move is fast-forwarded (further popups in the same move skipped,
  deal stagger 0); the confetti layer is removed.
- **Robustness:** AbortController cleans up listeners/timers; leaving the game mid-celebration removes the popup and
  never shows a stale victory screen.
- **Accessibility:** popup is `aria-hidden`; a persistent polite live region announces "Foto completata: …";
  keyboard players get focus restored on the board after the discard; reduced motion keeps the same HOLD.

### FR-8 Smarter Facile layout *(added 2026-11-03 20:28, Riccardo's feedback)*
- Games that don't overflow the board (e.g. Facile: 24 tiles on 25 slots) hide the empty decks.
- On a wide screen the Facile tray sits **beside** the grid (vertically centred) instead of below it → bigger tiles,
  HUD always visible.

## 3. Non-Functional
- Same quality gates as the MVP: TDD, ≥ 80% coverage, e2e on the production build, axe 0 serious violations.

## 4. Acceptance Criteria
1. Start screen shows exactly 3 level buttons (+ Continua/Album when relevant); one tap starts a game.
2. Medio/Difficile games overflow (piles non-empty at start) with the 26-photo demo library.
3. Two consecutive games share as few photos as possible (rotation), verified by unit tests.
4. Records are tracked per level.
5. Celebration can be dismissed with one tap without the dismissing tap affecting the board; auto-dismisses quickly.
6. Real private photos appear in local builds and never in git.

## 5. Out of Scope
- Veo animations ([#2](https://github.com/palladius/carlesso-fotoquad/issues/2)), PuffinLogin ([#1](https://github.com/palladius/carlesso-fotoquad/issues/1)).
