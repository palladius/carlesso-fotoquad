# Product Definition — Carlesso FotoQuad

## Title
**Carlesso FotoQuad — Il Solitario di Famiglia** 📸🧩

## Summary
A match-4 solitaire puzzle, built as an offline-first PWA, where uniformly-portrait family photos are
auto-sliced into 4 quadrants and reassembled on a green-felt solitaire table (5 draw decks on top, a 5×6
tableau grid, a 2×2 assembly tray). No server, no login, no ads.

Full source spec: [`docs/spec/SPEC.md`](../docs/spec/SPEC.md).

## Problem
Mobile solitaire/match puzzles are full of ads, anonymous art and nonsensical AI collages. The core mechanic
(green table, card decks on top, grid of photo fragments to recompose) is hypnotic and great — but the content
is meaningless.

## Vision
Take that viral mechanic and make it elegant, personal and affectionate for the Carlesso family: every
completed picture is a memory (Ale & Seby at tennis camp, Zurich trams, holidays, Gamberone Dreamworks avatars).

## Target Users
- **Players**: the Carlesso family — Riccardo, Kate, Alessandro (Primary 3) and Sebastian (Primary 1). Kids must
  be able to play without reading much text.
- **Curator**: Riccardo, who adds photos by just dropping files + a JSON entry — no Photoshop, no manual slicing.

## Core Loop
1. N portrait photos → each auto-sliced client-side (Canvas) into TL / TR / BL / BR tiles → deck of N×4 tiles.
2. Tiles are shuffled; 25–30 are visible on the tableau, the rest wait in 5 face-down decks.
3. Player taps tiles; each tile flies to its natural slot in the 2×2 assembly tray.
4. When the 4 quadrants of the same photo are in the tray: they merge, a celebratory popup shows the full photo
   with its caption (~1.5s), chime + confetti.
5. The 4 tiles are discarded towards the Album; 4 new tiles cascade from the decks into the empty slots.
6. When all decks are empty and the last photo is rebuilt → Grand Finale + interactive photo Album.

## Key Features
- Client-side auto-slicing from a simple `photos.json` manifest.
- Themed packs / album filters ("I Bimbi", "Vacanze & Viaggi", "Gamberone & Dreamworks", "Tutto l'Archivio").
- Game modes: **Zen** (default, no timer, hint button), **Shuffle / Pesca Tattica**, **Party** (3-min timer + combos).
- Persistent progress (`localStorage`): unlocked album, records, resume in-progress game.
- Installable PWA, fully offline (code + images cached by a Service Worker).

## Success Criteria (Definition of Done, from SPEC §6)
1. N portrait photos are correctly sliced into 4 geometric quadrants.
2. The grid shows shuffled tiles without revealing a trivial solution.
3. Selecting the 4 correct quadrants merges them, plays the completion animation and removes them.
4. The 4 empty slots are refilled from the decks until exhaustion.
5. When all photos are completed, a victory screen shows the album recap and allows restarting.
6. 100% responsive on mobile portrait and desktop.
7. Works offline as a PWA.

## Privacy
The repo is public: only placeholder / generated demo images are committed. Real family photos live in the
git-ignored `public/photos/private/` folder (with a private manifest) and are never pushed.
