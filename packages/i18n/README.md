# @trendywheels/i18n

Translation tables and locale helpers for **English (default) + Arabic
(RTL)**. Used by every frontend.

## What it owns

- The full key → string dictionary per locale.
- `t(key, locale)` lookup helper.
- RTL-aware string helpers (date format, money format with Arabic numerals
  when appropriate).
- The shared `Locale = "en" | "ar"` type.

## When to use

- Any user-facing string that the support team would notice if it landed
  untranslated. App nav, button labels, empty states, error toasts.

## When NOT to use

- Debug/log strings. Those stay English.
- Admin-only labels — they stay English for now (no Arabic translation
  effort planned for staff UI).

## Adding a key

1. Add the key to **both** locale dictionaries — TypeScript will catch
   missing translations on the next build.
2. Use semantic keys (`booking.list.empty`) not English phrases as keys.
3. Test the Arabic side in the app — text expansion is real, layout
   shifts can surprise you.
