# TrendyWheels – Root Agent Guide

## Quick Start

```bash
pnpm install          # install all dependencies
pnpm dev              # start all apps in dev mode
pnpm build            # build all apps
pnpm lint             # lint all apps
pnpm typecheck        # type-check all apps
pnpm test             # run all tests
```

## Architecture

This is a **pnpm + Turborepo monorepo**. Code sharing happens via `packages/`.

### Apps (deployable)

| App       | Path             | Framework             | Deploy Target                |
| --------- | ---------------- | --------------------- | ---------------------------- |
| API       | `apps/api`       | Express + TS + Prisma | VPS (PM2)                    |
| Mobile    | `apps/mobile`    | Expo SDK 51           | App Store / Play Store (EAS) |
| Admin     | `apps/admin`     | Next.js 14            | Vercel                       |
| Support   | `apps/support`   | Next.js 14            | VPS (PM2)                    |
| Inventory | `apps/inventory` | Next.js 14            | VPS (PM2)                    |

### Packages (shared)

| Package                    | Path                  | Purpose                         |
| -------------------------- | --------------------- | ------------------------------- |
| `@trendywheels/db`         | `packages/db`         | Prisma schema, migrations, seed |
| `@trendywheels/types`      | `packages/types`      | Shared TypeScript types         |
| `@trendywheels/api-client` | `packages/api-client` | Typed HTTP client               |
| `@trendywheels/validators` | `packages/validators` | Shared zod schemas              |
| `@trendywheels/ui-tokens`  | `packages/ui-tokens`  | Design tokens                   |
| `@trendywheels/ui-web`     | `packages/ui-web`     | Shadcn-based web components     |
| `@trendywheels/ui-mobile`  | `packages/ui-mobile`  | React Native components         |
| `@trendywheels/i18n`       | `packages/i18n`       | Translations (en, ar)           |

## Rules for Agents

1. Read the relevant `AGENTS.md` in each app before making changes.
2. Never duplicate types, validators, or API client code – use shared packages.
3. Run `pnpm typecheck` after any type changes.
4. Run `pnpm lint` before committing.
5. Use Conventional Commits with scope.
6. Never modify `packages/db/prisma/schema.prisma` without also creating a migration.
7. See `.github/copilot-instructions.md` for full coding standards.
8. **Before fixing any non-trivial bug, grep [INCIDENTS.md](./INCIDENTS.md) for the symptom or touched file path.** If a past INC matches, reuse that fix's pattern — don't invent a parallel one. If the existing pattern is wrong for your case, update the INC entry with the new variant (and why); don't fork it.
9. **After fixing any non-trivial bug, append an INC entry to [INCIDENTS.md](./INCIDENTS.md).** Trigger: anything that took >10 min to diagnose, touched >2 files, or produced a user-visible / Sentry / Play / Firebase error. Skip trivial typos and patch-only dep bumps.
