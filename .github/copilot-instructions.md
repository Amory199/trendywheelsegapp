# TrendyWheels – Copilot Instructions

## Project Overview

TrendyWheels is a vehicle rental, sales, and repair management platform for Egypt. It consists of:

- **Mobile app** (Expo/React Native) – customer-facing
- **Admin dashboard** (Next.js 14) – vehicle, booking, user, revenue management
- **Support dashboard** (Next.js 14) – tickets, live chat, knowledge base
- **Inventory dashboard** (Next.js 14) – vehicle availability, maintenance, stock alerts
- **Backend API** (Express + TypeScript) – REST + Socket.io
- **Shared packages** – types, validators, UI tokens, API client, i18n

## Monorepo Structure

- `apps/` – deployable applications
- `packages/` – shared internal packages (prefixed `@trendywheels/`)
- `infra/` – server configs, Docker, Nginx, scripts

## Code Standards

### TypeScript

- **Strict mode everywhere.** No `any` without an ESLint-disable comment explaining why.
- Use `type` imports: `import type { Foo } from "./foo"`.
- Prefer interfaces for object shapes, types for unions/intersections.
- All public functions must have explicit return types.

### Shared Code

- **Never duplicate types.** Import from `@trendywheels/types`.
- **Never duplicate validation.** Import zod schemas from `@trendywheels/validators`.
- **Never duplicate API calls.** Use `@trendywheels/api-client`.
- **Never hardcode colors/spacing.** Use `@trendywheels/ui-tokens`.

### Security

- Never commit secrets, tokens, or API keys. Use `.env` files.
- Validate all inputs at system boundaries with zod.
- Use parameterized queries (Prisma handles this).
- Never log PII (emails, phones, tokens).
- Always use HTTPS URLs.
- Sanitize user-generated content before rendering.

### Naming Conventions

- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components.
- Variables/functions: `camelCase`.
- Types/interfaces: `PascalCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Database columns: `snake_case`.
- API routes: `kebab-case` (e.g., `/api/repair-requests`).

### Design System

- Primary blue gradient: `#1E50B4` → `#3B82F6`
- Neon green accent: `#00FF00`
- Dark background: `#0F172A`
- Always use design tokens from `@trendywheels/ui-tokens`
- Mobile touch targets: minimum 44px height
- Border radius: 8px for buttons, 12px for cards

### Animations (Mobile)

- Use React Native Reanimated 2 worklets, never Animated API on hot paths.
- Target 60 FPS – never run animations on the JS thread.
- Use `useNativeDriver: true` where applicable.
- Prefer `withSpring` and `withTiming` from Reanimated.

### Testing

- Unit tests: Vitest (packages/web), Jest (mobile/API).
- API integration tests: Supertest.
- Coverage target: ≥70% global, ≥85% on auth/booking/payment modules.
- Name test files: `*.test.ts` or `*.test.tsx`.

### Git

- Conventional Commits: `feat(scope):`, `fix(scope):`, `chore(scope):`.
- Scopes: api, mobile, admin, support, inventory, db, types, validators, ui-tokens, ui-web, ui-mobile, i18n, infra, ci, deps.
- One logical change per commit.
- PR required for `main` branch.

### Performance

- Lazy load screens/routes.
- Paginate API responses (default 20 items).
- Cache GET responses for 5 minutes (TanStack Query staleTime).
- Compress images client-side before upload (max 2MB).
- Use FlashList instead of FlatList in React Native.

### i18n

- All user-facing strings through `@trendywheels/i18n`.
- Support Arabic (ar) and English (en).
- RTL layout support in all components.
