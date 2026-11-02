# Track Spec — MVP: Zen Solitaire Core Loop (PWA)

**Track ID:** `mvp_zen_20261102` · **Type:** MVP · **Source:** [`docs/spec/SPEC.md`](../../../docs/spec/SPEC.md)

## 1. Overview
Deliver the first playable, installable, offline version of Carlesso FotoQuad: the full match-4 core loop in
**Zen mode**, with a 2×2 assembly tray, deck refill, hint, victory screen + photo album, local persistence and
PWA offline support. Shuffle/Pesca Tattica and Party modes are out of scope (future tracks).

## 2. Functional Requirements

### FR-1 Photo manifest & auto-slicing
- Photos are declared in `public/photos/photos.json` (`id`, `src`, `title`, `year`, `tags[]`) — SPEC §3.1 format.
- An optional git-ignored `public/photos/private/photos.json` is merged in when present (real family photos).
- At startup each image is loaded and sliced client-side into 4 equal quadrants `TL`, `TR`, `BL`, `BR`
  (Canvas / `createImageBitmap`). Non-3:4 images are centre-cropped to 3:4 before slicing.
- A photo that fails to load is skipped with a console warning; the game still starts if ≥ 1 photo loads.

### FR-2 Packs (album filters)
- Start screen lets the player pick a pack, derived from tags: **I Bimbi** (`ale`/`sebi`), **Vacanze & Viaggi**
  (`viaggi`), **Gamberone & Dreamworks** (`gamberone`), **Tutto l'Archivio** (all). Empty packs are hidden.

### FR-3 Table layout
- **Top bar**: 5 face-down draw piles with card-back art and remaining-count badge. Remaining tiles are split
  round-robin across the 5 piles.
- **Tableau**: 5 columns × 6 rows (30 slots). If the deck has fewer than 30 tiles, all are shown.
- **Assembly tray**: 4 slots laid out 2×2 (TL, TR / BL, BR).
- **HUD**: "Foto risolte: X / N", moves counter, Hint button, Album button, mute toggle, menu.

### FR-4 Core loop
1. Tapping a grid tile moves it (FLIP animation) into the tray slot matching its quadrant; its grid slot becomes empty.
2. **Conflict rule**: if that tray slot already holds a tile of a *different* photo, the new tile replaces it and
   the old tile flies back to the grid (to the slot just vacated).
3. Tapping a tile in the tray sends it back to an empty grid slot.
4. Each tile placement counts as 1 move.
5. **Match**: when all 4 tray slots hold the 4 quadrants of the same photo → seams disappear, the full photo pops up
   centred for ~1.5s with its title, chime + confetti, then the 4 tiles are discarded towards the Album icon.
6. **Refill**: empty grid slots are refilled from the draw piles with a cascading animation until piles are empty.

### FR-5 Solvability guarantee
- After the initial deal and after every refill, the visible set (grid + tray) MUST contain at least one complete
  photo (all 4 quadrants), as long as any photo remains unsolved. The dealer achieves this by choosing/swapping
  which tiles are drawn from the piles (deterministic given the seed). Grid order is shuffled so the 4 pieces of a
  photo are never all adjacent in their natural 2×2 arrangement.

### FR-6 Hint (Zen)
- The Hint button highlights (border + glow + gentle pulse) the 4 visible tiles of one completable photo for ~3s.
  Hint usage is counted in the score summary.

### FR-7 Victory & Album
- When the last photo is matched: Grand Finale screen (fireworks/confetti), stats (photos, moves, hints, time),
  "Gioca ancora" and "Sfoglia l'Album".
- **Album**: fullscreen swipeable/arrow-navigable gallery of all photos ever unlocked (persisted), with titles/years.

### FR-8 Persistence
- `localStorage` (versioned schema): unlocked photo IDs, personal records per pack (fewest moves), and an
  in-progress game snapshot saved after every move. Reloading the tab resumes exactly where the player left off.
- Corrupt/old-schema data is discarded safely (fresh start, no crash).

### FR-9 Audio
- Web Audio synthesised SFX: tile tap, tile land, match chime, victory jingle. Global mute persisted.
  Audio context unlocked on first user gesture.

### FR-10 PWA & offline
- Web app manifest (name, icons, portrait orientation, theme colour = felt green) → installable on Android/iOS.
- Service Worker precaches app shell + all manifest photos; the game is fully playable in airplane mode after
  first load.

### FR-11 Demo assets
- 10 portrait (3:4) demo images generated with Nano Banana (stylised family scenes / Gamberone shrimp, no real
  faces), committed under `public/photos/demo/` with a `photos.json` entry each, plus card-back art and app icons.

## 3. Non-Functional Requirements
- **Architecture**: pure, DOM-free, deterministic engine (`src/engine/`) with seeded RNG; UI and platform
  adapters separate (see `tech-stack.md`).
- **Performance**: interactive < 200ms after assets cached; animations at 60fps on a mid-range phone.
- **Responsive**: mobile portrait (360×640 up) primary; desktop centred layout, max-width table.
- **Accessibility**: tiles are buttons, ≥ 44px targets, keyboard operable, `prefers-reduced-motion` honoured,
  HUD contrast WCAG AA.
- **Quality**: ≥ 80% coverage on engine and adapters; Playwright e2e covering a full game with a small pack.
- **Privacy**: no network calls besides own static assets; `public/photos/private/` git-ignored.

## 4. Acceptance Criteria
1. With the demo manifest, every photo is split into 4 correct geometric quadrants (unit-tested on pixel data).
2. The initial grid is shuffled, non-trivial, and contains at least one completable photo (property-tested over many seeds).
3. Placing 4 quadrants of the same photo in the tray triggers the completion animation and removes them.
4. The 4 vacated slots are refilled from the piles until exhaustion; pile counters update.
5. Conflict rule and tap-to-return behave as specified.
6. Completing all photos shows the victory screen with recap; "Gioca ancora" starts a fresh game; Album shows unlocked photos.
7. Reloading mid-game restores the exact state.
8. Layout works at 360×640, 390×844 and 1440×900 without overflow (Playwright screenshots).
9. After first load, the app works offline (Playwright offline test) and passes PWA installability checks.
10. Deployed to GitHub Pages via GitHub Actions.

## 5. Out of Scope (future tracks)
- Shuffle / Pesca Tattica mode (moving/swapping tiles, Spider-style dealing).
- Party mode (3-min timer, combo multipliers).
- In-app photo upload UI (photos are added via files + JSON).
- Teak wood theme, i18n beyond Italian UI.
