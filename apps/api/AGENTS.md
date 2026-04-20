# API – Agent Guide

## Stack

Express 4 + TypeScript + Prisma + Socket.io + BullMQ + Redis

## Structure

```
src/
├── config/        # env validation (envalid), constants
├── middleware/     # auth, rate-limit, validation, error-handler
├── modules/       # feature modules (auth, vehicles, bookings, users, messages, repairs, uploads)
│   └── <module>/
│       ├── controller.ts   # req/res handling
│       ├── service.ts      # business logic
│       ├── repository.ts   # Prisma queries
│       ├── routes.ts       # Express router
│       └── schema.ts       # zod schemas (re-export from @trendywheels/validators)
├── socket/        # Socket.io namespaces and event handlers
├── workers/       # BullMQ background jobs
├── utils/         # shared helpers (logger, s3, email, sms)
└── app.ts         # Express app setup
```

## Commands

```bash
pnpm dev           # start with hot-reload (tsx watch)
pnpm build         # compile to dist/
pnpm test          # Jest + Supertest
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm db:migrate    # prisma migrate dev
pnpm db:seed       # prisma db seed
```

## Rules

- Layered architecture: routes → controllers → services → repositories.
- Controllers only parse request + call service + send response. No business logic.
- Services contain all business logic. They call repositories and external adapters.
- Repositories are thin Prisma wrappers. No logic beyond query building.
- Validate all request bodies/params/queries with zod middleware.
- Use `@trendywheels/validators` schemas – do not create duplicate schemas.
- Log with pino (structured JSON). Never log PII or tokens.
- All errors go through the central error handler → Sentry.
- Auth: JWT (RS256) with role guard middleware.
- Rate limit: 100 req/min/user via Redis.
