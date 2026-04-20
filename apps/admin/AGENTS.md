# Admin Dashboard – Agent Guide

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/ui + TanStack Query + Zustand + Recharts

## Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── (dashboard)/  # authenticated layout
│   │   ├── overview/ # dashboard overview
│   │   ├── vehicles/ # vehicle CRUD
│   │   ├── bookings/ # booking management
│   │   ├── users/    # user management
│   │   ├── revenue/  # analytics & reports
│   │   └── settings/ # system config
│   ├── login/        # auth pages
│   └── layout.tsx
├── components/       # page-specific components
├── hooks/            # custom hooks
├── lib/              # utilities
└── styles/           # global styles
```

## Commands

```bash
pnpm dev           # next dev
pnpm build         # next build
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
```

## Rules

- Use `@trendywheels/ui-web` (Shadcn-based) components.
- Use `@trendywheels/ui-tokens` Tailwind preset for colors/spacing.
- Charts: Recharts only.
- Server state: TanStack Query. Client state: Zustand.
- RBAC: enforce both server-side (API) and client-side (route guards + UI gating).
- Deploy to Vercel. Use Server Components where possible.
- Lighthouse target: ≥90 on all metrics.
