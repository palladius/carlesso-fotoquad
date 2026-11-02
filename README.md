# 📸🧩 Carlesso FotoQuad — Il Solitario di Famiglia

A family photo **match-4 solitaire puzzle**, built as an offline-first PWA.

Every portrait photo is auto-sliced into 4 quadrants (TL / TR / BL / BR) and shuffled on a green-felt table.
Find the 4 pieces of the same photo → they snap back together, a celebration plays, the pieces are discarded and
4 new tiles are dealt from the decks on top. Keep going until every memory is rebuilt!

- 📄 Full spec: [docs/spec/SPEC.md](docs/spec/SPEC.md) (origin: [palladius/respec](https://github.com/palladius/respec/tree/main/specs/games/family-photo-quad-match))
- 🎙️ Original idea: [docs/spec/input_prompt.md](docs/spec/input_prompt.md)
- 🖼️ Inspiration: [docs/spec/assets/screenshot_reference.jpg](docs/spec/assets/screenshot_reference.jpg)

## Status

🚧 Pre-alpha — implementation driven by [Conductor](https://github.com/gemini-cli-extensions/conductor) tracks (see `conductor/`).

## Privacy note

This repo is **public**. Real family photos should NOT be committed: the demo ships with placeholder/generated
images, and personal photos live in a git-ignored folder (`assets/photos/private/`).
