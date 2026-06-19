#!/usr/bin/env bash
# Regenerate the branded store screenshots.
#   ./render.sh
# Output: store-assets/ios-6.7/NN.png (1290x2796) + store-assets/android-phone/NN.png (1080x1920)
# Requires: node, ImageMagick (optional, for the preview), and a Chromium binary
# (Playwright's bundled Chromium is auto-detected; override with CHROME=/path/to/chrome).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

# --- brand fonts (Anton display + Source Sans 3 body) ---
FONTDIR="$HOME/.fonts"; mkdir -p "$FONTDIR"
[ -f "$FONTDIR/Anton-Regular.ttf" ] || curl -fsSL -o "$FONTDIR/Anton-Regular.ttf" \
  https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf
[ -f "$FONTDIR/SourceSans3.ttf" ] || curl -fsSL -o "$FONTDIR/SourceSans3.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf"
fc-cache -f "$FONTDIR" >/dev/null 2>&1 || true

# --- locate Chromium ---
CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  CHROME="$(find "$HOME/.cache/ms-playwright" -maxdepth 3 -type f -name chrome 2>/dev/null | head -1 || true)"
fi
[ -z "$CHROME" ] && CHROME="$(command -v chromium || command -v chromium-browser || command -v google-chrome || true)"
[ -z "$CHROME" ] && { echo "No Chromium found. Set CHROME=/path/to/chrome"; exit 1; }

node gen.mjs
while IFS='|' read -r html W H out; do
  [ -z "$html" ] && continue
  "$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size="$W,$H" \
    --default-background-color=00000000 --screenshot="$out" "file://$html" >/dev/null 2>&1
  echo "  rendered $(basename "$(dirname "$out")")/$(basename "$out")  (${W}x${H})"
done < work/manifest.txt
echo "Done. iOS -> ../ios-6.7/  Android -> ../android-phone/"
