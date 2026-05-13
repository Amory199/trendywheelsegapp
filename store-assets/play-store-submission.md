# Google Play Console — TrendyWheels submission guide

**Goal:** get the app into **Internal testing** track today so the 14-day
testing-window counter starts. Internal testing is one click away from
Closed/Open testing → Production once the timer expires.

## Pre-flight checklist (what's ready)

| Item                     | Status                      | Source                                          |
| ------------------------ | --------------------------- | ----------------------------------------------- |
| Signed AAB (`.aab`)      | ⏳ Pending production build | EAS artifact URL — see § Production build below |
| App icon 512×512         | ✅                          | `store-assets/play-store-icon-512.png`          |
| Feature graphic 1024×500 | ✅                          | `store-assets/android-feature.png`              |
| Privacy policy URL       | ✅                          | https://app.trendywheelseg.com/legal/privacy    |
| Support URL              | ✅                          | https://app.trendywheelseg.com/support          |
| Account-deletion URL     | ✅                          | https://app.trendywheelseg.com/account/delete   |
| Package name             | ✅                          | `com.trendywheels.app`                          |
| App title (≤30 chars)    | ✅                          | `TrendyWheels`                                  |
| Short description (≤80)  | ✅                          | See below                                       |
| Full description (≤4000) | ✅                          | See below                                       |
| Phone screenshots (2–8)  | ⚠️ Take these now           | See § Screenshots below                         |

## Production build (run once the preview build proves boot works)

```bash
cd /opt/trendywheels/apps/mobile
EXPO_TOKEN=Yd1Q6otQiSc4fHQTFQs9c_i8tuMYgkytGh0IPOps eas build \
  --platform android \
  --profile production \
  --non-interactive --no-wait
```

The `production` profile in [apps/mobile/eas.json](apps/mobile/eas.json) already
sets `buildType: "app-bundle"` and `autoIncrement: true`. Output is a signed
`.aab` you'll upload to Play Console.

## Short description (≤80 chars)

> Rent, buy & service golf carts across Egypt's resort coast.

## Full description (≤4000 chars)

Paste this verbatim:

---

**TrendyWheels — Cruise bold. Cruise trendy.**

Egypt's smartest mobility app for golf carts. Whether you're a resort guest, a property owner, or just visiting for the weekend — TrendyWheels gets you from your villa to the beach without the hassle.

**🛒 Buy**
Browse new and used golf carts from premium brands — Club Car, E-Z-GO, Yamaha, Garia, Star EV. Filter by seating (4-seater, 6-seater, LED party carts), fuel type, and price. Photo-led product detail with image carousels, sticky checkout, optional trade-in credit.

**🚙 Rent**
Daily rentals from EGP 450 across Marassi, El Gouna, Sahel, Soma Bay, and North Coast. Real-time availability, instant booking confirmation, in-app pickup coordination. Half-day rentals available in select locations.

