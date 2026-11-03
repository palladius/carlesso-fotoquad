# 📸🧩 Carlesso FotoQuad — Il Solitario di Famiglia

[![CI](https://github.com/palladius/carlesso-fotoquad/actions/workflows/ci.yml/badge.svg)](https://github.com/palladius/carlesso-fotoquad/actions/workflows/ci.yml)
[![Deploy](https://github.com/palladius/carlesso-fotoquad/actions/workflows/pages.yml/badge.svg)](https://github.com/palladius/carlesso-fotoquad/actions/workflows/pages.yml)

🎮 **Play:** **https://palladius.github.io/carlesso-fotoquad/** (installable PWA, works offline after the first visit)

A family photo **match-4 solitaire**. Every portrait photo is auto-sliced into 4 quadrants (TL / TR / BL / BR)
and shuffled on a green-felt table with 5 draw decks. Rebuild a photo → it pops up with its caption, confetti and
a chime, the pieces are discarded and 4 new tiles are dealt. Keep going until every memory is rebuilt!

![FotoQuad](docs/screenshot.jpg)

## Levels

| Level | How it plays | Doable photos on the table |
|---|---|---|
| 🐣 **Facile** | tap a tile → it flies to its slot in a 2×2 tray (great for little ones) | several |
| 🙂 **Medio** | drag tiles **inside the board** (or tap-tap) until the 4 pieces form their 2×2 block | 1–3 |
| 🧠 **Difficile** | same, but the dealer guarantees **exactly one** doable photo | 1 |

The "exactly one" rule holds as long as the maths allows it: with few photos left, more become doable. Packs with
≥ 15 photos keep the challenge for most of the game.

## Adding your own (private) family photos

This repo is **public**: only illustrated demo images (Nano Banana) are committed. Real photos go in the
git-ignored folder `public/photos/private/`:

```bash
mkdir -p public/photos/private
cp ~/Pictures/best-of/*.jpg public/photos/private/
```

and a manifest `public/photos/private/photos.json` (same format as [`public/photos/photos.json`](public/photos/photos.json)):

```json
[
  { "id": "tennis_2026", "src": "tennis.jpg", "title": "Campioni al Sonnenberg", "year": 2026, "tags": ["ale", "sebi"] }
]
```

- Any aspect ratio works: photos are centre-cropped to 3:4 portrait and sliced in the browser — no Photoshop.
- Tags drive the packs: `ale`/`sebi` → 👦👦 I Bimbi, `viaggi`/`vacanze` → 🏖️ Vacanze & Viaggi,
  `gamberone`/`dreamworks` → 🦐 Gamberone & Dreamworks; everything → 📚 Tutto l'Archivio.
- Private photos are only available in your local build (`just dev` / `just build`), never on GitHub Pages.

## Development

```bash
just install   # npm install
just dev       # http://localhost:5173
just test      # unit tests (Vitest)
just coverage  # with the 80% gate used in CI
just e2e       # Playwright (builds + previews production, incl. offline PWA test)
just lint
```

Tip: `PW_BASE_URL=http://localhost:5173 npx playwright test` runs e2e against an already running dev server
(PWA tests are skipped there, the service worker only exists in production builds).

## Architecture

- `src/engine/` — pure, deterministic game engine (seeded RNG, solvability-aware dealer, reducer, serialisation).
- `src/platform/` — manifest loader, canvas slicer, storage, Web Audio SFX.
- `src/ui/` — DOM rendering, FLIP animations, drag & drop, screens.
- Spec-driven with [Conductor](https://github.com/gemini-cli-extensions/conductor): see [`conductor/`](conductor/)
  and the original idea in [`docs/spec/SPEC.md`](docs/spec/SPEC.md).

## Roadmap

- 🐧 [PuffinLogin integration](https://github.com/palladius/carlesso-fotoquad/issues/1): per-user album, records and family high scores.
- Party mode (3-minute timer + combos), Shuffle / Pesca Tattica mode (see SPEC §4).
