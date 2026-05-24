# @trendywheels/api-client

Typed HTTP client every TrendyWheels frontend uses to talk to the API. One
class, one set of methods, one place to add a new endpoint.

## What it owns

- `class ApiClient` — exposes ~60 typed methods (`getVehicles`,
  `crmListLeads`, `adminMetrics`, etc.) and a generic `request<T>()` escape
  hatch for one-off endpoints.
- The 401-retry / refresh-token flow. Each consumer app passes
  `getAccessToken`, `getRefreshToken`, `onTokenRefresh` callbacks; the client
  owns the actual retry URL + retry policy.
- The public `baseUrl` and `getAccessToken()` accessors used by code paths
  that need to hand the URL to native SDKs (image picker, share sheets).
- `ApiClientError` — typed error with `statusCode` + `code` for callers that
  want to branch on the failure mode.

## When to use

- Always: any frontend → backend HTTP call goes through here. Raw `fetch`
  calls are a regression — they bypass the auth-refresh flow and the typed
  response contract.

## When NOT to use

- Don't add admin-only fields or methods that mix unrelated domains. Each
  method should map 1:1 with a backend route group.
- Don't put Express types here. This package builds for browsers and React
  Native — Node-only imports break Metro.

## Opt-in runtime validation

`request()` accepts `{ parse?: ZodTypeAny }`. When passed, the response is
`safeParse`'d at the network boundary. Use this when a screen's local
TypeScript type drifts from the server contract and you'd rather know
immediately than crash inside a render.

```ts
const res = await api.request<{ data: AdminMetrics }>("GET", "/api/admin/metrics", {
  parse: adminMetricsResponseSchema,
});
```