**💸 Sell**
Three paths in one place:
• Sell your cart outright through our marketplace
• List your cart for peer rentals (earn while you're not using it)
• Trade-in your old cart — submit photos + specs, get a quote in 24h, apply credit toward a new one

**🔧 Service**
• **Maintenance** — book a repair, track status in real time, photo timeline of work done
• **Transportation** — point-to-point golf-cart transport across resort towns

**🏆 Loyalty**
Earn TrendyPoints on every booking and purchase. Bronze → Silver → Gold → Platinum tiers unlock priority support, free delivery, and exclusive discounts.

**🛡️ Built for resort living**
• Fully bilingual — English and Arabic with RTL support
• Cash on pickup, card, or Instapay
• Driver's license verification once — then book in seconds
• Privacy-first: your data is encrypted in transit and at rest

**Support & privacy**
• Support: https://app.trendywheelseg.com/support
• Privacy policy: https://app.trendywheelseg.com/legal/privacy
• Account deletion: https://app.trendywheelseg.com/account/delete

Built in Egypt for Egypt's growing resort economy.

---

## Screenshots — take these now

Need **2 to 8 phone screenshots**. Minimum dimensions: 320×480 short side; recommended 1080×1920 or higher.

**Easiest path:** install the new APK (once the React-mismatch fix lands), then on the phone:

1. Cold-launch → land on phone-OTP screen → Power+VolumeDown
2. Enter OTP → land on home with carts → screenshot
3. Tap a cart → image-led detail → screenshot
4. Booking flow step 1 → screenshot
5. Sell landing (3 cards) → screenshot
6. Profile → screenshot

Save them to `store-assets/android-phone/` then upload to Play Console.

Optional but recommended:

- **Tablet screenshots** (7-inch or 10-inch): same flow on a tablet — boosts visibility on tablet searches.

## Step-by-step Play Console flow

### 1. Create the app

- https://play.google.com/console → "Create app"
- App name: `TrendyWheels`
- Default language: `English (United States)`
- App or game: **App**
- Free or paid: **Free**
- Accept Play Console policies and US export law

### 2. Set up your app (left rail → "Dashboard")

Complete each card in the "Set up your app" section:

1. **App access** — "All functionality is available without special access"
   _(We require OTP login but the OTP flow itself is open. If asked: provide a test phone number + we'll fill the OTP from API logs.)_
2. **Ads** — "No, my app does not contain ads"
3. **Content rating** — Start questionnaire. App category: "Reference, news, or educational" → all "No" answers → submit. Result: **Everyone** or **PEGI 3**.
4. **Target audience** — "18 and over" (cart rentals require driver's license)
5. **News app** — No
6. **COVID-19 contact tracing** — No
7. **Data safety** — Most important. See § Data safety below.
8. **Government apps** — No
9. **Financial features** — Yes, **Banking apps** is NO. Select "I host or process payments" → "Through a payment processor" (we use Paymob/Instapay later, no card storage). For now: check **"My app does not provide any financial features"** since we're cash-on-pickup at launch.

### 3. Data safety form (§ critical)

Match the privacy policy exactly:

**Data collection:** Yes, collected
**Data sharing:** No, not shared with third parties
**Security practices:**

- ✅ Data is encrypted in transit
- ✅ You can request that data be deleted

**Data types collected (mark each):**

| Category       | Type                 | Why collected                      | Required? |
| -------------- | -------------------- | ---------------------------------- | --------- |
| Personal info  | Name                 | Account, fulfilment                | Required  |
| Personal info  | Email                | Account, fulfilment, communication | Required  |
| Personal info  | Phone                | Account, fulfilment, communication | Required  |
| Personal info  | Address              | Pickup/delivery                    | Optional  |
| Personal info  | Photos               | Profile, license verification      | Required  |
| Personal info  | Other (license #)    | Identity verification              | Required  |
| Financial info | Payment info         | Process payments                   | Optional  |
| Location       | Approximate location | Show nearby carts                  | Optional  |
| App info       | App interactions     | Analytics, fraud prevention        | Required  |
| App info       | Crash logs           | Bug fixes                          | Required  |
| Device info    | Device IDs           | Push notifications, fraud          | Required  |

### 4. Internal testing release

Left rail → "Testing" → "Internal testing" → Create new release.

- **Release name:** auto-fill to "1 (1.0.0)"
- **App bundles:** upload the `.aab` from EAS
- **Release notes:** _"Initial internal-testing build. Golf-cart rental, sales, service across Egypt's resort coast."_
- **Save → Review → Start rollout to internal testing**

### 5. Add testers

- "Testers" tab → Create email list → add your team's Gmails (yourself, anyone you want testing)
- Internal testing is private — only the emails you add can install
- **Click the opt-in URL** shown after rollout, accept, then install via Play Store on the phone

## Verification (after submission)

1. ⏳ Build status in Play Console: "Available on internal testing"
2. ⏳ Opt-in URL works for each tester
3. ⏳ Tester can install the app from Play Store, app boots to phone-OTP
4. ⏳ Data safety form passes Play review (~hours, sometimes 1–2 days)

## After 14 days

Promote internal → closed testing (open to more emails) → open testing (public link) → production. Play requires a min of 12 testers for 14 continuous days _if your account was created after Nov 2023_.

For pre-Nov-2023 accounts the 14-day waiting requirement is waived for production — you may be able to go straight to production. Check your Play Console for the "Closed testing → Production" gate; it'll tell you.
