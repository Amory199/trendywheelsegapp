# @trendywheels/db

Owns the **Prisma schema** and the generated `PrismaClient`. The single
authoritative database surface — every app imports `prisma` from here (or
via the API's `apps/api/src/config/database.ts` wrapper).

## What it owns

- `prisma/schema.prisma` — every table, every enum, every relation.
- Migrations (`prisma/migrations/`).
- The generated client (output via `pnpm db:generate`).

## When to touch it

- Adding a column, table, or index.
- Renaming an enum value (be careful — code-wide rename required).
- Changing a relation.

## When NOT to touch it

- For ad-hoc queries — write those in the API service layer using the
  generated client.
- For "I want to log this" — that's an audit-log entry or a metric, not a
  schema change.

## Workflow

```
pnpm db:generate    # regen the Prisma client after schema edit
pnpm db:migrate     # create + apply a migration (asks for a name)
pnpm db:studio      # GUI on localhost:5555
```

Production migrations run via the API container start hook; never run
`migrate dev` against prod.
