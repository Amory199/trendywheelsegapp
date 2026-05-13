import { TWLogoLockup } from "@trendywheels/ui-brand/web";

export const metadata = {
  title: "Privacy Policy — TrendyWheels",
  description: "How TrendyWheels collects, uses, and protects your data.",
};

const LAST_UPDATED = "2026-05-13";

export default function PrivacyPolicyPage(): JSX.Element {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#02011F",
        color: "#fff",
        padding: "48px 24px 96px",
        fontFamily: "Source Sans 3, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <a href="/" style={{ display: "inline-block", marginBottom: 32, textDecoration: "none" }}>
          <TWLogoLockup size={36} color="#fff" />
        </a>
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".18em",
            opacity: 0.45,
            marginBottom: 12,
          }}
        >
          Last updated · {LAST_UPDATED}
        </div>
        <h1
          style={{
            fontFamily: "Anton, sans-serif",
            fontSize: 48,
            lineHeight: 1.05,
            marginBottom: 24,
            letterSpacing: ".01em",
          }}
        >
          Privacy Policy
        </h1>

        <p style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.7, marginBottom: 32 }}>
          TrendyWheels ("we", "us") operates a golf-cart rental, sales, and service platform across
          Egypt's North Coast, Red Sea, and Greater Cairo. This policy explains what data we
          collect, why we collect it, how long we keep it, and the rights you have over it. It
          applies to the TrendyWheels mobile app, the website at app.trendywheelseg.com, and any
          related staff dashboards.
        </p>

        <Section title="Data we collect">
          <p>
            <strong>You give us:</strong> name, phone number, email, date of birth, profile photo,
            driver's-license number + photo, government-ID photo (for cart purchases above EGP
            100,000), payment details (handled by our payment processor — we never store full card
            numbers), home + pickup addresses, your messages with our support team.
          </p>
          <p>
            <strong>We collect automatically:</strong> device model and OS version, app version,
            crash reports, approximate location (city level, only when the app is in the
            foreground), in-app actions (browsing carts, completing a booking) to improve the
            product.
          </p>
        </Section>

        <Section title="Why we use it">
          <ul>
            <li>Fulfil rentals, sales, repairs, and transport you book</li>
            <li>Verify your identity and driver's licence before handing over a cart</li>
            <li>Process payments through our payment partner</li>
            <li>Send booking confirmations, reminders, and service updates (SMS, email, push)</li>
            <li>Reply to support requests</li>
            <li>Fix bugs and improve the app using anonymous usage stats</li>
            <li>Meet Egyptian tax + transport-licensing requirements</li>
          </ul>
        </Section>

        <Section title="Who we share it with">
          <p>
            We don't sell your data. We share the minimum necessary with: our payment partner (for
            card transactions), Google Firebase (push notifications + crash reports), Sentry
            (anonymous crash reports), the cart's pickup location operator (your name + phone, so
            they can hand the cart over), and Egyptian tax authorities (anonymized booking + sale
            records, as required by law).
          </p>
        </Section>

        <Section title="How long we keep it">
          <ul>
            <li>Account profile, addresses, photos — until you delete your account</li>
            <li>Booking + sale records — 7 years (Egyptian tax retention)</li>
            <li>Anonymized analytics — up to 26 months</li>
            <li>Support messages — 3 years</li>
            <li>Crash reports — 90 days</li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>You have the right to:</p>
          <ul>
            <li>
              <strong>See your data</strong> — email{" "}
              <a href="mailto:privacy@trendywheelseg.com" style={{ color: "#A9F453" }}>
                privacy@trendywheelseg.com
              </a>{" "}
              and we'll send a JSON export within 30 days
            </li>
            <li>
              <strong>Correct your data</strong> — edit it directly in the app, or email us
            </li>
            <li>
              <strong>Delete your account</strong> — use{" "}
              <a href="/account/delete" style={{ color: "#A9F453" }}>
                app.trendywheelseg.com/account/delete
              </a>{" "}
              or email{" "}
              <a href="mailto:privacy@trendywheelseg.com" style={{ color: "#A9F453" }}>
                privacy@trendywheelseg.com
              </a>{" "}
              — done within 30 days
            </li>
            <li>
              <strong>Withdraw consent</strong> for push notifications and marketing email in the
              app settings
            </li>
          </ul>
        </Section>

        <Section title="Security">
          <p>
            All data in transit is encrypted (HTTPS, TLS 1.2+). Driver's-license and ID photos are
            stored encrypted at rest with access restricted to our verification team. We follow
            standard hardening practices and run security reviews on every release.
          </p>
        </Section>

        <Section title="Children">
          <p>
            TrendyWheels is for users 18 and over. We don't knowingly collect data from anyone under
            18; if you believe we have, contact us and we'll delete it.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we materially change this policy, we'll show you a notice in the app and email
            registered users. The "Last updated" date at the top always reflects the latest version.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Data controller: <strong>TrendyWheels Egypt</strong> · Marassi Marina, Sidi Abdelrahman,
            Egypt
            <br />
            Privacy contact:{" "}
            <a href="mailto:privacy@trendywheelseg.com" style={{ color: "#A9F453" }}>
              privacy@trendywheelseg.com
            </a>
            <br />
            Support:{" "}
            <a href="/support" style={{ color: "#A9F453" }}>
              app.trendywheelseg.com/support
            </a>
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontFamily: "Anton, sans-serif",
          fontSize: 22,
          marginBottom: 12,
          letterSpacing: ".02em",
          color: "#FF0065",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 15, opacity: 0.78, lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}
