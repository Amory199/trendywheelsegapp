# Support Dashboard – Agent Guide

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/ui + TanStack Query + Socket.io Client

## Key Features

- Ticket management (CRUD, assignment, SLA timers)
- Live chat with customers (Socket.io `/chat` namespace)
- Customer profiles with interaction history
- Knowledge base with Postgres full-text search

## Commands

```bash
pnpm dev           # next dev (port 3002)
pnpm build         # next build
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
```

## Rules

- Same component/token/type conventions as Admin dashboard.
- Socket.io for live chat – handle reconnection gracefully.
- Deploy to VPS via PM2 (not Vercel).
- Port: 3002 in dev and production.
