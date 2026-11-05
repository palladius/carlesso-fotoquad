# Changelog

All notable changes to **Carlesso FotoQuad** are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning: [SemVer](https://semver.org/).

## [0.2.1] - 2026-11-05

### Added
- Photos: "Ale e Seby a Tandem", space duel (Jedi Ale vs mini dark lord Seby), "Ale e Seby a Hogwarts",
  "Sebi Bond" (added by another agent) — 35 demo photos.
- **Photo hygiene tests** (`tests/photos.test.ts`): every demo image must be registered in `photos.json` with a
  complete entry (`id` = file name, title, tags), be exactly 3:4, ≥ 800px tall, ≤ 600 KB; no orphans, no duplicate
  ids, no stray image copies outside `public/`/`docs/`, manifest Prettier-formatted.
- Lyria background music assets (theme + victory sting) for the upcoming music track.

### Changed
- `GEMINI.md` → `AGENTS.md` (with `GEMINI.md` symlink), photo rules aligned with the tests.

### Fixed
- Removed duplicate `sebi_bond.jpg/.jpeg` copies from the repo root and re-formatted `photos.json` (CI lint was red).

## [0.2.0] - 2026-11-03

Track `rotation_ux_20261103` — playtesting feedback from Riccardo, Ale & Seby.

### Added
- **Three-button start**: just 🐣 Facile / 🙂 Medio / 🧠 Difficile; the game picks the photos.
- **Photo rotation**: least-recently-played photos first, so every game feels new; photos per game 6 / 16 / 24
  (Medio and Difficile deliberately overflow the board).
- **21 new illustrations** (31 demo photos): scuba divers, Oktoberfest, rock band, pirates, Halloween, Venice,
  Ghostbusters vs marshmallow, Seby & Pupurabbu, Ale Einstein, Colmar Petite Venise, Cala Goloritzé,
  Gamberone rockstar & surfer, …
- **Carlesso family card back**: Riccardo, Kate, Ale and Seby in ornate gold medallions around Gamberone.
- **Adaptive board shape**: on wide screens the board becomes 8×4 or 7×4 (≈ 50% bigger tiles), 5×6 on phones.
- **Landscape layouts**: Medio/Difficile put the decks in a left column and the HUD in a right column;
  Facile puts the tray beside the board; empty decks are hidden when nothing overflows.
- Optional private photos (git-ignored `public/photos/private/`, local builds only); Immich how-to in README.
- Issues: Veo animations ([#2](https://github.com/palladius/carlesso-fotoquad/issues/2)).

### Changed
- **Snappy celebration**: ~2.6s instead of ~3.7s, and **one tap anywhere skips it** — hardened by an adversarial
  review: arm delay, ghost-click shield, swallowed click, hurry mode for multi-matches, victory-button guard,
  polite live region, keyboard focus restore.
- Records are kept per level (no more packs).

### Removed
- Pack selection (I Bimbi / Vacanze / Gamberone / Tutto l'Archivio).

### Fixed
- ARIA: decks are a labelled group, HUD counters have accessible names (found by the new axe test).
- Gameplay never hangs waiting for an animation that doesn't finish (throttled frames): `settle()` timeout fallback.
- Flaky e2e helpers made deterministic (shape-agnostic 2×2 targets, BR parking, empty target slots).

## [0.1.0] - 2026-11-03

Track `mvp_zen_20261102` — first playable release (converged after 2 `conductor-converge` passes).

### Added
- Match-4 photo solitaire: client-side 3:4 slicing into quadrants, green-felt table, 5 decks, deck refill.
- Levels: 🐣 Facile (tap-to-tray), 🙂 Medio (drag & drop, ≤ 3 doable photos), 🧠 Difficile (exactly 1).
- Solvability-aware seeded dealer, hint, victory screen, photo album, auto-save/resume.
- Installable offline PWA, GitHub Pages deploy, synthesised Web Audio SFX.
- 10 Nano Banana demo illustrations; minimal tile borders.
- Quality gates: Vitest (≥ 80% coverage), Playwright e2e (offline, responsive, pixel-level slicer, axe a11y,
  cached-load < 200ms), CI.

[0.2.1]: https://github.com/palladius/carlesso-fotoquad/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/palladius/carlesso-fotoquad/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/palladius/carlesso-fotoquad/releases/tag/v0.1.0
