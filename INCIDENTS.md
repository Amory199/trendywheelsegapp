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

| INC | Date       | Symptom                                                                                                                                                                                                                              | Status              | Sev |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | --- |
| 001 | 2026-05-21 | EAS project re-init silently replaced the Android signing keystore                                                                                                                                                                   | Fixed               | P0  |
| 002 | 2026-05-21 | AU-11 lockfile bumped but four app `package.json` files were not                                                                                                                                                                     | Fixed               | P1  |
| 003 | 2026-05-21 | React 19 removed global JSX namespace — 102 .tsx files broke                                                                                                                                                                         | Fixed               | P1  |
| 004 | 2026-05-23 | Web login forms prefilled non-existent users (401 on first submit)                                                                                                                                                                   | Fixed               | P2  |
| 005 | 2026-05-24 | `VehicleCategory` enum casing mismatch — validator (kebab) vs Prisma                                                                                                                                                                 | Workaround          | P2  |
| 006 | 2026-05-24 | Customer rent page filter chips used car-template enums (sedan/van)                                                                                                                                                                  | Fixed               | P2  |
| 007 | 2026-05-24 | Smoke-test 4xx assertions polluted Sentry every run                                                                                                                                                                                  | Fixed               | P3  |
| 008 | 2026-05-24 | Play Console rejected AAB — upload-key fingerprint mismatch                                                                                                                                                                          | Fixed               | P0  |
| 009 | 2026-05-24 | `/api/health` returns 401 for unauthenticated probes                                                                                                                                                                                 | Fixed               | P3  |
| 010 | 2026-05-24 | Customer web has no phone+OTP login (staff-only portal)                                                                                                                                                                              | Open                | P2  |
| 011 | 2026-05-24 | 4 mobile screens use `as unknown as <Type>` instead of runtime parse                                                                                                                                                                 | Open                | P3  |
| 012 | 2026-05-28 | Refresh-token lookup scans every active token (CPU DoS at scale)                                                                                                                                                                     | Open                | P0  |
| 013 | 2026-05-28 | Access-token revocation missing (stolen token usable up to 24h)                                                                                                                                                                      | Open                | P1  |
| 014 | 2026-05-28 | Cascade delete on `User → Booking/Notification` destroys records                                                                                                                                                                     | Open                | P1  |
| 015 | 2026-05-28 | No soft-delete on `User` (GDPR / Play Store deletion)                                                                                                                                                                                | Open                | P1  |
| 016 | 2026-05-28 | Composite indexes missing on hot query paths                                                                                                                                                                                         | Open                | P1  |
| 017 | 2026-05-28 | BullMQ workers lack retry/concurrency/idempotency/DLQ                                                                                                                                                                                | Open                | P1  |
| 018 | 2026-05-28 | Mass-assignment in `sales`, `repairs`, `kb` controllers                                                                                                                                                                              | Open                | P1  |
| 019 | 2026-05-28 | Web tokens in localStorage (XSS escalation path)                                                                                                                                                                                     | Open                | P1  |
| 020 | 2026-05-28 | Prod infra SPOFs + no uptime monitor + no secret-rotation runbook                                                                                                                                                                    | Open                | P1  |
| 021 | 2026-05-28 | No certificate pinning on mobile API calls                                                                                                                                                                                           | Open                | P2  |
| 022 | 2026-06-08 | EAS iOS Distribution Cert can't be set up non-interactively (CLI bug)                                                                                                                                                                | Workaround          | P1  |
| 023 | 2026-06-08 | `GoogleService-Info.plist` gitignored → EAS Cloud build fails                                                                                                                                                                        | Fixed               | P0  |
| 024 | 2026-06-08 | RN 0.79.x bundled fmt 11.0.2 + Xcode 16.2+/26.x consteval error                                                                                                                                                                      | Workaround          | P0  |
| 025 | 2026-06-08 | Apple requires Xcode 26+ as of 2026-04-28 (policy, not technical)                                                                                                                                                                    | Fixed               | P0  |
| 026 | 2026-06-08 | Mobile app had zero Jest tests + pnpm node_modules pattern trap                                                                                                                                                                      | Fixed               | P1  |
| 027 | 2026-06-08 | Customer storage prefix allowlist missed sell/sales/rental flows                                                                                                                                                                     | Fixed               | P0  |
| 028 | 2026-06-08 | Customer mutations silently fail with no Alert on error                                                                                                                                                                              | Fixed               | P1  |
| 029 | 2026-06-08 | WhatsApp CRM button fire-and-forget mutation (Call awaits, WA didn't)                                                                                                                                                                | Fixed               | P2  |
| 030 | 2026-06-11 | Every OTA baked localhost:4000 as API URL — recurring network errors                                                                                                                                                                 | Fixed               | P0  |
| 031 | 2026-06-12 | Sale cars leaked into Rent; photos never rendered; catalog double-entry                                                                                                                                                              | Fixed               | P1  |
| 032 | 2026-06-15 | Mobile sessions not persisted across app relaunches                                                                                                                                                                                  | Fixed               | P1  |
| 033 | 2026-06-15 | `STAFF_TEST_PHONES` + Firebase fixed codes → no-password superadmin                                                                                                                                                                  | Fixed               | P0  |
| 034 | 2026-06-17 | Refresh-token rotation race → spurious logout on relaunch/OTA update                                                                                                                                                                 | Fixed               | P1  |
| 035 | 2026-06-18 | Support messages routed to one admin only — no team notify, no response                                                                                                                                                              | Fixed               | P1  |
| 036 | 2026-06-18 | Play block: expo-audio leaks FOREGROUND_SERVICE_MEDIA_PLAYBACK + RECORD_AUDIO                                                                                                                                                        | Fixed (needs build) | P1  |
| 037 | 2026-06-19 | Customer flows: sell-submit silent 400, rent card opened create, no rental/trade-in tracking, home/buy stuck light, rentals invisible in admin                                                                                       | Fixed               | P1  |
| 038 | 2026-06-19 | Roles: demote-to-customer left stray staffRole; support recorded but unrepliable in web admin; staff "Vehicles" opened admin console                                                                                                 | Fixed               | P1  |
| 039 | 2026-06-20 | Staff over-privileged: in-app `/admin/*` had no client guard + `/api/admin` allowed accountType=staff → any sales agent saw the admin console, metrics, revenue, all customers, cancelled listings                                   | Fixed               | P0  |
| 040 | 2026-06-20 | Notifications: blank Android small-icon rendered as a blue square; permission only requested after login; trade-in/transport/order/repair requests never alerted the team                                                            | Fixed               | P1  |
| 041 | 2026-06-20 | Language selector showed Arabic while the app rendered English; saving then flipped to Arabic — selector read stale server prefs, not the live locale store                                                                          | Fixed               | P2  |
| 042 | 2026-06-20 | Customer "sell" listings created `pending` were invisible in the admin Sales board (public `/api/sales` is active-only + the route has no auth so its staff branch was dead) — couldn't approve/reject                               | Fixed               | P1  |
| 043 | 2026-06-20 | Support was one rolling chat: a new request reopened the same conversation (showed old messages); SupportTicket had no messages and staff replies went to an unrelated conversation                                                  | Fixed               | P1  |
| 044 | 2026-06-20 | Dark mode home: 7 components hardcoded `INK=#02011F` text on the themed dark `#02011F` bg → invisible dark-on-dark text                                                                                                              | Fixed               | P2  |
| 045 | 2026-06-20 | App trapped on the boot loading screen (animated loading.webp — read as a "broken pixelated mp4") when online; only bootable offline. `hydrate()` awaited `/me` with no timeout, so a stalled socket never flipped `initialized`     | Fixed               | P0  |
| 046 | 2026-06-21 | "Session expired" right after login: `isSessionRevoked` compared whole-second `iat` against a millisecond `Date.now()` marker, so a token minted in the SAME second as a revocation (e.g. admin password reset) was falsely rejected | Fixed               | P1  |

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

**Status:** Fixed (2026-05-28)
**Severity:** P3
**Touched:** `apps/api/src/app.ts`
**Fixed in:** audit commit 2026-05-28

**Symptom**
`curl -sS http://localhost:4000/api/health` returned 401 instead of a 200 health-check body. External uptime monitors couldn't probe it without an auth header. The smoke test worked around it by hitting `/healthz` (root, not under `/api`) instead.

**Root cause**
Health routes were only mounted at `/`, not `/api`. External probes pointed at `/api/health` hit one of the auth-gated modules and got a 401.

**Fix**
Mounted `healthRoutes` at both `/` (existing) and `/api` (new) in `apps/api/src/app.ts`. Both `/healthz`, `/readyz`, `/api/healthz`, `/api/readyz` now resolve to the same handlers — external monitors can use either prefix without thinking about routing.

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

### INC-012 — Refresh-token lookup scans every active token (CPU DoS at scale) (2026-05-28)

**Status:** Open
**Severity:** P0
**Touched:** `apps/api/src/modules/auth/service.ts:314-334`
**Fixed in:** open (rate-limit mitigation landed inline in audit commit; root-cause fix tracked here)
**Related:** AUDIT_FINDINGS.md finding API #2

**Symptom**
`refreshAccessToken()` calls `prisma.refreshToken.findMany({ where: { revokedAt: null, expiresAt: { gt: new Date() } } })` — fetches every active refresh token across all users, then loops `bcrypt.compare()` against each. At 1M users × ~3 active tokens = 3M bcrypt compares per refresh request. CPU exhaustion vector + unsustainable latency.

**Root cause**
The refresh JWT payload doesn't carry the user id, so the controller has no way to scope the lookup. The design defers user resolution until after the token hash match.

**Fix** (planned)
Embed `userId` in the refresh token payload at issue time. In `refreshAccessToken`: decode the JWT first (signature-verify only, ignoring expiry checks at this stage), extract `userId`, then `findMany({ where: { userId, revokedAt: null, expiresAt: { gt } } })` — bounded to that user's ~3 tokens. Existing tokens remain valid; new ones get the embedded userId after deploy.

**Pattern to follow next time**

- Any token lookup should be O(tokens-per-user), never O(total-tokens). If the table can ever exceed 10k rows, the indexed/scoped query is mandatory.

---

### INC-013 — Access-token revocation missing (2026-05-28)

**Status:** Fixed
**Severity:** P1
**Touched:** `apps/api/src/middleware/auth.ts`, `apps/api/src/modules/auth/session-revocation.ts`, `apps/api/src/modules/users/controller.ts`
**Fixed in:** 2026-06-10 (role/status-change revocation)
**Related:** AUDIT_FINDINGS.md finding API #4

**Symptom**
On logout / role change, refresh tokens are revoked but access tokens stay valid until natural expiry (`JWT_ACCESS_EXPIRY=24h`). A just-demoted staff member kept staff access (and a stolen token kept working) for up to 24h. Reported live: "turned them back to a normal user but they were still a staff member — should be logged out automatically when their status changes."

**Root cause**
JWT validation is stateless by design — `authenticate` middleware checks signature and expiry without server-side lookup.

**Fix** (shipped)
Per-user revocation marker in Redis instead of the planned per-token bloom filter — simpler and sufficient for the privilege-change case. `revokeUserSessions(userId)` (new `auth/session-revocation.ts`) revokes refresh tokens AND writes `auth:revoke:<userId> = now` with TTL = max access-token lifetime (so the keyspace is bounded by active users and self-expires). `authenticate` rejects any token whose `iat` predates the marker. **Fail-open**: a Redis read error returns "not revoked" so a cache blip can't lock every request out. Called on admin role/status change (`users.update` — only when a privilege field actually changes) and on `disable`. Client side: `api-client` now invokes an `onAuthError` hook when a 401 can't be refreshed; the mobile app clears tokens and resets the auth store → user lands on login. Smoke covers it (section 12j).

**Pattern to follow next time**

- For long-lived bearer tokens, plan revocation from day one — even if the initial impl is just "set short expiry and ignore". Lengthening the expiry without a revocation channel is an invisible regression.
- A per-user "revoked-at" timestamp is a lighter revocation channel than per-token denylisting when you only need to invalidate on identity/role events (not arbitrary single-token kills). Keep the check fail-open so the auth hot path never hard-depends on the cache.

---

### INC-014 — Cascade delete on `User → Booking/Notification` destroys audit/revenue records (2026-05-28)

**Status:** Open
**Severity:** P1
**Touched:** `packages/db/prisma/schema.prisma` — `Notification` (`onDelete: Cascade`), `Booking` (implicit cascade)
**Fixed in:** open
**Related:** AUDIT_FINDINGS.md finding Infra #2,#11

**Symptom**
Deleting a `User` row also wipes their `Booking` and `Notification` rows. Bookings carry revenue and tax history we are legally required to retain. Notifications are minor but still wanted for support audit trails.

**Root cause**
Schema convenience choice when `User` was first scaffolded; the implication for financial records wasn't considered.

**Fix** (planned)

- `Booking.userId` → make nullable; relation `onDelete: SetNull`; anonymize PII at delete time via a deletion worker.
- `Notification.userId` → same pattern, or alternatively keep cascade but only after we have a soft-delete (see INC-015), which removes the need to ever hard-delete a User.
- Migration must backfill cleanly — `userId` already non-null for every existing row, so the column becomes nullable without data loss.

**Pattern to follow next time**

- For every `onDelete: Cascade` on `User`: ask "is this row a financial / regulatory / audit artefact?" If yes → `SetNull` + anonymize. The default should be `SetNull`, not `Cascade`.

---

### INC-015 — No soft-delete on `User` (GDPR / Play Store deletion-request) (2026-05-28)

**Status:** Open
**Severity:** P1
**Touched:** `packages/db/prisma/schema.prisma`, every Prisma `User` query in `apps/api/src/modules/**`
**Fixed in:** open
**Related:** AUDIT_FINDINGS.md finding Infra #14, INC-014

**Symptom**
The `DeletionRequest` model exists for GDPR / Play Store user-data-deletion requests, but there's no `deletedAt` column on `User`. The only way to honor a request is hard delete → cascade chaos (INC-014).

**Root cause**
Soft-delete was deferred until a deletion request actually came in. Now it's the precondition for fixing INC-014 properly.

**Fix** (planned)
Add `deletedAt DateTime?` to `User`. Add a Prisma middleware (or refactor to explicit `where: { deletedAt: null }` everywhere — preferred for explicitness). Deletion worker sets `deletedAt = now()` + scrubs PII (`email = null`, `phone = null`, `name = "[deleted user]"`). Bookings/notifications via INC-014 already point at the nulled `userId`.

**Pattern to follow next time**

- Any model representing a long-lived business entity (User, Vehicle, Listing, Order) defaults to soft-delete. Hard-delete only for ephemeral rows (OTP codes, expired tokens, idempotency keys).

---

### INC-016 — Missing composite indexes on hot query paths (2026-05-28)

**Status:** Open
**Severity:** P1
**Touched:** `packages/db/prisma/schema.prisma` — `User`, `RefreshToken`, `Booking`, `SalesListing`, `RepairRequest`, `Notification`, `RentalListing`, `Vehicle`
**Fixed in:** open
**Related:** AUDIT_FINDINGS.md finding Infra #1,#2,#3,#4,#5,#6,#7,#19,#20

**Symptom**
Multiple hot endpoints filter by compound conditions (e.g., `WHERE userId = ? AND status = ?`) without composite indexes. Each query uses one single-column index then filters in memory — fine at 1k rows, painful at 100k+, lethal at 1M+.

**Root cause**
Indexes added one-at-a-time as endpoints were built; nobody did a pass over the schema after the rental-listings module landed.

**Fix** (planned)
Single migration adding ~8 composite indexes:

- `User`: explicit `@@index([email])`, `@@index([phone])` (the implicit @unique indexes are fine but explicit is clearer for partials later)
- `RefreshToken`: `@@index([userId, revokedAt, expiresAt])` (post-INC-012 this is the primary lookup)
- `Booking`: `@@index([userId, status, startDate])`
- `SalesListing`: `@@index([userId, status])`, `@@index([status, createdAt])`
- `RepairRequest`: `@@index([assignedMechanicId])`
- `Notification`: `@@index([userId, createdAt])`
- `Vehicle`: `@@index([category])`

Migration is purely additive — runs concurrently in Postgres if applied with `CREATE INDEX CONCURRENTLY`.

**Pattern to follow next time**

- Every Prisma `where:` with two or more filter columns → composite `@@index`. SCALE checklist now enforces this at PR time.

---

### INC-017 — BullMQ workers lack retry policy, concurrency cap, idempotency, DLQ (2026-05-28)

**Status:** Open
**Severity:** P1
**Touched:** `apps/api/src/workers/index.ts` (all `new Worker()` instantiations), `apps/api/src/queues/index.ts`
**Fixed in:** open
**Related:** AUDIT_FINDINGS.md finding API #8, Infra #18,#19,#20,#21

**Symptom**
Workers fail silently under transient Redis/Prisma issues, replay create-row jobs to produce duplicates, run unbounded concurrent jobs (memory risk), and drop failed jobs after 50 retentions (no DLQ for manual inspection).

**Root cause**
Default BullMQ options were never overridden. Each shortcoming compounds: no retry means failures aren't caught, no concurrency cap means failures cascade, no idempotency means retries duplicate state, no DLQ means root causes are lost.

**Fix** (planned)

- Add `defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 2000 } }` to each `Worker`.
- Set `concurrency: 10` (notifications), `5` (email — external rate limit), `2` (alert-evaluator — DB-heavy). Adjust per worker.
- For each write-producing handler: add an `idempotencyKey` to `job.data`, dedupe with Redis SETNX before executing.
- New `dead-letter-queue` BullMQ queue; failed jobs auto-moved after `attempts` exhausted, exposed via `/admin/queues/dead-letter` (staff-only).

**Pattern to follow next time**

- New `Worker(...)` → must specify `concurrency` and `defaultJobOptions` explicitly. The SCALE checklist now enforces this.

---

### INC-018 — Mass-assignment in `sales`, `repairs`, `kb` controllers (2026-05-28)

**Status:** Open
**Severity:** P1
**Touched:** `apps/api/src/modules/sales/controller.ts:85-99`, `apps/api/src/modules/repairs/controller.ts:65-72`, `apps/api/src/modules/kb/controller.ts:54-69`
**Fixed in:** open
**Related:** AUDIT_FINDINGS.md finding API #5,#6,#7

**Symptom**
Three controllers use `data: { ...req.body, ... }` patterns in Prisma `.create()` calls. When the schema gains a new field (e.g., `featured: Boolean`, `priority: Int`), an attacker can set it via the request body, bypassing the Zod validator which only covers known fields.

**Root cause**
Convenience pattern from initial scaffolding. The Zod validator stops bad shapes; it doesn't stop _extra_ shapes from being forwarded to Prisma.

**Fix** (planned)
Replace `...req.body` with explicit field picks in all three controllers. Pattern reference: `apps/api/src/modules/rental-listings/controller.ts` already uses explicit picks.

**Pattern to follow next time**

- Never spread `req.body` into Prisma `data:`. Always explicit picks: `data: { title: body.title, ... userId: req.user.id, status: "initial" }`. Captured in SECURITY checklist as a hard rule.

---

### INC-019 — Web tokens in localStorage (XSS escalation path) (2026-05-28)

**Status:** Open
**Severity:** P1
**Touched:** `apps/customer/src/lib/api.ts`, `apps/admin/src/lib/api.ts`, `apps/support/src/lib/api.ts`, `apps/inventory/src/lib/api.ts`, plus matching backend cookie handling in `apps/api`
**Fixed in:** open
**Related:** AUDIT_FINDINGS.md finding web/mobile #1

**Symptom**
All four Next.js apps store access + refresh tokens in `localStorage`. Any successful XSS injection (third-party script compromise, npm package compromise, content injection bug) reads tokens and exfiltrates the user's session — including for staff/admin accounts.

**Root cause**
Originally simpler than cookie + CSRF dance; never revisited as the app matured into a staff portal handling sensitive operations.

**Fix** (planned)
Migrate to `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Lax` issued by the API on login. Add a per-request CSRF token (double-submit cookie or sync token) for state-changing requests. Mobile is unaffected — already uses SecureStore. Significant track: touches all 4 web apps + API auth controller + every fetch site.

**Pattern to follow next time**

- New web auth surfaces ship with httpOnly cookies + CSRF from day one. No localStorage tokens.

---

### INC-020 — Prod infra single points of failure + no external uptime monitor + no documented secret rotation (2026-05-28)

**Status:** Open
**Severity:** P1
**Touched:** `RUNBOOK.md`, ops infra (no code change here — runbook + external service config)
**Fixed in:** open
**Related:** AUDIT_FINDINGS.md finding Infra #4,#5,#6,#8,#41,#44,#45

**Symptom**

- Single Postgres on the VPS, no replica, no automated failover. Disk failure = data loss.
- Single Redis on the VPS, no AOF in prod (the inline fix above only covers local dev). Crash = queued jobs + sessions lost.
- No external uptime monitor — outages discovered by users, not us.
- No documented rotation procedure for JWT keys, Firebase service account, third-party API keys.

**Root cause**
Single-VPS deployment from day zero; HA was deferred to post-launch. That's defensible. But the uptime monitor + secret-rotation runbook are free wins that were never written.

**Fix** (planned)

- **Now (free, half-hour each):** UptimeRobot or BetterStack ping on `https://api.trendywheelseg.com/readyz` every 5 min, SMS + Slack alert. Mirror local-dev Redis AOF config to `/etc/redis/redis.conf` on the VPS.
- **Now (doc):** add "Secret rotation" + "Disaster recovery" sections to RUNBOOK.md.
- **Post-launch (multi-day):** migrate Postgres to managed (Supabase, RDS) with automated backups + read replica. Redis to Upstash or ElastiCache.

**Pattern to follow next time**

- Every external dependency we add (new third-party service, new env var, new infra component) → entry in RUNBOOK.md "Rotation" section _at the time it's added_, not later.

---

### INC-021 — No certificate pinning on mobile API calls (2026-05-28)

**Status:** Open
**Severity:** P2
**Touched:** `apps/mobile/lib/api.ts`, EAS build config
**Fixed in:** open
**Related:** AUDIT_FINDINGS.md finding web/mobile #7

**Symptom**
The mobile app trusts any TLS cert chain that resolves to `api.trendywheelseg.com`. A compromised CA, MITM on public WiFi, or rogue corporate network can intercept API traffic — including auth tokens and OTP exchanges.

**Root cause**
Cert pinning was deprioritized because Egypt's CA threat model is not in the top three risks today; pinning also adds operational complexity (cert rotation needs coordinated mobile app release).

**Fix** (planned)

- Install `react-native-cert-pinner` (or use the Hermes-compatible alternative).
- Pin the leaf cert's SHA-256 fingerprint for `api.trendywheelseg.com`.
- Document the rotation procedure: when certbot renews, the next mobile build embeds the new pin; release before the old cert hits its renewal window.
- Trade-off: any client running an older app build will break the day the cert rotates without the new pin baked in. Mitigation: pin **two** fingerprints (current + next) with a 30-day rotation overlap.

**Pattern to follow next time**

- Cert pinning is a multi-step deploy involving mobile + ops + a planned rollout. Don't bolt it on the day before a launch — plan the cycle.

---

### INC-022 — EAS iOS Distribution Cert can't be set up non-interactively (2026-06-08)

**Status:** Workaround
**Severity:** P1
**Touched:** `/tmp/setup-ios-creds.js`, `apps/mobile/credentials.json`, `apps/mobile/eas.json`
**Fixed in:** local-credentials path (not committed; cert + profile gitignored)

**Symptom**
`eas build --platform ios --non-interactive` errors out at credential setup with `Distribution Certificate is not validated for non-interactive builds. Run this command again in interactive mode.` This is true even with the ASC API key uploaded to the EAS dashboard, even with `EXPO_ASC_API_KEY_*` env vars set, even with `eas-cli@latest`. The CLI offers no flag to bypass the interactive validation step for first-time cert provisioning.

**Root cause**
EAS CLI's first-time iOS credential setup requires interactive confirmation of the auto-generated Distribution Certificate. There's no `--accept-distribution-cert` or `--auto-provision` flag. Attempts to drive the flow with `expect` were brittle: prompts emit ANSI escapes that bleed back into subsequent input lines, and the prompt sequence changes based on which credentials are already pre-uploaded.

**Fix**
Skip EAS's automated provisioning. Generate the iOS Distribution Certificate + App Store Provisioning Profile **directly via Apple's App Store Connect REST API** using a Node script (`/tmp/setup-ios-creds.js`):

1. JWT bearer (ES256) signed with the .p8 key
2. `openssl genrsa` + `openssl req` → CSR
3. `POST /v1/certificates { certificateType: "IOS_DISTRIBUTION", csrContent }` → DER cert bytes
4. Convert to PEM, wrap with private key into `.p12` via `openssl pkcs12 -export -legacy`
5. `GET /v1/bundleIds?filter[identifier]=com.trendywheels.app` → bundle record id
6. `POST /v1/profiles { profileType: "IOS_APP_STORE", relationships: { bundleId, certificates } }`
7. Reference `dist-cert.p12` + `profile.mobileprovision` from `apps/mobile/credentials.json` under `ios.distributionCertificate` and `ios.provisioningProfilePath`. Set `eas.json` production.ios.credentialsSource → `"local"`.

**Pattern to follow next time**
For first-time iOS cert provisioning in headless / CI / no-Mac environments, **don't fight the EAS interactive flow** — use the ASC REST API directly. The script lives at `/tmp/setup-ios-creds.js`; re-run on cert expiry (1 year) or when bundle ID changes. The .p12 password is `trendywheels-eas`. **Related:** INC-008 (Android keystore rotation).

---

### INC-023 — `GoogleService-Info.plist` gitignored → EAS Cloud build fails (2026-06-08)

**Status:** Fixed
**Severity:** P0
**Touched:** EAS env vars (production environment), `apps/mobile/app.config.js` (already references via `process.env.GOOGLE_SERVICES_PLIST`)
**Fixed in:** EAS file env var `GOOGLE_SERVICES_PLIST` (secret visibility, production env)

**Symptom**
`eas build --platform ios --profile production` fails ~7 min in at the prebuild step with `Error: "GoogleService-Info.plist" is missing, make sure that the file exists. Remember that EAS Build only uploads the files tracked by git. Use EAS environment variables to provide EAS Build with the file.` Same pattern previously applied for Android `google-services.json` (per `app.config.js:31`).

**Root cause**
EAS Cloud builders only see git-tracked files. The Firebase plist is gitignored (correct for security) but EAS has no other way to find it unless we explicitly inject it. The CLI warns at upload time (`File specified via "ios.googleServicesFile" field … is not checked in to your repository and won't be uploaded to the builder.`) but doesn't fail-fast — the build proceeds and crashes mid-prebuild.

**Fix**

```bash
eas-cli env:create production --name GOOGLE_SERVICES_PLIST --type file \
  --value /opt/trendywheels/apps/mobile/GoogleService-Info.plist \
  --visibility secret --scope project
```

`app.config.js:21` already had the right fallback: `googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist"`. The env var resolves to a build-server path at compile time.

**Pattern to follow next time**
Any `googleServicesFile` / Firebase config / signing keystore needed by EAS Cloud must be uploaded as a **file env var with secret visibility**, scoped to the right environment (production/preview/development). Verify with `eas-cli env:list production`. **Related:** see project memory `project_trendywheels_fcm_setup.md`.

---

### INC-024 — RN 0.79.x + Xcode 16.2+/26.x fmt consteval compile error (2026-06-08)

**Status:** Workaround
**Severity:** P0
**Touched:** `apps/mobile/plugins/with-fmt-cpp17.js` (Expo config plugin that injects a Podfile post_install snippet)
**Fixed in:** Plugin sets `GCC_PREPROCESSOR_DEFINITIONS += FMT_USE_CONSTEVAL=0` for all pod targets

**Symptom**
iOS build errors at Xcode compile with multiple lines like `call to consteval function 'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING, 0>' is not a constant expression`. Happens on Xcode 16.2, 16.3, 16.4, AND every Xcode 26.x. Does NOT happen on Xcode 15.4 (but that's too old — see INC-025).

**Root cause**
React Native 0.79.x bundles fmt 11.0.2 via `react-native/third-party-podspecs/fmt.podspec`. fmt's `basic_format_string` constructor is `consteval` when the compiler supports it. Xcode 16.2+ enforces stricter constexpr evaluation, rejecting all the React / Folly / ReactCommon call sites that pass runtime arguments. The fmt pod itself isn't the problem — it's everyone who _uses_ fmt headers in their own native compilation units. Setting C++17 on the fmt pod alone (which I tried in build #9) doesn't help because the consteval enforcement happens in the consumer's translation unit.

**Fix**
Custom Expo config plugin `apps/mobile/plugins/with-fmt-cpp17.js` (added to `app.config.js` plugins). It injects this into the existing `post_install do |installer|` block (created by Expo, must inject inside — duplicating the block crashes CocoaPods):

```ruby
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |bc|
    defs = bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
    defs = [defs] unless defs.is_a?(Array)
    defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')
    bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
  end
end
```

This makes fmt's `FMT_CONSTEVAL` macro fall back to `constexpr` everywhere, removing the consteval enforcement.

**Pattern to follow next time**

- Pod-level Podfile customization in Expo managed workflow → write a config plugin that uses `withDangerousMod`. Never produce a second top-level `post_install` block.
- When upgrading to Expo SDK 54+ (RN 0.80+ ships a newer fmt), **drop this plugin**.
- Don't try to fix consteval errors by changing C++ language standard on just one pod — the compile-time check happens at the call site, not the definition site.

---

### INC-025 — Apple requires Xcode 26+ as of 2026-04-28 (2026-06-08)

**Status:** Fixed
**Severity:** P0
**Touched:** `apps/mobile/eas.json` (`production.ios.image` = `macos-tahoe-26.4-xcode-26.4`)
**Fixed in:** EAS image bumped to `macos-tahoe-26.4-xcode-26.4`

**Symptom**
Submission attempt rejected at TestFlight upload with: _"Starting April 28, 2026, Apple requires apps submitted to the App Store to be built with Xcode 26 or newer. This build used Xcode 16. Rebuild on a newer EAS Build image to submit."_

**Root cause**
Apple policy change (announced March 2026, effective April 28). EAS's `image: "latest"` defaults aren't always the latest stable; explicit image pinning is required to guarantee Xcode version. Earlier EAS image tag `macos-sonoma-14.5-xcode-15.4` is now blocked by Apple regardless of compile success.

**Fix**
Set `production.ios.image: "macos-tahoe-26.4-xcode-26.4"` in `eas.json`. Available Xcode 26 images on EAS (verified by scraping the EAS infrastructure docs):

- `macos-tahoe-26.4-xcode-26.4` ← current pin
- `macos-sequoia-15.6-xcode-26.2`
- `macos-sequoia-15.6-xcode-26.1`
- `macos-sequoia-15.5-xcode-26.0`

**Pattern to follow next time**

- **Pin the EAS image explicitly**, don't rely on `latest` — Apple's review board enforces policy independent of compile success.
- Watch the Apple developer news feed for Xcode-version-required-by-date announcements; they cascade through EAS image availability.
- See INC-024 for the matching fmt-consteval workaround that's required with Xcode 26.

---

### INC-026 — Mobile app had zero Jest tests + pnpm transformIgnorePatterns trap (2026-06-08)

**Status:** Fixed
**Severity:** P1
**Touched:** `apps/mobile/jest.config.js`, `apps/mobile/tests/jest-setup.ts`, `apps/mobile/tests/__mocks__/*`, `apps/mobile/package.json` (deps)
**Fixed in:** Built minimal Jest + React Native Testing Library + jest-expo infra; 5 P0 test files seeded covering booking / buy / trade-in / repair / WhatsApp flows

**Symptom**
`pnpm --filter @trendywheels/mobile test` reported `No tests found, exiting with code 0` — zero coverage on a customer-facing app handling rentals + payments. When tests were added, they failed to even load with `SyntaxError: Unexpected identifier 'ErrorHandler'` at `@react-native/js-polyfills/error-guard.js`. Then with `ReferenceError: expect is not defined` after fixing the transform issue.

**Root cause** (compound)

1. No `jest.config.js`, no setup file, no @testing-library/react-native installed. Mobile testing was never bootstrapped.
2. **pnpm node_modules path trap**: pnpm stores packages under `node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/...`. Standard React Native `transformIgnorePatterns` regexes (designed for npm/yarn flat node_modules) don't match the doubled-up path, so Flow-typed `.js` files under `@react-native/js-polyfills` slip past Babel transform.
3. **`setupFiles` vs `setupFilesAfterEnv` confusion**: Jest's `setupFiles` runs BEFORE the test framework loads, so `expect` is undefined. `@testing-library/jest-native/extend-expect` calls `expect.extend(...)` and crashes. Real key is `setupFilesAfterEnv` (NOT `setupFilesAfterEach` — that doesn't exist, despite some online examples claiming it does). Verified by reading `node_modules/.pnpm/jest-config@*/.../ValidConfig.js`.

**Fix**

- `jest.config.js`: `preset: "jest-expo"`, `setupFilesAfterEnv: ["<rootDir>/tests/jest-setup.ts"]`, transformIgnorePatterns broadened to `node_modules/(?!.*(react-native|@react-native|@react-navigation|expo|@expo|@shopify/react-native-skia|@react-native-firebase))` — the `.*` after `node_modules/` lets pnpm's `.pnpm/...` paths match.
- `tests/jest-setup.ts`: Stubs expo-router (with mockRouter exposing `push/replace/back` jest.fns), expo-haptics, react-native Linking + Alert, expo-image-picker, @react-native-firebase/auth, expo-secure-store, Skia (Canvas/Group/Circle/Rect/Path/Fill), reanimated (official `/mock`), TWSkiaConfetti, lib/sounds.
- `__mocks__/sounds.ts` + `__mocks__/fileMock.ts` for non-JS module imports.
- Deps installed via `pnpm add -D --filter @trendywheels/mobile @testing-library/react-native @testing-library/jest-native jest-expo react-test-renderer@19.0.0`.

**Pattern to follow next time**

- When adding tests to a new app inside the monorepo, START by writing `jest.config.js` + a setup file + verifying with a single trivial test BEFORE writing any real tests.
- In pnpm monorepos, broaden `transformIgnorePatterns` to `node_modules/(?!.*(<allowed-packages>))` — the `.*` handles the `.pnpm` indirection.
- `setupFilesAfterEnv` is the only correct key for "needs `expect` to be available." Don't trust StackOverflow.
- Don't auto-mock packages already mocked globally in `jest-setup.ts` — duplicate per-file mocks were a recurring over-engineering smell in the AI-generated tests.

---

### INC-027 — Customer storage prefix allowlist missed sell/sales/rental flows (2026-06-08)

**Status:** Fixed
**Severity:** P0
**Touched:** `apps/api/src/modules/storage/routes.ts:28`
**Fixed in:** `CUSTOMER_PREFIX_ALLOWLIST` extended with `"trade-ins"`, `"sales"`, `"rental-listings"`

**Symptom**
Mobile customers reported "selling doesn't work, buying doesn't work, trade-in doesn't work" with no visible error — submission flows silently hung at the photo-upload step. CRM activity showed normal use up to that step then dropped off.

**Root cause**
`apps/mobile/lib/upload.ts` calls `POST /api/storage/presign` with the prefix matching the feature (`trade-ins`, `sales`, `rental-listings`). The presign route filtered against `CUSTOMER_PREFIX_ALLOWLIST = ["uploads", "license-photos", "avatars", "reviews"]` and returned `403 Forbidden` for the new prefixes. `uploadImages()` had a catch block that swallowed errors silently. So the photo upload returned `[]`, the form had no valid photo URLs, and the user got stuck on the photo step with no error feedback.

**Fix**
Extended the array:

```ts
const CUSTOMER_PREFIX_ALLOWLIST = [
  "uploads",
  "license-photos",
  "avatars",
  "reviews",
  "trade-ins",
  "sales",
  "rental-listings",
];
```

Smoke-tested all 3 new prefixes against live `api.trendywheelseg.com` — each now returns a signed presign URL.

**Pattern to follow next time**

- When adding any new customer-facing feature that uploads media, **audit the storage prefix allowlist** as part of the PR. Add a smoke test to `apps/api/scripts/smoke-test.sh` for each new prefix.
- The `uploadImages()` silent-swallow pattern in `apps/mobile/lib/upload.ts` is dangerous; consider surfacing the per-file error to the caller in v1.1.

---

### INC-028 — Customer mutations silently fail with no Alert on error (2026-06-08)

**Status:** Fixed
**Severity:** P1
**Touched:** `apps/mobile/app/buy/[id].tsx`, `apps/mobile/app/rent/book.tsx`
**Fixed in:** Added explicit `onError` + `Alert.alert` to both buy and rent mutations; buy success now uses Alert.alert with "View my orders" button instead of immediate `router.push("/(tabs)/profile")`

**Symptom**
Users tap "Reserve" or "Buy" → immediately land on the Profile tab → no DB row → no feedback. Indistinguishable to the user from "the app is broken." Symptom would absolutely fail an Apple App Store review (Guideline 2.1 "incomplete or non-functional").

**Root cause**
React Query `useMutation` with `onSuccess` only:

```ts
useMutation({ mutationFn: ..., onSuccess: () => router.push("/(tabs)/profile") })
```

No `onError`. The mutation could fail (validation error, 4xx, network timeout) and the user got zero feedback. On `buy`, the success path went straight to `/(tabs)/profile` with no order-placed confirmation — so even SUCCESS looked like failure to a confused reviewer.

**Fix**
Added per-mutation:

- `onError`: `Alert.alert("<screen-friendly title>", err instanceof Error ? err.message : "<fallback>")` so the user sees the real reason
- `onSuccess`: short Alert with order reference + a "View my orders" button that triggers the router push, not an automatic redirect

**Pattern to follow next time**

- **No customer-facing mutation ships without an `onError` Alert.** Add ESLint rule or PR-template item enforcing this.
- Don't auto-route on `onSuccess` without confirmation — Apple's reviewers and confused users interpret instant-redirects as crashes.
- Same pattern likely missing in other screens (repair submit, trade-in submit, license upload). Audit in v1.1.

---

### INC-031 — Sale vehicles leaked into Rent; vehicle photos never rendered; double-entry catalog (2026-06-12)

**Status:** Fixed
**Severity:** P1
**Touched:** `packages/validators/src/index.ts`, `packages/types/src/index.ts`, `apps/mobile/app/rent/category/[key].tsx`, `apps/mobile/app/rent/[id].tsx`, `apps/api/src/modules/vehicles/product-sync.ts` (new), `apps/api/src/modules/vehicles/controller.ts`
**Fixed in:** OTA group `559fc930`; API deploy same day

**Symptom**
Owner added a sale-only vehicle ("Classic ecar - 2+2"); it appeared in the mobile RENT browse, with placeholder images despite 5 uploaded photos, and the Buy section still showed 36 demo products.

**Root causes (three stacked)**

1. Mobile rent browse called `GET /vehicles` without `listingType=rent` — AND `vehicleFiltersSchema` didn't whitelist `listingType`, so even a passed filter was silently stripped by the validate middleware. Strict-strip validators hide missing-param bugs: the API "supported" the filter but no client could reach it.
2. Mobile read `vehicle.images` as `string[]`, but the API returns VehicleImage rows (`{url, sortOrder}`) — `images[0]` was an object, Image got a garbage URI, fell back to placeholder.
3. Buy is products-table-driven; the demo wipe deliberately preserved the catalog, and there was no vehicle→product link, forcing double entry (owner's manual product had stock 0 + no images = invisible).

**Fix**
listingType added to validator+types+mobile call; image reads tolerate both shapes; `syncVehicleProduct()` keeps a product row in lockstep with every sale/both vehicle (create/update/status/remove hooks) — vehicles are now the single inventory source, catalog is parts/accessories only. Demo products purged (backup: /root/db-backups/catalog_purge_backup_20260612.sql).

**Pattern to follow next time**

- When a validator whitelists query params, adding an API filter REQUIRES touching the validator — grep for the schema before assuming the controller change is enough.
- When a Prisma `include` shape reaches a client, type the client payload from the API response, not from convenience casts (`as string[]` hid this for weeks).

---

### INC-030 — OTA bundles shipped with localhost API URL (recurring "Network request failed") (2026-06-11)

**Status:** Fixed
**Severity:** P0
**Touched:** `apps/mobile/.env.production` (new), every `eas update` published before 2026-06-11
**Fixed in:** `.env.production` with `EXPO_PUBLIC_API_URL` + `EXPO_PUBLIC_SENTRY_DSN`; OTA group `6346474d` republished with env baked
**Related:** every "network error" report since the first production OTA

**Symptom**
Recurring, unexplainable "Network request failed" on devices — especially right after login/OTP — while the API was provably healthy (public HTTPS 200, sub-100ms). Fresh installs worked on FIRST launch, then broke. Reported repeatedly across sessions as "network error again".

**Root cause**
`eas update` does NOT read `eas.json` build env (that block is build-only). With no `.env.production` and no exported shell vars, Babel inlined `process.env.EXPO_PUBLIC_API_URL` as `undefined`, so every published OTA bundle compiled `baseUrl` to the `http://localhost:4000` fallback. Embedded build bundles (from `eas build`, which DOES read eas.json env) had the correct URL — hence first-launch-works, breaks-after-OTA-applies. Verified by running `strings` on the published `.hbc`: zero `EXPO_PUBLIC_API_URL` refs, no standalone production URL, `http://localhost:4000` present.

**Fix**
`apps/mobile/.env.production` (committed — public URL + DSN, not secrets) is read automatically by `expo export` (NODE_ENV=production) during `eas update`. Belt-and-braces: also export the vars in the publish shell. Verify EVERY publish with: `strings dist/_expo/static/js/ios/*.hbc | grep -c "https://api.trendywheelseg.com"` (must be ≥1) and `grep -c EXPO_PUBLIC_API_URL` (must be 0).

**Pattern to follow next time**

- Build env and update env are SEPARATE channels in EAS. Anything inlined via `EXPO_PUBLIC_*` must exist in `.env.production` (or EAS server env with `--environment`), not just `eas.json`.
- After any OTA publish, grep the compiled bundle for the production hostname before telling anyone "fixed".

---

### INC-029 — WhatsApp CRM button used fire-and-forget mutation (2026-06-08)

**Status:** Fixed
**Severity:** P2
**Touched:** `apps/mobile/app/crm/leads/[id].tsx:487`
**Fixed in:** Switched from `logActivity.mutate(...)` to `await logActivity.mutateAsync(...)` inside a try/catch (matching the existing Call button pattern at line 357)

**Symptom**
Sales agents reported "WhatsApp clicks don't appear in the CRM activity feed, but Call clicks do."

**Root cause**
The Call action used `await logActivity.mutateAsync(...)` (synchronously logs the activity, then opens `tel:`). The WhatsApp action used `logActivity.mutate(...)` (fire-and-forget). When the activity write failed (network blip, server 5xx), Call recovered via try/catch but WhatsApp silently dropped the log with no error surface. At 100k user scale this gap drops measurable amounts of pipeline data.

**Fix**

```ts
try {
  await logActivity.mutateAsync({ type: "whatsapp_sent", body: "Opened WhatsApp" });
} catch {
  // Swallow — logging failure shouldn't block the WhatsApp launch
}
void Linking.openURL(`https://wa.me/${digits}`);
```

**Pattern to follow next time**

- For CRM activity logging: prefer `mutateAsync` + try/catch over `mutate`. The Call pattern at `crm/leads/[id].tsx:357` is canonical.
- When two parallel UI buttons do "similar" things (Call + WhatsApp + Email + SMS), audit them as a set. Asymmetric patterns hide bugs.

---

### INC-032 — Mobile sessions not persisted across app relaunches (2026-06-15)

**Status:** Fixed
**Severity:** P1 (every user + external testers re-logged-in on each launch)
**Touched:** `apps/mobile/lib/auth-store.ts` (hydrate), `apps/mobile/lib/api.ts` (setTokens), `apps/api/src/modules/auth/service.ts` (refreshAccessToken)
**Fixed in:** commit `915e7f4` — API redeployed (pm2 restart, rotation verified live) + OTA `78353f5c`
**Related:** INC-030 (the "fresh installs work on first launch then break" reports were partly this), INC-013 (session revocation marker)

**Symptom**
"Each time I log in it doesn't save my login — I have to log in again every time I reopen the app." Confirmed by external testers.

**Root cause (two compounding bugs)**

1. `auth-store.hydrate()` validated the session on boot with a **raw `fetch`** to `/users/me` using the access token, and cleared **both** tokens on ANY non-2xx — including the expected 24h access-token expiry AND a transient network blip — **without ever using the refresh token**. So the day after login (or on any flaky boot) the user was silently logged out.
2. `refreshAccessToken` revoked the presented refresh token but returned **only a new access token** (`{ token }`, no `refreshToken`). Even when a refresh did fire, `setTokens(token, undefined)` threw in SecureStore (rejects non-strings), and the single-use refresh token was already revoked with no replacement — so the next refresh failed too.

**Fix**

- `hydrate()` now calls `api.request("GET","/api/users/me")` (the refresh-aware ApiClient): an expired access token is transparently refreshed; tokens are cleared ONLY when the server rejects the refresh (onAuthError), never on a network/timeout error.
- `refreshAccessToken` now rotates the **whole pair**: revoke old, mint+persist a new refresh token, return `{ token, refreshToken }` — so a session lives its full 30-day window.
- `setTokens(token, refreshToken?)` only rewrites the refresh token when one is actually returned (defensive against undefined / omitted).

**Pattern to follow next time**

- Boot/restore paths MUST go through the refresh-aware client, not a raw fetch — otherwise they bypass token refresh and the centralized onAuthError clearing.
- NEVER clear auth tokens on a network/timeout error; only on a definitive server auth rejection. A flaky boot must not log the user out.
- Token "rotation" means return a NEW refresh token, not just a new access token. Smoke (`section 1b`) now asserts `/auth/refresh-token` returns a working new pair and revokes the old.

---

### INC-033 — Production `STAFF_TEST_PHONES` + Firebase fixed-code test numbers grant no-password superadmin (2026-06-15)

**Status:** Fixed (code) — `NODE_ENV` gate deployed + smoke-verified 2026-06-15; exploit path dead in prod. Owner still to clear `STAFF_TEST_PHONES` from `.env` + delete the Firebase test numbers + rotate the `Admin@123!` password (defense-in-depth, pending).
**Severity:** P0 (no-auth path to a superadmin JWT against production)
**Touched:** `apps/api/.env` (`STAFF_TEST_PHONES`), `apps/api/src/modules/auth/service.ts` (`isStaffTestPhone`, `issueTokensForPhone:240`), `apps/api/src/modules/auth/controller.ts` (`firebaseToken`), `packages/db/prisma/seed.ts:42-49,819`, **Firebase Console** (test phone numbers — external, not in repo)
**Fixed in:** commit `3f92d65` — `isStaffTestPhone` returns false when `NODE_ENV==="production"`; API restarted (pm2) + smoke PASSED; reviewer customer bypass (`+201234567000`/`730284`) confirmed still working.
**Related:** INC-013 (access-token revocation), INC-018 (mass-assignment — still live), INC-012 (refresh O(n) scan), AUDIT_FINDINGS "Re-audit 2026-06-15"

**Symptom**
A 4-reviewer security review (2026-06-15, triggered by `/security-review`) found a live, no-password path to a superadmin token against production. The API already logs a warning about it at every boot (`server.ts:94-97`).

**Root cause**
Prod `.env` sets `STAFF_TEST_PHONES=+201500001001,+201500001002` under `NODE_ENV=production`. `seed.ts` seeds `+201500001001` with `staffRole:"admin"` and documents it as a **Firebase Console test phone with fixed verification code `100001`** (`seed.ts:819`). `issueTokensForPhone` (service.ts:240) deliberately exempts allow-listed staff phones from the customer-only guard: `isAllowedStaffTest = isStaffTestPhone(phone) && user.staffRole !== null`. `POST /api/auth/firebase-token` reads the `phone_number` claim off a verified Firebase ID token and calls `issueTokensForPhone`. Because Firebase fixed-code test numbers send no SMS, anyone who knows the number + fixed code (both live in tracked `seed.ts`) can `signInWithPhoneNumber` → `confirm("100001")` → obtain a genuine Google-signed token → exchange it for a **superadmin JWT**. No password, no SMS interception. (One external link not verifiable from the box: that the number is _currently_ registered as a Firebase test number — but the seed documents it and the staff-phone feature requires it.)

**Fix**
Owner actions: (1) empty `STAFF_TEST_PHONES` in prod `.env`, then `pm2 restart trendywheels-api`; (2) delete the two numbers in Firebase Console → Auth → Phone → numbers for testing; (3) rotate the admin password off the published default `Admin@123!` — staff login also has NO MFA (the `totpCode` field in `staffLoginSchema` is accepted but never verified anywhere). Recommended durable code gate: make `isStaffTestPhone` return `false` when `NODE_ENV === "production"` (same pattern as `DEV_ONLY_TRIAL_BYPASS`), so env drift alone can't reintroduce the bypass. Does NOT affect the App Store reviewer login (separate `+201234567000` customer bypass) or admin-web email login.

**Pattern to follow next time**
A static-code / test-phone path must NEVER resolve to a staff or admin account in production. Gate test-only allow-lists behind `NODE_ENV !== "production"` in code, not just env discipline — env files drift, code gates don't. Privileged login must require email + password + a real second factor.

**Update 2026-06-17 — staff phone login deliberately re-enabled (owner decision).**
Staff/admin had NO way to sign into the mobile app (phone blocked here, no email/password screen), so sales agents couldn't reach the CRM. Per owner decision, `issueTokensForPhone` now allows staff/admin — but ONLY via this function, which is reached solely from `POST /api/auth/firebase-token` after a cryptographic Firebase ID-token verify (= a real SMS to the owner's SIM). The dead `isStaffTestPhone` backstop was removed and `STAFF_TEST_PHONES` cleared in prod `.env`. **The INC-033 hole stays closed iff Firebase has NO fixed-code test numbers** (those mint a valid ID token with no SMS). `verifyOtp` (the DB/bypass path) STILL blocks staff, so the hardcoded `TRIAL_OTP_BYPASS` codes remain customer-only. **Owner action still required:** delete the Firebase Console test phone numbers + rotate `Admin@123!`. Touched: `auth/service.ts`, `config/env.ts`, `.env`.

---

### INC-034 — Refresh-token rotation race → spurious logout on relaunch / OTA update (2026-06-17)

**Status:** Fixed
**Severity:** P1 (users + testers reported being logged out "every time", especially after an update)
**Touched:** `packages/api-client/src/index.ts` (`request` 401 handler, new `refreshTokensOnce` single-flight, `doRefreshTokens` network-error class)
**Related:** INC-032 (made refresh tokens single-use/rotating — which introduced this race), INC-013 (onAuthError clears tokens)

**Symptom**
"Even though we fixed sessions, it still signs me out — is it because of each update?" Logouts clustered on app relaunch and right after an OTA update.

**Root cause**
INC-032 made refresh tokens single-use and rotating (revoke old → mint new on every refresh). But the api-client 401 handler had no single-flight guard: each request that hit a 401 independently read the refresh token and called `/auth/refresh-token`. On boot / after an OTA reload, several screens mount at once and all hit the >24h-expired access token simultaneously → the first refresh rotates (revokes) the token, the 2nd+ concurrent callers present the now-revoked token → rejected → `onAuthError` → forced logout. Also: a network failure during the refresh fetch was treated as an auth rejection (logout), violating INC-032's "never log out on a network blip".

**Fix**
`refreshTokensOnce()` funnels every concurrent refresh through ONE in-flight promise (cleared in `finally`), so a burst rotates the token exactly once and all callers retry with the new access token. `doRefreshTokens` now classifies an unreachable endpoint as a `TIMEOUT`/network error (statusCode 0); the 401 handler only calls `onAuthError` for a genuine server rejection, never a network error. Shipped via OTA (mobile) + next web deploy (shared client).

**Pattern to follow next time**
Single-use/rotating refresh tokens REQUIRE a single-flight guard on the client — without it, concurrent 401s self-inflict a logout. And keep INC-032's rule: only a definitive server auth rejection clears tokens; network/timeout never does.

---

### INC-035 — Support messages routed to one admin only (2026-06-18)

**Status:** Fixed
**Severity:** P1 (customer support effectively invisible — "messages don't go anywhere, nowhere to respond")
**Touched:** `apps/api/src/modules/messages/controller.ts`, `apps/api/scripts/smoke-test.sh`
**Related:** uses `notifyAdmins` (utils/notify.ts)

**Symptom**
Owner: "support messages don't go anywhere and nowhere to respond to them." A customer's support message reached at most one staff member, and no one else could see or answer it.

**Root cause**
`supportContact` returns the single oldest active admin. The customer starts a 1:1 `Conversation` with that one person; `send()` notified ONLY that recipient (`notifyUser`), and the other staff weren't participants, so they neither got pinged nor could open/reply to the thread. If that one admin wasn't watching, the message was a black hole.

**Fix (API-only, no migration, no client change)**
In `send()`, detect a support thread = exactly one side is staff/admin. For those: (1) `findOrCreateSupportConversation` reuses the customer's existing support thread (customer + any staff participant) so replies thread into ONE conversation instead of fragmenting; (2) `ensureAllStaffParticipants` adds every active staff/admin as a participant, so the thread appears in everyone's inbox, passes the participant check, and any of them can reply; (3) a customer→support message broadcasts via `notifyAdmins` (whole team), while staff replies / ordinary 1:1 DMs still `notifyUser` the single recipient. Existing 1:1 threads migrate to shared on their next message. Smoke 1d asserts a staff member who is NOT the recipient sees the thread.

**Pattern to follow next time**
Support is a shared team inbox, not a private DM to one person — fan out participants + broadcast the notification. Watch for `findOrCreateConversation(a,b)` pair-matching silently spawning duplicate threads when a different staff replies.

---

### INC-036 — Play policy block: `FOREGROUND_SERVICE_MEDIA_PLAYBACK` + `RECORD_AUDIO` from expo-audio (2026-06-18)

**Status:** Fixed (code-complete; requires a fresh Android build to ship — permission is baked into the binary, NOT OTA-able)
**Severity:** P1 (Play "Foreground service permissions" declaration overdue → app updates rejected until resolved)
**Touched:** `apps/mobile/plugins/with-strip-audio-foreground-service.js` (new), `apps/mobile/app.config.js`
**Related:** distinct from the "16 KB page size" Play policy item (that one is the NDK r27/SDK 35 toolchain in `expo-build-properties`, already in app.config.js).

**Symptom**
Play Console "App content" → "Foreground service permissions": "your app bundle includes FOREGROUND_SERVICE_MEDIA_PLAYBACK", declaration overdue, blocking releases. Google demands either a justification video or removal.

**Root cause**
`expo-audio`'s OWN `android/src/main/AndroidManifest.xml` unconditionally declares `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` + an `AudioControlsService` (mediaPlayback) and `AudioRecordingService` (microphone). These merge into the app manifest via Gradle regardless of config-plugin options. We only use expo-audio for tiny in-app UI sound effects (`lib/sounds.ts`: `createAudioPlayer`+`play()`) — no background playback, no media session, no recording — so we have NO legitimate use for the permission and don't qualify to declare it.

**Fix**
New config plugin `with-strip-audio-foreground-service.js` adds Gradle manifest-merger `tools:node="remove"` markers (and the `xmlns:tools` namespace) for the three permissions + both services, so the final merged AAB manifest drops them. Kept `MODIFY_AUDIO_SETTINGS` (harmless normal permission used by playback). Verified: only expo-audio contributed these in the whole `node_modules`; `expo-notifications` does NOT need `FOREGROUND_SERVICE`. Confirmed via `expo prebuild --platform android` that the generated manifest carries the remove markers; cleaned up the throwaway `android/` dir after.

**Pattern to follow next time**
A library's _own_ manifest contributes permissions you can't strip with a plugin option — the only lever is a `tools:node="remove"` marker in the app manifest (a `withAndroidManifest` config plugin). Permission changes are NATIVE: an OTA can't fix them, a new build is required. Before adding any media/mic Expo module, check its `android/src/main/AndroidManifest.xml` for foreground-service / dangerous permissions.

---

### INC-037 — Customer listing/buy flow defects + admin rental blindspot (2026-06-19)

**Status:** Fixed (mobile = OTA-able; admin = web build + restart)
**Severity:** P1 (multiple user-facing breakages reported by owner in one pass)
**Touched:** mobile (app/sell/create.tsx, app/(tabs)/index.tsx, app/(tabs)/buy.tsx, app/buy/[id].tsx, app/buy/my-orders.tsx, app/sell/my-listings.tsx, app/(tabs)/profile.tsx, app/\_layout.tsx, app/sell/list-for-rent/{my,[id]}.tsx (new), app/sell/trade-in/{my,[id]}.tsx (new), components/{Rail,SectionHeader,ListingCard,StatStrip}.tsx), packages/{types,api-client,i18n}, apps/admin (app/rentals/page.tsx new + lib/shell.tsx)

**Symptoms (owner report)**

1. Sell-a-car wizard: final submit threw a "validation error" even with no photos attached; listing never created.
2. "My rental listings" profile card opened the _create_ rental screen, not a list of the user's listings.
3. No way in-app to track submitted rental listings OR trade-ins (create-only, no status view).
4. Home + Buy tabs rendered light/white even in dark mode.
5. Customer-submitted rental listings never appeared in the admin panel (only trade-ins did).
6. Back buttons showed junk text labels ("Back" + a stray id/route string).

**Root causes & fixes**

1. `createSalesListingSchema` requires `title.min(5)` + `description.min(10)`; `images` is OPTIONAL. The wizard's `canProceed` never gated description and only checked title non-empty, so users reached Publish with an empty description → server 400 with a generic message they misread as "photos". Fix: gate title≥5 + description≥10 in `canProceed`, mark description required, add inline min-length hints. Photos were never the cause.
2. profile.tsx rentals card pushed `/sell/list-for-rent` (the create screen). Fix: built `app/sell/list-for-rent/my.tsx` (list) + `[id].tsx` (detail), repointed the card to `/sell/list-for-rent/my`.
3. Built rental + trade-in tracking screens (list + detail) backed by existing endpoints (GET /api/rental-listings, /:id; GET /api/trade-in, /:id — added `getTradeIn`/`TradeIn` type to api-client+types). Added a trade-in profile card. Each list has a `StatStrip` summary (the "dashboard per section" the owner asked for); also retrofitted into my-listings + my-orders.
4. Home/buy/buy-detail had hardcoded light colors (`#F7F7FB`, `INK=#02011F`) and never called `useTheme()`. The shared Rail/SectionHeader/ListingCard also hardcoded `INK`. Fix: wired `useTheme()` palette into those screens + components. Safe because `INK === light-mode palette.text`, so light mode is byte-identical and only dark mode changes.
5. The rental admin endpoint existed and worked (smoke 12i); there was simply NO admin page or nav entry. Fix: added `apps/admin/src/app/rentals/page.tsx` (mirrors trade-ins) + a "Rental listings" nav item.
6. iOS native-stack labels the back button with the previous screen's `title` (several are id-based: order ids, "#abc123", vehicle names). Fix: `headerBackButtonDisplayMode: "minimal"` on the root Stack → chevron only.

**Pattern to follow next time**
Client forms must mirror the Zod schema's required fields/min-lengths in their step gating, or the server 400 surfaces as a mystery to the user. A "create" route is not a "my X" route — every submit flow needs a matching tracking list+detail. When theming, prefer swapping a hardcoded ink constant for `palette.text` only when the constant equals the light value (zero light-mode risk).

---

### INC-038 — Role leak on demotion + support invisible in web admin + staff→admin vehicle leak (2026-06-19)

**Status:** Fixed
**Severity:** P1 (owner: a customer logs in as staff; support "goes nowhere"; staff land in the admin console)
**Touched:** apps/api/src/modules/users/controller.ts, apps/api/src/modules/admin/routes.ts, apps/api/scripts/smoke-test.sh, apps/admin/src/app/messages/page.tsx + messages/[id]/page.tsx (new), apps/mobile/app/crm/inventory.tsx; + a one-off prod data fix.

**Symptoms (owner)**

1. Phone +201225389846 is meant to be a customer but logs in as staff; "roles changed by the customer don't stick."
2. Started a support message, saw nothing in the web admin panel and unclear if staff got it; "you said you fixed it but nothing changed."
3. Staff tapping "Vehicles" get transferred into the admin console.

**Root causes & fixes**

1. The user row was `accountType:customer` but still had `staffRole:sales` — a leftover. The admin role-update handler (`users/controller.ts` update) never cleared `staffRole` when `accountType` was set to customer, so demotions half-applied; staffRole-keyed UI lists + `isAdmin()` (which trusts `staffRole==="admin"` on DB rows) then mis-treated the row. Fix: in `update()`, force `staffRole=null` when `accountType==="customer"` (the existing privilege-diff then revokes the user's sessions). One-off prod data fix: `updateMany({where:{accountType:"customer",staffRole:{not:null}},data:{staffRole:null}})` (1 row). Cold-start routing (`app/index.tsx`) and `authorize()` are correctly accountType-based, so this was NOT a server access-control hole for a `sales` leftover — but a stray `staffRole:"admin"` on a customer WOULD be (isAdmin trusts it on rows); clearing it removes that risk too.
2. INC-035 routing actually worked (DB had the support thread with all staff/admin as participants). The real gap: the web admin **Messages** page was read-only and undiscoverable, so the owner thought it was lost. Fix: new `GET /api/admin/conversations/:id` (full thread, participants carry accountType) + `POST /api/admin/conversations/:id/reply` (posts to the customer participant, reuses Message model + notifyUser); admin web messages rows now open a thread+reply detail page. Mobile staff already saw it (they're participants) — push only lands if device notifications are on. Smoke 1d extended to open + reply via the admin endpoints.
3. `crm/inventory.tsx` pushed staff to `/admin/vehicles/[id]` (admin console). Fix: route to the existing sales-scoped `/inventory/[id]` (view + standard available/reserved/sold toggle), not the admin edit screen.

**Pattern to follow next time**
accountType is the source of truth — when it changes, reconcile staffRole (clear it for customers). Never gate UI or `isAdmin` on `staffRole` from a DB row without also trusting accountType. "Routed/stored" ≠ "visible + actionable" — a fix isn't done until there's a UI surface to see AND act on it.

### INC-039 — Staff over-privileged: admin console + entire /api/admin reachable by accountType=staff (2026-06-20)

**Status:** Fixed (API gate restarted + smoke-proven; client guard shipped via OTA group `8225a2d3-9e66-418c-ad2a-1c007b0116ed`)
**Severity:** P0 (any sales/support agent could read platform metrics, revenue, every customer + conversation, system-config, and cancelled customer listings; INC-038's vehicle-tap repoint was only a band-aid over this)
**Touched:** apps/api/src/modules/admin/routes.ts, apps/api/src/modules/diagnostics/routes.ts, apps/mobile/app/admin/\_layout.tsx

**Symptoms (owner, logged in as a sales staff)**

1. Could still open the in-app admin panel; tapping a product in inventory showed admin-level detail "as if I'm an admin".
2. Could edit inventory and see customer listings the admin had cancelled.

**Root cause**
Two missing gates, one on each side:

- **API:** `modules/admin/routes.ts` mounted the whole admin console backend with `authorize("admin", "staff")`. The JWT only carries accountType, and "staff" was allow-listed, so any staff token reached `/api/admin/metrics`, `/revenue-breakdown`, `/customers`, `/conversations`, `/system-config`, `/recent-activity` (which returns all sales listings incl. cancelled), etc. No staff screen actually calls `/api/admin/*` — staff have `/api/crm`, `/api/inventory`, `/api/maintenance`, `/api/repairs` — so "staff" was never needed here. `diagnostics/admin/error-logs` had the same over-grant.
- **Client:** `app/admin/_layout.tsx` had no role guard. The cold-start redirect in `app/index.tsx` (admin→/admin, staff→/crm) is not an access control — once running, a staff (or a stale OTA's nav target, or a deep link) could render any `/admin/*` screen.

**Fixes**

- `admin/routes.ts` + `diagnostics/routes.ts`: `authorize("admin", "staff")` → `authorize("admin")`. Verified: sales token now 403 on metrics/recent-activity/revenue-breakdown/system-config/customers/conversations/notifications; admin still 200; `/crm/leads` + `/crm/inventory` still 200 for staff (no CRM regression).
- `app/admin/_layout.tsx`: guard at the top of the layout — `useAuth()`; while `!initialized` render a brand-INK hold; if `accountType !== "admin"` `<Redirect>` staff→`/crm/pipeline`, customer→`/(tabs)`. Stops the console UI from ever rendering for a non-admin.

**Pattern to follow next time**
A redirect is routing, not authorization. Every privileged route tree needs BOTH a layout-level role guard (client) AND `authorize(...)` on its API (server) — and the API is the real boundary. `authorize("admin","staff")` is only correct when a staff screen genuinely calls that endpoint; default privileged modules to `authorize("admin")` and widen deliberately. Prove access-control fixes with a real lower-privilege token (here: the smoke test's SALES_TOKEN → expect 403), not by reading the code.

### INC-040 — Notifications: blue-square icon, permission asked too late, half the client requests never alerted the team (2026-06-20)

**Status:** Fixed. Server coverage + permission prompt live (API restart + OTA group `7d9e2e36-b470-4445-bfb3-649aa9287060`). **Icon fix is native — ships with the NEXT Android build (not OTA-able).**
**Severity:** P1 (owner: notifications show a blue square not the logo; never asked for permission; "every request a client makes must reach admin + staff")
**Touched:** apps/mobile/assets/notification-icon.png, apps/mobile/lib/push.ts, apps/mobile/app/\_layout.tsx, apps/api/src/modules/{trade-in,transport,orders,repairs}/controller.ts

**Three problems, three fixes**

1. **Blue square icon.** `assets/notification-icon.png` was a ~320-byte near-blank 96×96 — Android needs a _white silhouette on transparent_ for the status-bar small icon; a blank/opaque one renders as a solid square tinted by the accent `color` (#2B0FF8 → "blue square"). Fix: regenerated it as a white silhouette of the brand mark from `adaptive-icon.png` (`-channel RGB -evaluate set 100% +channel -trim -resize 76x76 -extent 96x96`, transparent bg). The plugin already set `color:"#2B0FF8"` + `defaultChannel`. **Native asset → requires a rebuild to take effect.**
2. **Never asked for permission.** `registerPushToken()` (which requests permission) was only called `if (user?.id)` — so guests were never asked, and a logged-in user only saw the dialog if the OS status was still undetermined. Fix: split out `ensureNotificationPermission()` (no auth) and call it on app mount (1.2s after splash) in `_layout.tsx`, independent of login. `registerPushToken` now reuses it.
3. **Half the client requests were silent.** `notifyAdmins` already fans out to every active admin **and** staff, but only bookings, sales, rental-listings, support messages, and the service-requests trio called it. **trade-in, transport, orders, and repairs created rows with no team alert.** Fix: added `notifyAdmins(...)` to each of those four create handlers (deduped jobIdPrefix per entity, `data.url` deep-link to the relevant admin screen).

**Pattern to follow next time**
Android notification small-icons MUST be white-on-transparent silhouettes — anything else shows as a tinted square. Native config (icons, manifest, permissions) is NOT OTA-able; it needs a build. When adding a customer-facing "create" endpoint, wiring `notifyAdmins` is part of done — grep new `prisma.*.create` in customer-reachable controllers for a matching notify call.

---

### INC-041 — Language selector showed Arabic while the app rendered English; Save then flipped it (2026-06-20)

**Status:** Fixed (OTA group `fc9b4e8d-603d-435c-b12d-da85eef68d75`)
**Severity:** P2
**Touched:** `apps/mobile/app/profile/settings.tsx`
**Related:** —

**Symptom**
Opening Settings → Language showed Arabic as the selected option while the entire UI was in English. Pressing the global Save then switched the app to Arabic.

**Root cause**
The settings screen seeded its `language` state from `user.preferences.language` (server-cached, fetched via auth hydrate) instead of from the live `useLocale()` store that the whole app actually renders from. When the two diverged (server said `ar`, the live store was `en`), the selector displayed `ar` while everything rendered `en`, and the global Save persisted whatever the selector showed.

**Fix**
The selector now mirrors the **single source of truth** it renders from: `const activeLocale = useLocale((s) => s.locale)`, with `language` initialised from it and a `useEffect` keeping it synced. Removed the `setLanguage(prefs.language)` seeding from the prefs effect.

**Pattern to follow next time**
A control that displays "the current X" must read X from the same store the app renders X from — never from a second, lazily-hydrated copy (server prefs, a separate default). Two sources of truth for one user-visible setting is the bug.

---

### INC-042 — Customer "sell" listings stuck `pending` were invisible/unactionable in the admin Sales board (2026-06-20)

**Status:** Fixed (API restart + admin build + smoke 12o)
**Severity:** P1
**Touched:** `apps/api/src/modules/sales/controller.ts`, `apps/api/src/modules/sales/routes.ts`, `apps/admin/src/app/sales/page.tsx`
**Related:** INC-039

**Symptom**
A customer-submitted sale listing (created `pending`) showed nowhere in the admin Sales board, so the owner could neither approve nor reject it — it sat in limbo.

**Root cause**
`GET /api/sales` forces `where.status = "active"` unless an explicit status is passed by a staff caller — but that route has **no `authenticate` middleware**, so `req.user` is always undefined there and the `isStaff` branch was dead. The admin page hit that public route, so even selecting the "pending" filter still returned active-only. Pending listings were unreachable from admin entirely. The status was also mislabelled "Taken down".

**Fix**
Added a dedicated authed board endpoint `GET /api/sales/admin/all` (`authenticate` + `authorize("admin","staff")`) that returns every status with owner info — mirroring the existing `rental-listings/admin/all` pattern. Pointed the admin Sales page at it, relabelled `pending` → "Pending review", and gave the drawer explicit **Approve & publish** (`/restore` → active) and **Reject** (DELETE) actions. Public `/api/sales` stays active-only.

**Pattern to follow next time**
A moderation queue needs its own authenticated endpoint — don't overload the public list route and rely on `req.user` that the route never populates. If staff must see non-public statuses, add `authenticate` + an `/admin/...` route; the cached public path stays active-only.

---

### INC-043 — Support was one rolling chat, not discrete tickets; new requests showed old messages; staff replies were unlinked (2026-06-20)

**Status:** Fixed (migration `20260620120000_ticket_messages` + API restart + admin build + OTA `fc9b4e8d` + smoke 12n)
**Severity:** P1
**Touched:** `packages/db/prisma/schema.prisma` (+migration), `apps/api/src/modules/tickets/{controller,routes}.ts`, `packages/validators/src/index.ts`, `packages/types/src/index.ts`, `packages/api-client/src/index.ts`, `apps/mobile/app/support/tickets.tsx` + `tickets/[id].tsx` + new `tickets/new.tsx`, `apps/mobile/app/messages/index.tsx`, `apps/admin/src/app/tickets/[id]/page.tsx`, `packages/i18n/src/locales/{en,ar}/support.ts`
**Related:** INC-038

**Symptom**
Support behaved like a single continuous chat per user: starting a "new request" reopened the same conversation and showed all prior messages. Tickets and messages were conflated; the customer couldn't keep separate issues apart, and the model the staff replied into wasn't the ticket.

**Root cause**
Two disconnected systems. Customer "Contact support" called `findOrCreateSupportConversation`, which **reuses** the existing customer↔staff conversation (so old messages reappear). `SupportTicket` was metadata-only — it had **no messages relation at all** (the UI even read `ticket.message`, a field the DB never stored), and staff "replies" posted to the generic `/api/messages` conversation, unlinked from any ticket.

**Fix**
Gave tickets their own thread: new `TicketMessage` model (`ticket_messages`, additive migration) with `ticket.messages[]`. `POST /api/tickets` now creates the ticket **with** its opening message as the first thread entry (so each request is a fresh, history-free thread) and notifies the team; `GET /api/tickets/:id` includes the thread; new `POST /api/tickets/:id/messages` appends a reply (owner or staff), moves an open ticket → in-progress on a staff reply, and notifies the other party. Mobile: customer "Contact support" + the messages inbox now route to a new-request form (`tickets/new`); the detail screen renders the per-ticket thread with a reply box (staff controls gated by role). Admin detail renders the thread and replies via the ticket endpoint.

**Pattern to follow next time**
"Separate instances the staff respond to" = a parent row with a scoped child thread (`Ticket` → `TicketMessage`), created fresh per request. Never model discrete support requests as a found-or-created shared conversation — find-or-create is exactly what makes a new request show old history.

---

### INC-044 — Dark mode home: invisible dark-on-dark text (2026-06-20)

**Status:** Fixed (OTA group `fc9b4e8d-603d-435c-b12d-da85eef68d75`)
**Severity:** P2
**Touched:** `apps/mobile/components/{QuickAccessGrid,CategoryCircles,ContinueCard,RedeemSaveRow,ServicesRail,HomeSearchBar}.tsx`
**Related:** —

**Symptom**
In dark mode, chunks of the home screen text were invisible — dark text on the dark background.

**Root cause**
The app has a real theme system (`useTheme()` → `palette`), and the home page background respects it (`palette.bg` = `#02011F` in dark). But six home components hardcoded a `const INK = "#02011F"` ink color (and white card backgrounds) for their text — light-mode-only values. In dark mode that ink sits on the same-colour dark bg = invisible.

**Fix**
Made each offending component theme-aware: pull `palette` from `useTheme()` and apply `palette.text`/`palette.muted` to text and `palette.card`/`palette.hairline` to surfaces inline (kept the static stylesheets for layout). `INK` survives only where it's a legit opaque shadow colour. `Rail`/`SectionHeader`/`ListingCard` already did this correctly — used as the reference.

**Pattern to follow next time**
Any `Text`/surface on the home (or any themed) screen must take its colour from `useTheme().palette`, never a hardcoded hex. A literal `#02011F`/`#fff` colour in a component that renders over `palette.bg` is a dark-mode bug waiting to happen.

---

### INC-045 — App trapped on the boot loading screen when online (only bootable offline) (2026-06-20)

**Status:** Fixed (OTA — see deploy note)
**Severity:** P0 (owner couldn't open the app; thought it was compromised)
**Touched:** `apps/mobile/lib/auth-store.ts`, `apps/mobile/app/index.tsx`
**Related:** INC-030 (OTA boot), INC-013 (session/token)

**Symptom**
On launch the app sometimes sat forever on the boot loading screen — an animated `loading.webp` lockup that, upscaled, read as a "broken/pixelated mp4" appearing after the (SVG) `MobileIntro`. Online it never progressed; the **only** way in was to launch with WiFi/data OFF, get past it, then reconnect. Worse right after an OTA push (the background bundle download competed for bandwidth, making the boot request more likely to stall).

**Root cause**
`useAuth.hydrate()` did `await api.request("GET", "/api/users/me")` with **no timeout**, and `app/index.tsx` renders the loading splash while `initialized === false`. `initialized` is only set true inside hydrate's try/catch. A _stalled_ connection (online but the socket hangs — neither resolves nor rejects, unlike offline which rejects instantly) means the `await` never returns, so `initialized` stays false and the splash shows forever. Offline worked precisely because the request failed fast → the catch ran → `initialized` flipped true.

**Fix**
hydrate now arms a `setTimeout(() => set({ initialized: true }), 6000)` before the request and clears it in `finally`. The boot is always released within ~6s no matter what the network does; tokens are preserved and a late `/me` still fills in the user. Also swapped the alarming animated `loading.webp` for the crisp `brand-logo.png` lockup + a quiet `ActivityIndicator` on the brand-navy stage, so the boot screen reads as an intentional branded loader, never "broken."

**Pattern to follow next time**
Any `await` that gates first paint / a boot flag MUST have a ceiling — a stalled (not failed) socket is a different failure mode than offline and will hang an un-timed `await` indefinitely. Never let a single network call be the only thing that can flip an `initialized`/`ready` flag; back it with a timeout that fail-opens.

---

### INC-046 — "Session expired" immediately after a fresh login (2026-06-21)

**Status:** Fixed
**Severity:** P1 (registered users couldn't stay logged in; reported as "session expired and weird stuff")
**Touched:** `apps/api/src/modules/auth/session-revocation.ts`
**Related:** INC-013 (the session-revocation mechanism this refines)

**Symptom**
Users — especially right after an admin reset their password, or during the passwordless→set-credentials bootstrap — got bounced with "session expired" on the very next request, despite having just logged in successfully (the login itself returned a token). Surfaced by a new smoke assertion (set-credentials with a token minted just after an admin set-password) that 401'd reproducibly.

**Root cause**
`isSessionRevoked()` compared a **whole-second** JWT `iat` against a **millisecond** revocation marker: `iat * 1000 < Number(marker)`. `revokeUserSessions()` stamps `marker = Date.now()` (ms). When a revocation (admin password reset, disable, role change) and a subsequent login land in the same wall-clock second, the new token's `iat*1000` is the second floored to `.000`, while the marker carries the sub-second fraction (e.g. `.500`). So `…000 < …500` → the brand-new, post-revocation token is falsely judged "issued before revocation" and rejected. A 0–999 ms false-revocation window opened on every `revokeUserSessions` call.

**Fix**
Compare at second granularity: `iat < Math.floor(Number(marker) / 1000)`. A token is revoked only if issued in an _earlier second_ than the revocation — so a same-second post-reset login survives, while every genuinely-older token is still killed (the INC-013 guarantee holds). Refresh tokens are revoked immediately regardless, so the sub-second edge doesn't weaken the security intent.

**Pattern to follow next time**
When comparing a JWT `iat` (RFC 7519 — whole **seconds**) against a server clock, normalise both sides to the same unit/granularity. Mixing `iat*1000` with `Date.now()` ms is an off-by-sub-second trap that only bites under same-second races, so it sails through casual testing.

---

## How to add a new entry

1. Pick the next `INC-NNN` number (zero-padded, monotonic).
2. Copy the **Entry template** at the top of this file into the **Entries** section in date order.
3. Add a one-line row to the **Index** table.
4. Commit alongside the fix: `git add INCIDENTS.md <fix files> && git commit -m "fix(<scope>): <subject> (INC-NNN)"`.
5. Cross-link from related INCs via `**Related:** INC-MMM`.

**When to skip:** typo fixes, single-line CSS tweaks, dependency patch-bumps with no behaviour change, anything that took <10 min to diagnose and touched ≤2 files. Use judgement — the log is useful only if entries are signal, not noise.
