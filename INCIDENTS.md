# INCIDENTS.md

Institutional memory for production bugs and the canonical fixes.

**Before fixing a non-trivial bug:** grep this file for the symptom or the touched file path. If something matches, reuse the established pattern. **Don't fork it.**

**After fixing a non-trivial bug:** append a new `INC-NNN` entry below. Triggers: anything that took >10 min to diagnose, touched >2 files, or surfaced as a user-facing / Sentry / Play / Firebase error.

---

## Entry template — copy-paste this when adding a new INC

```markdown
### INC-NNN — <one-line symptom> (YYYY-MM-DD)

**Status:** Fixed | Workaround | Open | Won't fix
**Severity:** P0 | P1 | P2 | P3
**Touched:** `path/to/file.ts`, `path/to/other.ts`
**Fixed in:** commit `abcd1234` (or "open")
**Related:** INC-MMM

**Symptom**
One paragraph — what the user / Sentry / smoke test saw.

**Root cause**
Why it broke. The technical why, not the what.

**Fix**
What we changed and why that specific change. Name the helper / file / pattern that holds the fix now.

**Pattern to follow next time**
The reusable rule. If a similar bug appears, do it this way — don't invent a parallel solution.
```

---

## Index

| INC | Date       | Symptom                                                              | Status     | Sev |
| --- | ---------- | -------------------------------------------------------------------- | ---------- | --- |
| 001 | 2026-05-21 | EAS project re-init silently replaced the Android signing keystore   | Fixed      | P0  |
| 002 | 2026-05-21 | AU-11 lockfile bumped but four app `package.json` files were not     | Fixed      | P1  |
| 003 | 2026-05-21 | React 19 removed global JSX namespace — 102 .tsx files broke         | Fixed      | P1  |
| 004 | 2026-05-23 | Web login forms prefilled non-existent users (401 on first submit)   | Fixed      | P2  |
| 005 | 2026-05-24 | `VehicleCategory` enum casing mismatch — validator (kebab) vs Prisma | Workaround | P2  |
| 006 | 2026-05-24 | Customer rent page filter chips used car-template enums (sedan/van)  | Fixed      | P2  |
| 007 | 2026-05-24 | Smoke-test 4xx assertions polluted Sentry every run                  | Fixed      | P3  |
| 008 | 2026-05-24 | Play Console rejected AAB — upload-key fingerprint mismatch          | Fixed      | P0  |
| 009 | 2026-05-24 | `/api/health` returns 401 for unauthenticated probes                 | Open       | P3  |
| 010 | 2026-05-24 | Customer web has no phone+OTP login (staff-only portal)              | Open       | P2  |
| 011 | 2026-05-24 | 4 mobile screens use `as unknown as <Type>` instead of runtime parse | Open       | P3  |

---

## Entries

### INC-001 — EAS project re-init silently replaced the Android signing keystore (2026-05-21)

