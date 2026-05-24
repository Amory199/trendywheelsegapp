# @trendywheels/ui-brand

**Web-only** brand UI primitives — React components built with Tailwind +
the tokens from `@trendywheels/ui-tokens`. Shared between the four Next.js
apps (customer, admin, support, inventory).

## What it owns

- Buttons, badges, cards, layout shells, gradient heroes — anything
  multiple web apps render the same way.
- Theming helpers (light/dark/system).

## When to use

- Any new web (Next.js) screen. Compose with these instead of writing raw
  Tailwind utility soup.

## When NOT to use

- Mobile. This package depends on `next` and `tailwindcss` — both poison
  the React Native Metro bundler.
- One-off page-specific components. If it's used by exactly one screen,
  keep it next to that screen.

## Difference from ui-tokens

`ui-tokens` is the values (colors, spacing, motion). `ui-brand` is the
components that consume those values. Mobile uses `ui-tokens` directly +
its own primitives; web uses both.
