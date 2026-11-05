# AGENTS.md — Carlesso FotoQuad Assistant Context

> `GEMINI.md` is a symlink to this file. Spec-driven with Conductor: read `conductor/index.md` first.

## Project Overview
**Carlesso FotoQuad** is a family photo match-4 solitaire web game (Vite + TypeScript + PWA + Vitest + Playwright).
Each photo is split into 4 quadrants (Top-Left, Top-Right, Bottom-Left, Bottom-Right) and shuffled onto a virtual green-felt table.

## Photo Assets & Manifest Architecture

### Manifest Loader: `src/platform/manifest.ts`
The game loads photos by fetching two manifests at runtime:
1. `photos/photos.json` (Public demo illustrations, committed to repo)
2. `photos/private/photos.json` (Private family photos, git-ignored)

Both manifests share the identical schema:
```typescript
interface Photo {
  id: string;        // Unique identifier (e.g. "sebi_bond")
  src: string;       // Path relative to public/photos/ (e.g. "demo/sebi_bond.jpg" or "private/img.jpg")
  title: string;     // Display title when the puzzle is solved
  year?: number;     // Optional year
  tags?: string[];   // Filter/category tags (e.g. ["sebi", "pixar", "007"])
}
```

### How to Add a New Photo
1. **Prepare Image** (enforced by `tests/photos.test.ts`):
   - Exactly 3:4 portrait (crop it — e.g. 896×1200), ≥ 800px tall, ≤ 600 KB, JPG/PNG/WebP.
   - Demo images: `public/photos/demo/<id>.jpg` where `<id>` is lower_snake_case and equals the manifest `id`.
   - Private photos: `public/photos/private/<id>.jpg` (git-ignored, never commit real family photos).
   - Never leave copies elsewhere in the repo (images outside `public/` and `docs/` fail the tests).
2. **Update Manifest**:
   - For demo: edit `public/photos/photos.json`.
   - For private: edit `public/photos/private/photos.json`.
3. **Run Checks**:
   - `npx prettier --write public/photos/photos.json` (CI lint fails on unformatted JSON).
   - `npm test` (or `just test`) — includes the photo hygiene tests.
   - `npm run build` (or `just build`) — production build and PWA service worker check.

## Key Files
- `public/photos/photos.json`: Public manifest.
- `public/photos/demo/`: Directory for public illustrations.
- `src/engine/`: Pure deterministic puzzle logic & solver.
- `src/platform/`: Asset loading, canvas quadrant slicer, audio, storage.
- `src/ui/`: DOM renderer, drag & drop, animations.
