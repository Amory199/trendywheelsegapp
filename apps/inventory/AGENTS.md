# Inventory Dashboard – Agent Guide

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/ui + TanStack Query + Leaflet + FullCalendar

## Key Features

- Real-time vehicle availability map (Leaflet + OpenStreetMap)
- Maintenance scheduling (FullCalendar)
- Stock level alerts (configurable rules)
- Vehicle condition tracking with photo timeline

## Commands

```bash
pnpm dev           # next dev (port 3003)
pnpm build         # next build
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
```

## Rules

- Same component/token/type conventions as Admin dashboard.
- Maps: Leaflet + OpenStreetMap (no Google Maps fees).
- Deploy to VPS via PM2 (not Vercel).
- Port: 3003 in dev and production.
