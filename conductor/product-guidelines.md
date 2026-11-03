# Product Guidelines — Carlesso FotoQuad

## Voice & Tone
- **Warm, playful, familiar.** This is a family game, not a casino. Celebrate memories, never pressure.
- **Italian-first UI copy** (e.g. "Foto risolte", "Album Ricordi", "Aiuto"), with English in code, comments and docs.
- Short labels, emoji welcome (📸 🧩 🏆 🦐). Kids aged ~6–9 must understand the game mostly from visuals.

## Visual Identity
- Table: dark green felt (casino-solitaire) as default theme; optional dark teak wood theme.
- Card backs: family crest / Gamberone shrimp pattern.
- Tiles: photo first — no frame, ~1px separation, at most ~3px corner radius (every border pixel hides photo).
- Celebration: confetti/particles + soft glow; the completed photo is the hero for ~1.5s.
- Never stretch or distort photos: preserve aspect ratio (portrait 3:4 by default), use `object-fit: cover` crop.

## UX Principles
1. **One-handed portrait play** on a phone is the primary target; desktop is a scaled-up layout, not a different game.
2. **Instant feedback**: every tap produces motion (FLIP animation) and a tactile sound within 100ms.
3. **No dead ends**: Zen mode always offers a hint; the player can never get irrecoverably stuck.
4. **Forgiving input**: drag & drop or tap-tap to swap; dropping outside the tableau cancels the move.
5. **Respect the device**: honour `prefers-reduced-motion` (no confetti/flying, just fades) and a global mute toggle.
6. **Fast**: interactive in < 200ms on a mid-range phone after first load; no layout shift.

## Accessibility
- Touch targets ≥ 44×44 CSS px.
- Tiles are focusable buttons with `aria-label` (e.g. "Quadrante alto-sinistra, foto 3") — but labels must not
  give away the photo identity in a way that trivialises the game for sighted players.
- Colour is never the only signal (highlight = border + glow + slight scale).
- Sufficient contrast for HUD text on the felt background (WCAG AA).

## Privacy
- No analytics, no network calls beyond loading the app's own static assets.
- Real family photos are never committed to the public repo.
