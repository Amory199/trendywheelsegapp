# @trendywheels/validators

Centralised **Zod schemas** for request bodies, query params, and (opt-in)
response shapes. Single source of truth so frontend and backend agree on the
wire contract.

## What it owns

- Request schemas: `createBookingSchema`, `updateUserSchema`,
  `submitTransportSchema`, `promoCodeSchema`, … one per write-side endpoint.
- Response schemas (opt-in): `adminMetricsResponseSchema`,
  `listEnvelopeSchema`, `itemEnvelopeSchema`. Passed to
  `api.request(..., { parse })` for runtime shape validation.
- Reusable enums and field constraints: `leadSourceEnum`,
  `leadStatusEnum`, `leadActivityTypeEnum`, `idParamSchema`,
  `paginationSchema`.

## When to use

- Backend route validation — `validate({ body: createBookingSchema })`.
- Frontend form validation — bind a schema to react-hook-form or
  formik via the standard zod resolver.
- API client opt-in response parsing.

## When NOT to use

- Don't keep route-local schemas as `const fooSchema = z.object(…)` at the
  top of a controller. Move it here. ESLint guards against new ones via the
  no-inline-zod rule (TODO).
- Don't import this package into the React Native runtime path unless you
  need it — zod is ~12KB minified. (Mobile imports are fine for forms and
  parse-checks, just not for hot startup paths.)

## Rule of thumb

If you typed `z.object({` outside this package and the schema has a name,
it probably belongs here.
