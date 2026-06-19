# Store screenshot builder

Generates the **branded** App Store / Google Play phone screenshots: each real
in-app capture is dropped into a CSS device mockup over the TrendyWheels gradient
with an [Anton](https://fonts.google.com/specimen/Anton) caption + brand wordmark.

## Run

```bash
./render.sh
```

Outputs (overwritten in place, numbered = upload order):

| Store          | Folder                    | Size      | Count |
| -------------- | ------------------------- | --------- | ----- |
| App Store 6.7" | `../ios-6.7/NN.png`       | 1290×2796 | 6     |
| Play phone     | `../android-phone/NN.png` | 1080×1920 | 5     |

`render.sh` fetches the brand fonts (Anton + Source Sans 3) into `~/.fonts` on
first run and auto-detects Playwright's bundled Chromium (override with
`CHROME=/path/to/chrome ./render.sh`).

## Edit captions / order / screens

Everything lives in the `FRAMES` array in [`gen.mjs`](./gen.mjs):

- **Caption** — `t:` is the Anton title; wrap the accent word in `<b>…</b>`.
  `k:` is the small kicker above it.
- **Accent** — `a:` is one of `PINK / BLUE / CYAN / LIME`; it tints the kicker,
  the underline, the bottom progress dot and the top-corner glow.
- **Screen** — `src:` points at a file in `sources/`. Drop a fresh capture in
  `sources/` (any portrait JPG/PNG) and point a frame at it.
- **Order** — the array order is the gallery order.

Then `./render.sh` again. Layout constants (font sizes, device radius, padding)
are in the per-platform `SPEC` object.

## Sources

`sources/` holds the exact captures used, renamed by role
(`ios-1-home.jpg`, `and-3-detail.jpg`, …). Replace these after a UI refresh to
keep the store listing current. Captions are derived from the Play full
description in [`../play-store-submission.md`](../play-store-submission.md).

## Add the 6.5" iPhone slot (optional)

App Store Connect back-fills 6.5" from the 6.7" set, so it isn't required. To
produce it anyway, add an `ios65` entry to `SPEC` (`CW:1242, CH:2208`) and a
platform tag on the frames you want.