**Status:** Fixed
**Severity:** P0
**Touched:** `apps/mobile/app.config.js`, `apps/mobile/eas.json`, `apps/mobile/credentials.json` (gitignored), `apps/mobile/credentials/keystore.jks` (gitignored)
**Fixed in:** commit `0037dce` re-init + the keystore-recovery commit (see this file's footer)
**Related:** INC-008

**Symptom**
After commit `24530e3 chore(mobile): re-init EAS project under amrco_19`, every Android AAB produced by EAS Build was signed with a brand-new keystore (`SHA1: CC:13:8C:DC:B1:52:48:16:EC:84:7E:C5:C9:80:A1:D0:08:88:16:CB`). Google Play rejected uploads with "your App Bundle is signed with the wrong key — expected `SHA1: 21:3C:79:5B:DD:7E:CF:26:24:28:C7:98:85:A5:20:ED:AE:54:AF:DE`". Firebase phone auth also broke on the new builds for the same reason.

**Root cause**
The `asasasasas` Expo account hit its free-tier monthly build cap on 2026-05-20. The recovery action was to re-initialize the EAS project under a new account (`amrco_19`, project ID `641975a5-...`). **EAS generates a fresh Android keystore on first build for any new project** — there is no UI step that warns about it, and the previous project's keystore is locked inside the old account. Both Play and Firebase had the _original_ (asasasasas) keystore registered, so every subsequent upload failed signature verification.

**Fix**
The original keystore lives forever in the original Expo project's credentials. To recover:

1. Log into the original account at https://expo.dev/.
2. Project → Credentials → Android → **Download keystore** (gives a zip with the `.jks` + a credentials `.md` containing the keystore password, key alias, key password).
3. Drop the zip on the build box.
4. Wire it as **local credentials** so EAS Build uses your `.jks` instead of its account-default one:
   - Place `.jks` at `apps/mobile/credentials/keystore.jks`
   - Write `apps/mobile/credentials.json` with the 3 passwords (see existing file — gitignored).
   - Add `"credentialsSource": "local"` to the `production` build profile in `apps/mobile/eas.json`.
   - Add `credentials/` and `credentials.json` to `apps/mobile/.gitignore` (already done).
5. Rebuild — EAS log will say `✔ Using local Android credentials (credentials.json)` instead of `Using Keystore from configuration: Build Credentials <id>`.

**Pattern to follow next time**

- **Never** re-init an EAS project for a published app. **Transfer** the project to the new account instead (Project → Settings → Transfer Ownership). Transfer carries the keystore over.
- If a re-init has already happened: the original keystore is recoverable from the old account's expo.dev → Credentials page **as long as the old account still exists** (Expo retains keystores per account, not per project). Do this _before_ deleting the old account or losing access.
- Keep `/opt/pl/@<account>__<project>-keystore-backup.zip` as your single source of truth; back it up off the VPS (Drive, password manager).
- Production builds stay on `credentialsSource: "local"` for as long as we use a recovered keystore — the EAS-managed default for this account is wrong.

**2026-05-26 update — Firebase still failed for Play installs after the upload-key recovery**

vcode 101 installed from Play Store still threw `[auth/app-not-authorized] ... A play_integrity_token was passed, but no matching SHA-256 was registered in the Firebase console` on the first OTP attempt.

Reason: Play Store re-signs every uploaded AAB with the **Play App Signing key** (Google-managed, different from the upload keystore). `@react-native-firebase/auth` v24 uses Play Integrity, which keys the token against that Play App Signing key's SHA-256. The recovery above only restored the **upload key**; Firebase still had no fingerprint matching the Play-signed binary that end-users actually install.

Fix: register **four** fingerprints in Firebase Console (Project `trendywheels-a7635` → Project settings → Android app `com.trendywheels.app` → Add fingerprint):

- Play App Signing **SHA-1** (Play Console → Setup → App integrity → "App signing key certificate")
- Play App Signing **SHA-256** ← the one the error names
- Upload key **SHA-1** (same Play page → "Upload key certificate")
- Upload key **SHA-256**

No code change, no rebuild — Firebase propagates within ~5 min and the next OTP attempt succeeds.

Pattern: whenever any signing key changes (upload **or** app signing), the Firebase Console fingerprint list is the first place to check, **not** after a build fails. Both upload and Play App Signing keys belong in there; treating them as one is the trap.

---

### INC-002 — AU-11 lockfile bumped but four app `package.json` files were not (2026-05-21)

**Status:** Fixed
**Severity:** P1
**Touched:** `apps/admin/package.json`, `apps/customer/package.json`, `apps/support/package.json`, `apps/inventory/package.json`
**Fixed in:** commit `dec15d9`
**Related:** INC-003

**Symptom**
EAS Build failed at `INSTALL_DEPENDENCIES` with `ERR_PNPM_OUTDATED_LOCKFILE` complaining that `pnpm-lock.yaml` did not match `apps/admin/package.json`. The lockfile specified `next: 15.5.18, react: ^19.0.0`; the package.json said `next: 14.2.15, react: ^18.3.0`. Local `pnpm install` (without `--frozen-lockfile`) silently regenerated the lockfile to downgrade, hiding the problem. CI / EAS always uses `--frozen-lockfile`, so it always failed.

**Root cause**
The AU-11 commit (`fd9f044 chore(deps): bump Next 14 to 15.5.18 and React 18 to 19 across web apps`) claimed in its message to have bumped all four web apps, but `git show --name-only fd9f044` reveals it actually only touched `packages/ui-brand/package.json` + `pnpm-lock.yaml`. The four `apps/*/package.json` files were never staged.

**Fix**
Edit every `apps/*/package.json` whose `dependencies`/`devDependencies` mention the bumped libraries. For AU-11 that meant:

- `next: 14.2.15 → 15.5.18`
- `react: ^18.3.0 → ^19.0.0`
- `react-dom: ^18.3.0 → ^19.0.0`
- `@types/react: ^18.3.0 → ^19.0.0`
- `@types/react-dom: ^18.3.0 → ^19.0.0`
- `@next/eslint-plugin-next: 14.2.15 → 15.5.18`

Then `pnpm install --frozen-lockfile` to confirm the lockfile matches.

**Pattern to follow next time**

- After any monorepo dependency bump, **always** run `pnpm install --frozen-lockfile` locally before committing. It's the same check CI runs; it surfaces the drift in seconds.
- Don't trust commit messages — verify with `git show --name-only <sha>` before assuming a multi-file change was complete.
- If you're bumping a dep across multiple `apps/*`, do it via `pnpm -r --filter "./apps/*" update <pkg>@<version>` (or edit all package.json files explicitly), then `pnpm install` — never edit only `pnpm-lock.yaml` by hand.

---

### INC-003 — React 19 removed global JSX namespace — 102 .tsx files broke (2026-05-21)

**Status:** Fixed
**Severity:** P1
**Touched:** 102 `.tsx` files across `apps/customer`, `apps/admin`, `apps/support`, `apps/inventory`
**Fixed in:** part of commit `fd9f044`
**Related:** INC-002

**Symptom**
After bumping `@types/react` from 18 to 19, `tsc --noEmit` failed in every `.tsx` file that annotated a return type as `JSX.Element` — `Cannot find namespace 'JSX'`.

**Root cause**
React 19's type package dropped the global `JSX` namespace. You now have to import the type explicitly: `import type { JSX } from "react"`.

**Fix**
Inserted `import type { JSX } from "react";` at the alphabetically-correct position within the external-import group of every affected file. Used a Python script (not `sed`/`awk`) because eslint-plugin-import enforces import order — placing the import at the top of the file violates the rule.

**Pattern to follow next time**

- When upgrading React (or any major type-only dep), grep for usages of any global namespace it removed: `grep -rn "JSX.Element" apps/*/src --include="*.tsx" | wc -l` tells you the blast radius before you start.
- Use a Python (or comparable) script that respects import-group ordering. A naive top-of-file insert will pass tsc but fail eslint.

---

### INC-004 — Web login forms prefilled non-existent users (2026-05-23)

**Status:** Fixed
**Severity:** P2
**Touched:** `apps/customer/src/app/login/page.tsx`, `apps/support/src/app/login/page.tsx`, `apps/inventory/src/app/login/page.tsx`
**Fixed in:** commit `f8a44f1`
**Related:** —

**Symptom**
Logging into the customer/support/inventory web apps with the prefilled email always returned 401. Users assumed the password was wrong. Devtools showed `POST /api/auth/login → 401` with no other clue.

**Root cause**
The login forms prefilled `mohamed@example.com`, `support@trendywheelseg.com`, `inventory@trendywheelseg.com` — but the seed data (`apps/api/scripts/wipe-demo-data.ts`) had wiped or never created those users. The three-role model means there's no dedicated `support@` or `inventory@` user at all — sales agents (`amira@`, `youssef@`, `rana@`) handle those queues.

**Fix**
Prefill with users that actually exist per the current role model:

- Customer login → `admin@trendywheelseg.com` (the only customer-portal-capable account, since customers themselves sign up via phone+OTP on mobile — see INC-010)
- Support login → `amira@trendywheelseg.com` (sales agent who handles support)
- Inventory login → `amira@trendywheelseg.com` (sales agent who handles inventory)

**Pattern to follow next time**

- Prefill values in login forms are **part of the seed contract**. When changing seed data or wiping demo accounts, grep `useState(".*@trendywheelseg.com")` across all `apps/*/src/app/login/` files and update.
- Better: prefill should live in a single shared constant (e.g. `packages/ui-tokens/src/demo-credentials.ts`) — currently it's duplicated 4 ways. Not lifted yet because it's only one line per app, but flag for AV cleanup if it gets touched again.

---

### INC-005 — `VehicleCategory` enum casing mismatch — validator (kebab) vs Prisma (snake) (2026-05-24)

**Status:** Workaround in place — pattern duplicated across two controllers, candidate for extraction
**Severity:** P2
**Touched:** `apps/api/src/modules/sales/controller.ts`, `apps/api/src/modules/rental-listings/controller.ts`, `packages/validators/src/index.ts`, `packages/db/prisma/schema.prisma`
**Fixed in:** sales controller — pre-AU; rental-listings controller — commit `cc7e68c`
**Related:** INC-006

**Symptom**
When implementing the rental-listings module (AV-1), the validator accepted `category: "golf-cart"` (kebab-case to match the public sales API) but Prisma's `RentalListingUncheckedCreateInput` rejected it with `Type '"golf-cart"' is not assignable to type 'VehicleCategory | undefined'`.

**Root cause**
Prisma's `VehicleCategory` enum uses snake_case identifiers (`golf_cart`, `hover_board`, `jet_ski`, ...) with `@map("golf-cart")` for the SQL value. TypeScript surfaces the snake_case form. The frontend / public API surfaces the kebab-case form. The two never meet without an explicit conversion.

**Fix**
Each controller that accepts a category from the wire maintains its own `CATEGORY_MAP` constant for the conversion:

```ts
// apps/api/src/modules/rental-listings/controller.ts
const CATEGORY_TO_DB: Record<string, "golf_cart" | "hover_board" | ...> = {
  "golf-cart": "golf_cart",
  "hover-board": "hover_board",
  scooter: "scooter",
  ...
};

// In the handler:
const created = await createRentalListing(req.user!.userId, {
  ...input,
  category: CATEGORY_TO_DB[input.category],
});
```

**Pattern to follow next time**

- **Today:** every new controller that takes a `category` from `req.body` defines its own `CATEGORY_TO_DB` map. That's two copies as of this entry (`sales/controller.ts:16`, `rental-listings/controller.ts:13`).
- **Refactor candidate (not done yet):** lift the map + a `toDbCategory(input: string): DbCategory` helper into `packages/validators/src/vehicle-category.ts`. Apply the third caller would mean three duplicates — pull the trigger then.
- Inverse direction (DB → API response) is _not_ needed: Prisma serializes the @map'd value (`"golf-cart"`) automatically when you return the row.

---

### INC-006 — Customer rent page filter chips used car-template enums (2026-05-24)

**Status:** Fixed
**Severity:** P2
**Touched:** `apps/customer/src/app/rent/page.tsx`
**Fixed in:** commit `d710cc5`
**Related:** INC-005

**Symptom**
Sentry NODE-M: `Validation error: type — Invalid enum value. Expected '4-seater' | '6-seater' | 'LED', received 'sedan'` (also `'van'`). Customers tapping the "Sedan" or "Van" chip on `/rent` saw an empty list. Five events in three hours.

**Root cause**
The rent page declared `const TYPES = ["all", "sedan", "suv", "hatchback", "luxury", "van"]` — leftover from a generic car-rental template. The backend's `VehicleType` enum is `FOUR_SEATER | SIX_SEATER | LED` (seat-config, not body-style), and the filter was being sent as `?type=...`. Every tap on a non-existent enum value fired a 400.

**Fix**
The right filter dimension for golf carts is `VehicleCategory` (golf-cart, buggy, utv, scooter, scooter-sidecar, jet-ski, hover-board) — the same enum the home chips and `/sell/category/[key]` browse use. Replaced `TYPES` with `CATEGORIES = [{ id, label }, ...]` and switched the query param from `?type=` to `?category=`. The backend already supports `?category=...` (with kebab-to-snake conversion per INC-005).

**Pattern to follow next time**

- **Frontend filter values must come from the same enum the backend validator declares.** Never copy-paste filter arrays from a template.
- When adding a filter chip, the source of truth is `packages/validators/src/index.ts` — specifically `vehicleCategoryEnum`. Re-typing the values inline is how this bug got in originally.
- For new filters, prefer `CATEGORIES.map(c => <Chip>{c.label}</Chip>)` over a string array — the `id`/`label` split lets you keep enum-valid wire values while showing nice labels.

---

### INC-007 — Smoke-test 4xx assertions polluted Sentry every run (2026-05-24)

**Status:** Fixed
**Severity:** P3
**Touched:** `apps/api/src/middleware/error-handler.ts`, `apps/api/scripts/smoke-test.sh`
**Fixed in:** commit `d710cc5`
**Related:** —

**Symptom**
Sentry NODE-K: `Listing can only be deleted while submitted or withdrawn` warning fired by every smoke test run. Not a real bug — the test deliberately POST→PATCH→DELETE on a rental listing in `reviewing` status to assert the 403 guard works. But every run added noise that drowned real warnings.

**Root cause**
`apps/api/src/middleware/error-handler.ts` logs all 4xx `AppError`s to `writeError` (which fans out to Sentry + the admin error log). The smoke test runs against prod regularly. There was no way to distinguish smoke traffic from real client traffic.

**Fix**
Tag the smoke script with a custom User-Agent (`tw-smoke-test/1.0`) on every curl. In the error handler, an `isSmokeTest(req)` helper short-circuits `writeError` when the UA starts with `tw-smoke-test`. The HTTP response (the 4xx with body) still goes back to the smoke script so the assertion still works — only the persistence side is skipped.

```ts
// apps/api/src/middleware/error-handler.ts
function isSmokeTest(req: { headers?: Record<string, unknown> }): boolean {
  const ua = req.headers?.["user-agent"];
  return typeof ua === "string" && ua.startsWith("tw-smoke-test");
}
```

```bash
# apps/api/scripts/smoke-test.sh — every curl gets -A "$SMOKE_UA"
SMOKE_UA="tw-smoke-test/1.0"
curl -fsS -A "$SMOKE_UA" ...
```

**Pattern to follow next time**

- Any synthetic / test-harness traffic that hits prod must identify itself via UA. `tw-smoke-test/<version>` is the established convention.
- New paths in `error-handler.ts` that log to `writeError` should respect the `isSmokeTest(req)` guard (already handled for `ZodError` and `AppError` 4xx; revisit if a new error class is added).
- Don't add per-route "ignore this 403" allowlists — UA tagging is the general solution.

---

### INC-008 — Play Console rejected AAB — upload-key fingerprint mismatch (2026-05-24)

**Status:** Fixed
**Severity:** P0
**Touched:** `apps/mobile/eas.json`, `apps/mobile/.gitignore`, `apps/mobile/credentials.json` (gitignored), `apps/mobile/credentials/keystore.jks` (gitignored)
**Fixed in:** local-credentials commit (see git log for `credentialsSource: local` change)
**Related:** INC-001

**Symptom**
Uploading any AAB built after 2026-05-21 to Play Console internal track failed with: `Your Android App Bundle is signed with the wrong key. Expected SHA1: 21:3C:...:AF:DE, got SHA1: CC:13:...:16:CB`.

**Root cause**
Same root cause as INC-001. Recapped here because the _uploader-facing symptom_ surfaces in Play Console (not EAS), so an engineer hitting only the Play error is unlikely to grep "keystore" or "EAS re-init".

**Fix**
See INC-001 for the recovery procedure. Result: AAB build `a5a45e32-...` (versionCode 7), artifact `https://expo.dev/artifacts/eas/mskTx1mzTZZaq2Cc8Thho3.aab`, signed with the original `21:3C...` keystore. Play accepted it on first upload.

**Pattern to follow next time**

- If Play Console says "wrong key", the fix is **never** to generate a new keystore — that just moves the problem. Either (a) recover the original (INC-001), or (b) submit a Google Play upload-key reset request (`/opt/pl/upload_certificate.pem` is the prepared PEM for option b — keep it around in case the recovered keystore is ever lost again).
- The same fingerprint mismatch breaks Firebase phone auth too (Firebase Console → Project settings → Your apps → Android → SHA fingerprints must match). Recovering the original keystore (option a) fixes both at once; resetting (option b) requires also adding the new SHA to Firebase.

---

### INC-009 — `/api/health` returns 401 for unauthenticated probes (2026-05-24)

**Status:** Open
**Severity:** P3
**Touched:** unknown — likely `apps/api/src/app.ts` route mounting
**Fixed in:** open

**Symptom**
`curl -sS http://localhost:4000/api/health` returns 401 instead of a 200 health-check body. External uptime monitors can't probe it without an auth header. The smoke test works around this by hitting `/healthz` (root, not under `/api`) instead.

**Root cause** (suspected, not confirmed)
The `/api/*` mount is behind `authenticate` middleware globally and `/api/health` wasn't whitelisted. The root-level `/healthz` route works because it's mounted before the auth middleware.

**Fix** (planned)
Either (a) mount `/api/health` before the auth middleware, or (b) just remove it and document `/healthz` as the canonical health URL. Option b is less work and matches what smoke + pm2 already use.

**Pattern to follow next time**

- Public probes (health checks, public webhooks, status pages) must be mounted **before** any auth middleware. There's no good reason for a health endpoint to be authed.

---

### INC-010 — Customer web has no phone+OTP login (staff-only portal) (2026-05-24)

**Status:** Open — deferred
**Severity:** P2
**Touched:** `apps/customer/src/app/login/page.tsx`, would need new `apps/customer/src/app/auth/phone/...` flow
**Fixed in:** open

**Symptom**
Real customers sign up via phone+OTP on mobile (Firebase phone auth) and never set a web password. The customer web login form requires email+password, so real customers can't log into it. Currently the customer web is effectively a staff-only portal that hosts admin@-style logins.

**Root cause**
Architectural — phone+OTP auth was built mobile-first via Firebase Phone Auth; the web client never got an equivalent flow.

**Fix** (planned)
Build a `/auth/phone` flow on customer web using Firebase Phone Auth's web SDK (the same Firebase project the mobile app uses — see Firebase Console screenshot in `/opt/pl/`). Form: phone → SMS code → POST `/api/auth/verify-otp` to mint the same JWT pair the mobile app gets. Keep the existing email+password form as the staff entry point.

**Pattern to follow next time**

- New auth surfaces should serve **both** mobile and web from day one. If you only build it on one, document the gap explicitly (this entry).

---

### INC-011 — 4 mobile screens use `as unknown as <Type>` instead of runtime parse (2026-05-24)

**Status:** Open
**Severity:** P3
**Touched:** `apps/mobile/app/crm/leads/[id].tsx`, `apps/mobile/app/support/tickets/[id].tsx`, plus two more (grep `as unknown as` for the exact list)
**Fixed in:** open

**Symptom**
Four mobile screens still cast API responses with `as unknown as Lead` / `as unknown as Ticket` etc., bypassing runtime validation. If the backend ever returns a malformed payload, the screen will throw deep in render with `Cannot read properties of undefined` — no helpful error.

**Root cause**
AU-9 introduced the opt-in `parse: ZodTypeAny` option on `ApiClient.request`, but only one screen (`apps/mobile/app/admin/dashboard.tsx`) was migrated. The remaining four still cast.

**Fix** (planned)
For each screen: (1) define or import the appropriate response schema from `packages/validators`; (2) pass `parse: schema` to the `api.request(...)` call (or to the typed method if it exposes the option); (3) delete the cast.

**Pattern to follow next time**

- New screens that hit the API **must not** use `as unknown as <Type>`. Use `parse:` with a schema from `@trendywheels/validators`. The runtime cost is ~10% of the request; the benefit is typed errors instead of `Cannot read property of undefined`.
- See `apps/mobile/app/admin/dashboard.tsx` for the canonical example.

---

## How to add a new entry

1. Pick the next `INC-NNN` number (zero-padded, monotonic).
2. Copy the **Entry template** at the top of this file into the **Entries** section in date order.
3. Add a one-line row to the **Index** table.
4. Commit alongside the fix: `git add INCIDENTS.md <fix files> && git commit -m "fix(<scope>): <subject> (INC-NNN)"`.
5. Cross-link from related INCs via `**Related:** INC-MMM`.

**When to skip:** typo fixes, single-line CSS tweaks, dependency patch-bumps with no behaviour change, anything that took <10 min to diagnose and touched ≤2 files. Use judgement — the log is useful only if entries are signal, not noise.
