import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — TrendyWheels",
  description:
    "TrendyWheels Privacy Policy. How we collect, use, store, and share your information.",
};

export default function PrivacyPage(): JSX.Element {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "48px 24px 96px",
        color: "#02011F",
        fontFamily: "'Source Sans 3', system-ui, sans-serif",
        lineHeight: 1.6,
      }}
    >
      <nav style={{ marginBottom: 32, fontSize: 13, color: "#6B6A85" }}>
        <Link href="/" style={{ color: "#2B0FF8", textDecoration: "none", fontWeight: 700 }}>
          ← Back to TrendyWheels
        </Link>
      </nav>
      <h1
        style={{
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 44,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: "#6B6A85", marginBottom: 32 }}>
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>

      <Section title="Who we are">
        TrendyWheels (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is a vehicle rental, sales, and repair platform
        operating in Egypt. We are reachable at{" "}
        <a href="mailto:privacy@trendywheelseg.com" style={{ color: "#2B0FF8" }}>
          privacy@trendywheelseg.com
        </a>
        .
      </Section>

      <Section title="What we collect">
        <ul style={{ paddingLeft: 20 }}>
          <li>Account information — phone number, name, email, profile photo (optional).</li>
          <li>Identity verification — driver&apos;s license photo for rentals, national ID (encrypted at rest).</li>
          <li>Booking, sales, and repair history.</li>
          <li>Device information — app version, OS, crash logs.</li>
          <li>Approximate location — for listing nearby vehicles (precise location only when you explicitly grant it during vehicle pickup).</li>
          <li>Payment details — processed by a payment provider; we never store card numbers.</li>
        </ul>
      </Section>

      <Section title="How we use your information">
        <ul style={{ paddingLeft: 20 }}>
          <li>Deliver the core service: fulfilling rentals, sales listings, repair requests.</li>
          <li>Verify your identity to prevent fraud and comply with Egyptian transport regulations.</li>
          <li>Communicate booking confirmations, reminders, and support replies.</li>
          <li>Improve the product — aggregate, anonymised usage analytics (Plausible, self-hosted).</li>
          <li>Prevent abuse — rate limiting, bot protection, security monitoring.</li>
        </ul>
        <p>We do not sell your data to third parties. Ever.</p>
      </Section>

      <Section title="Who we share with">
        <ul style={{ paddingLeft: 20 }}>
          <li>Vehicle owners and mechanics — only the information needed to complete your booking or repair (name, phone, booking reference).</li>
          <li>SMS and email providers — Twilio, SendGrid — for OTP codes and transactional messages.</li>
          <li>Crash reporting — Sentry, for diagnosing app crashes. IP addresses are truncated.</li>
          <li>Egyptian authorities — only when compelled by a lawful court order.</li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>At any time, you can:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>
            <b>Access</b> a JSON export of all your data — Profile → Settings → Export my data, or email us.
          </li>
          <li>
            <b>Correct</b> any field on your profile directly in the app.
          </li>
          <li>
            <b>Delete</b> your account — Profile → Settings → Delete account. We anonymise personally identifiable fields within 30 days and retain only what Egyptian law requires for tax and safety records.
          </li>
          <li>
            <b>Withdraw consent</b> for marketing emails from Settings → Notifications at any time.
          </li>
        </ul>
      </Section>

      <Section title="Data security">
        All data is transmitted over HTTPS. Sensitive fields (passwords, refresh tokens, ID photos) are encrypted at rest. We rotate keys quarterly and run automated dependency audits. If we ever experience a breach affecting your personal data, we will notify affected users within 72 hours.
      </Section>

      <Section title="Children">
        TrendyWheels is not intended for users under 18. We do not knowingly collect personal information from minors. If you believe a minor has submitted personal data to us, contact{" "}
        <a href="mailto:privacy@trendywheelseg.com" style={{ color: "#2B0FF8" }}>
          privacy@trendywheelseg.com
        </a>{" "}
        and we will delete it.
      </Section>

      <Section title="Changes to this policy">
        We may update this policy as the product evolves. Material changes will trigger an in-app notice and an email to your registered address. The &quot;Last updated&quot; date at the top of this page is always the source of truth.
      </Section>

      <Section title="Contact">
        <p>
          Questions? Email{" "}
          <a href="mailto:privacy@trendywheelseg.com" style={{ color: "#2B0FF8" }}>
            privacy@trendywheelseg.com
          </a>{" "}
          or write to TrendyWheels, Cairo, Egypt.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontFamily: "Anton, Impact, sans-serif",
          fontSize: 22,
          textTransform: "uppercase",
          letterSpacing: 0.3,
          marginBottom: 8,
          color: "#2B0FF8",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 15 }}>{children}</div>
    </section>
  );
}
