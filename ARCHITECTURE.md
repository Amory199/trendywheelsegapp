# TrendyWheels Architecture

One-page tour of the monorepo. Read this before adding a new module — most
"where does this go?" questions are answered here.

## Monorepo layout

```
apps/
  api/         Express + Prisma + BullMQ + Socket.IO  (port 4000)
  mobile/      Expo SDK 53 + React Native + Reanimated + Skia
  customer/    Next.js 14, customer-facing web        (port 3001)
  admin/       Next.js 14, staff/admin dashboard      (port 3002)
  support/     Next.js 14, support agents             (port 3003)
  inventory/   Next.js 14, fleet ops                  (port 3004)
packages/
  api-client/  Typed HTTP client used by every frontend
  db/          Prisma schema + generated client
  i18n/        EN/AR translation tables
  types/       Shared domain TypeScript types
  ui-brand/    Web-only React components (Tailwind)
  ui-tokens/   Cross-platform design tokens (mobile + web)
  validators/  Zod schemas (request + opt-in response)
  eslint-config/ tsconfig/  Shared dev config
```

## Hosting

Everything runs on one VPS managed by `pm2`:

| Process                | Port | Notes                                                   |
| ---------------------- | ---- | ------------------------------------------------------- |
| trendywheels-api       | 4000 | Express + Prisma + BullMQ producer + Socket.IO          |
| trendywheels-workers   | —    | BullMQ consumers (notifications, reminders, lead sweep) |
| trendywheels-customer  | 3001 | Next.js (`next start`)                                  |
| trendywheels-admin     | 3002 | Next.js                                                 |
| trendywheels-support   | 3003 | Next.js                                                 |
| trendywheels-inventory | 3004 | Next.js                                                 |

Postgres + Redis + MinIO run as separate services on the same box.

## API module shape

```
apps/api/src/modules/<thing>/
  routes.ts       Express router — input parsing + auth
  controller.ts   request → service → response (thin)
  service.ts      pure data access (no Express types)
```

Not every module has a `service.ts` yet — the ones that do (bookings,
repairs, sales, users, crm, auth) hold the meaty multi-step business
logic. New code should follow the service-layer pattern; pure CRUD routes
can stay in the controller until they grow.

## Cross-cutting helpers (apps/api/src/utils)

- `auth-roles.ts` — `isAdmin(user)`, `ADMIN_FILTER`, `requireOwner(req, id)`,
  `scopeListToOwner(req, where)`. **One place** for access-control predicates.
- `notify.ts` — `notifyUser`, `notifyAdmins`, `emitDomainEvent`. Every
  notification goes through here.
- `errors.ts` — `AppError.badRequest()`, `.forbidden()`, `.notFound()`, etc.
- `response.ts` — `ok<T>(data, page?, limit?, total?)` envelope helper.
- `error-sink.ts` — server-side error log table writer.

## Config

- `apps/api/src/config/limits.ts` — `PAGINATION = { default: 20, max: 100, large: 500 }`.
- `apps/api/src/config/env.ts` — typed env-var loader (every required
  variable is asserted at boot).

## Realtime

- Socket.IO `/admin` namespace — admin/sales/support dashboards
  subscribe to `customer.*` events (booking.created, repair.updated,
  customer.signup, …) so React Query caches invalidate without polling.
- `apps/api/src/modules/realtime/customer-events.ts` is the emitter.
  Routes use `emitDomainEvent` from `utils/notify.ts` (which wraps it with
  the standard envelope).

## Queues (BullMQ on Redis)

- `notifications` — fan-out to in-app rows + FCM push.
- `emails` — transactional email (Mailgun TBD).
- `reminders` — 24h booking reminders.
- `otp-cleanup` — recurring sweep, 15 min.
- `booking-reminder-scheduler` — recurring, enqueues reminders.
- `alert-evaluator` — fleet utilisation alerts, 15 min recurring.
- `lead-sweeper` — CRM SLA breach + rotation, 5 min recurring.

## Auth

- Customers: phone + OTP via Firebase phone-auth (mobile) or OTP-by-SMS
  in non-Firebase flows.
- Staff/admin: email + password + TOTP MFA.
- All clients get an access JWT (15 min) + refresh JWT (30 days).
- `ApiClient` handles the 401-retry path automatically; consumer apps
  only provide token storage callbacks.

## Domain conventions

- **Auth**: every controller assumes `req.user` populated by
  `authenticate` middleware. Use `requireOwner` / `scopeListToOwner` for
  per-customer scoping, `isAdmin(user)` for admin-only branches.
- **Status**: kebab-case in the wire format (`in-progress`), snake_case
  in DB (`in_progress`). Repair module's `toDbStatus` / `fromDbStatus`
  is the reference.
- **Pagination**: clamp caller-supplied limit with `Math.min(PAGINATION.max,
…)`. Default page size is `PAGINATION.default` (20).
- **Notifications**: use `notifyUser` / `notifyAdmins`. Never call
  `notificationsQueue.add` directly.
- **Realtime events**: use `emitDomainEvent`. Don't build the `{ id,
userId, at }` envelope by hand.

## Where to put a new thing

| If you're adding…                     | Put it in…                                                 |
| ------------------------------------- | ---------------------------------------------------------- |
| A new API endpoint                    | `apps/api/src/modules/<thing>/routes.ts`                   |
| A Prisma query that takes >5 lines    | `apps/api/src/modules/<thing>/service.ts`                  |
| A request body Zod schema             | `packages/validators/src/index.ts`                         |
| A new domain type used by both ends   | `packages/types/src/index.ts`                              |
| A typed HTTP method                   | `packages/api-client/src/index.ts`                         |
| A color, spacing, motion value        | `packages/ui-tokens/src/index.ts`                          |
| A status-pill style (mobile + web)    | `packages/ui-tokens/src/statuses.ts`                       |
| A web React component used by ≥2 apps | `packages/ui-brand/src/...`                                |
| An access-control predicate           | `apps/api/src/utils/auth-roles.ts`                         |
| A notification payload                | call `notifyUser` / `notifyAdmins`                         |
| A scheduled job                       | `apps/api/src/workers/...` + register in `queues/index.ts` |

## Things that are deliberately one-off

- `apps/api/src/modules/crm/routes.ts` keeps its own `createLeadSchema` /
  `updateLeadSchema` / `activitySchema` because they intentionally differ
  from the public shapes in `@trendywheels/validators` (narrower fields,
  computed source enum). Don't "centralise" them.
- Mobile React Native StyleSheet ≠ web inline `style={{}}`. Cross-platform
  reality, not duplication.
- The "amber" tone in `BOOKING_STATUS_CLASS` maps to `bg-yellow-100` (not
  `bg-amber-100`). Tailwind's amber is more orange than the design tokens
  want — we ship yellow everywhere.
