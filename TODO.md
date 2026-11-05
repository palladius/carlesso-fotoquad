# TODO — Carlesso FotoQuad

## Completed Tasks
- [x] **Add Sebi Bond 007 photo to FotoQuad**:
  - Placed image in `public/photos/demo/sebi_bond.jpg` (896×1200 3:4 portrait JPEG).
  - Placed backup copies in project root as `sebi_bond.jpeg` and `sebi_bond.jpg`.
  - Registered in `public/photos/photos.json` with tags `["sebi", "pixar", "007"]` and title `"My name is Bond, Sebi Bond"`.
  - Verified with `CI=true npm test` (139 passing tests) and `npm run build` (successful production PWA build).

---

## Instructions: How to Add Photos to FotoQuad

### A. Public Demo Photos (Committed to Git)
1. **Place image**: Copy 3:4 portrait JPEG into `public/photos/demo/<filename>.jpg`.
2. **Update Manifest**: Add an entry to `public/photos/photos.json`:
   ```json
   {
     "id": "unique_id",
     "src": "demo/<filename>.jpg",
     "title": "Titolo della foto",
     "year": 2026,
     "tags": ["sebi", "pixar"]
   }
   ```
3. **Verify**:
   ```bash
   npm test
   npm run build
   ```

### B. Private Family Photos (Git-Ignored, Local Only)
1. **Create directory** (if not already present):
   ```bash
   mkdir -p public/photos/private
   ```
2. **Copy photos**:
   ```bash
   cp /path/to/my_photo.jpg public/photos/private/
   ```
3. **Create / Edit Manifest** `public/photos/private/photos.json`:
   ```json
   [
     {
       "id": "summer_vacation_2026",
       "src": "private/summer.jpg",
       "title": "Vacanze al mare",
       "year": 2026,
       "tags": ["ale", "sebi", "famiglia"]
     }
   ]
   ```
4. Note: Photos in `public/photos/private/` are merged automatically by `src/platform/manifest.ts` into the rotation during local runs (`just dev` / `npm run dev`), but are git-ignored and never committed or deployed to public GitHub Pages.

---

## Upcoming / Backlog
- [ ] Push new `sebi_bond` commit to GitHub to trigger Pages auto-deploy.
- [ ] Party mode (3-minute timer + combos).
- [ ] Shuffle / Pesca Tattica mode.
