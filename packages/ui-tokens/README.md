# @trendywheels/ui-tokens

**Cross-platform** design tokens — colors, spacing, typography, motion,
status pill tones, loyalty tier helpers. Mobile (React Native) and web
(Next.js) both import from here.

## What it owns

- `colors` — full brand palette (Friendly Blue, Trendy Pink, Eco Limelight,
  Pool Blue, Ultra Red, Trust Worth, Loyalty white) + hero gradient stops +
  dark/light surfaces + ink scale.
- `twPalette(dark)` — mode-aware palette resolver. Returns concrete colors
  to use given the current dark-mode flag. Use everywhere.
- Loyalty helpers (`packages/ui-tokens/src/loyalty.ts`): `TIER_NEXT`,
  `TIER_COLORS`, `TIER_GRADIENTS`, `nextTier()`, `tierProgress()`,
  `pointsToNext()`.
- Status tones (`statuses.ts`): hex pairs (`BOOKING_STATUS_TONE` etc.) for
  inline-style consumers (mobile + customer-web) plus Tailwind-class
  siblings (`BOOKING_STATUS_CLASS` etc.) for dashboard apps.
- Text helpers (`text.ts`): `initialsOf(name)` and others. Tiny, pure.

## When to use

- Always for colors, typography sizes, motion timings, status pill colors,
  loyalty tier display.
- For currency formatting: `twEGP()`, `twPrice()`.
- For touch-target sizing: `minTouch`.

## When NOT to use

- Don't put runtime UI components here. That's `@trendywheels/ui-brand`
  (web) or per-app `components/` for mobile.
- Don't hardcode `#F5B800` / `#2B0FF8` in your screen — add it to a
  semantic token here if the existing palette is missing the shade.

## Rule of thumb

If it's a number or a string that the design team would call a "token"
(color, spacing, motion ease, font weight), it belongs here.
