#!/usr/bin/env bash
# Generates FotoQuad's background music with Lyria 3 (track music_lyria_20261104, FR-1 / FR-3).
# One-off: the results are committed under public/music/. Re-run only to replace them.
# Requires GEMINI_API_KEY (or GOOGLE_API_KEY) and `uv`.
set -euo pipefail

SKILL=${LYRIA_SKILL_DIR:-$HOME/.gemini/config/plugins/palladius-common-commands/skills/musicgen-lyria3/scripts}
OUT=$(cd "$(dirname "$0")/.." && pwd)/public/music
mkdir -p "$OUT"
export UV_CACHE_DIR=${UV_CACHE_DIR:-/tmp/uv-cache} UV_LINK_MODE=${UV_LINK_MODE:-copy}

# NB: no artist names in prompts (Lyria's safety filter blocks them) — the style is described instead.
THEME_PROMPT="Instrumental ambient piece for a calm family puzzle game, about 2 to 3 minutes long. \
Slow and relaxing, around 72 BPM. Soft felt piano playing gentle repeating arpeggios over warm, slowly swelling \
string pads, with a subtle shimmering vintage analog synthesizer in the background, in the style of late-1970s \
French electronic ambient music. The harmony stays suspended and unresolved the whole time: sus2 and sus4 chords, \
a pedal tone, an ostinato that circles around the home key without ever landing on it. Gentle waves of \
anticipation that build softly and then fall back, a feeling of quiet expectation and wonder. \
No drums, no percussion, no vocals, no big climax, no final cadence, no ending and no fade-out: \
it must feel like it could continue forever so it can loop seamlessly."

STING_PROMPT="Short instrumental victory flourish, about 20 seconds, same sound world as a calm ambient game theme: \
soft felt piano and warm strings with a light shimmering analog synthesizer. Bright and joyful, a rising arpeggio \
that blooms into a warm major chord, like a happy sigh of relief after finishing a puzzle. \
No drums, no vocals."

cd "$OUT"
echo "🎹 Main theme (lyria-3-pro-preview)…"
uv run "$SKILL/musicgen-lyria3-2min.py" -p "$THEME_PROMPT" -o theme-raw.mp3
echo "🏆 Victory sting (lyria-3-clip-preview)…"
uv run "$SKILL/musicgen-lyria3-30sec.py" -p "$STING_PROMPT" -o victory-raw.mp3

{
  echo "Generated: $(date -Iseconds)"
  echo "Theme model: lyria-3-pro-preview"
  echo "Theme prompt: $THEME_PROMPT"
  echo "Sting model: lyria-3-clip-preview"
  echo "Sting prompt: $STING_PROMPT"
} > PROMPTS.txt
echo "✅ Done: $OUT"
