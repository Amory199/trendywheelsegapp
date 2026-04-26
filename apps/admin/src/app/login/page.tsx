"use client";

import { TWLogoLockup } from "@trendywheels/ui-brand/web";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { writeTokens } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const { hydrate } = useAuth();
  const [email, setEmail] = useState("admin@trendywheelseg.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Invalid email or password");
      }
      const data = (await res.json()) as { token: string; refreshToken: string };
      writeTokens({ token: data.token, refreshToken: data.refreshToken });
      await hydrate();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.shell}>
      {/* Hero panel */}
      <div style={styles.hero}>
        <div style={styles.heroPattern} />
        <div style={styles.heroPink} />
        <div style={styles.heroContent}>
          <div style={{ marginBottom: 48 }}>
            <TWLogoLockup size={42} color="#FFFFFF" />
          </div>
          <h1 style={styles.heroTitle}>
            Run<br />TrendyWheels<span style={{ color: colors.brand.trendyPink }}>.</span>
          </h1>
          <p style={styles.heroSub}>
            Manage every booking, vehicle, and customer in one place.
          </p>
          <div style={styles.heroFooter}>
            <span style={styles.heroFooterDot} />
            <span>Operations command centre · Cairo HQ</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div style={styles.formPanel}>
        <div style={styles.formInner}>
          <div style={{ marginBottom: 28 }}>
            <span style={styles.eyebrow}>ADMIN ACCESS</span>
            <h2 style={styles.formTitle}>Sign in</h2>
            <p style={styles.formSub}>Welcome back. Enter your credentials to continue.</p>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              right={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={styles.eye}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁" : "🙈"}
                </button>
              }
            />

            {error ? <div style={styles.error}>{error}</div> : null}

            <button type="submit" disabled={loading} style={styles.submit}>
              {loading ? "Signing in…" : "Sign in"}
              <span style={styles.submitArrow}>→</span>
            </button>
          </form>

          <div style={styles.footnote}>
            Trouble signing in? <a href="mailto:support@trendywheelseg.com" style={styles.link}>Contact support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  right,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  right?: React.ReactNode;
}): JSX.Element {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={styles.fieldLabel}>{label}</span>
      <div style={styles.fieldWrap}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          style={styles.input}
        />
        {right ?? null}
      </div>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    background: "#F7F7FB",
  },
  hero: {
    flex: "1 1 55%",
    minHeight: "100vh",
    background: `linear-gradient(135deg, ${colors.brand.friendlyBlue} 0%, ${colors.brand.trustWorth} 100%)`,
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    padding: "56px 60px 48px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  heroPattern: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "repeating-linear-gradient(-20deg, transparent 0 40px, rgba(255,255,255,0.04) 40px 41px)",
    pointerEvents: "none",
  },
  heroPink: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 80% 30%, rgba(255,0,101,0.32), transparent 55%)",
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    justifyContent: "space-between",
  },
  heroTitle: {
    fontFamily: "Anton, Impact, system-ui, sans-serif",
    fontSize: "clamp(48px, 6vw, 96px)",
    lineHeight: 0.95,
    letterSpacing: "0.01em",
    textTransform: "uppercase",
    margin: 0,
    color: "#fff",
  },
  heroSub: {
    marginTop: 18,
    fontSize: 17,
    lineHeight: 1.55,
    color: "rgba(255,255,255,0.78)",
    maxWidth: 460,
  },
  heroFooter: {
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 12,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.6)",
    fontWeight: 700,
  },
  heroFooterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    background: colors.brand.trendyPink,
    boxShadow: `0 0 0 4px rgba(255,0,101,0.18)`,
  },
  formPanel: {
    flex: "1 1 45%",
    minWidth: 360,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  formInner: { width: "100%", maxWidth: 380 },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: colors.brand.trendyPink,
  },
  formTitle: {
    fontFamily: "Anton, Impact, system-ui, sans-serif",
    fontSize: 44,
    margin: "8px 0 6px",
    color: colors.brand.trustWorth,
    letterSpacing: "0.01em",
    textTransform: "uppercase",
    lineHeight: 1,
  },
  formSub: { fontSize: 14, color: "#6B6A85", margin: 0 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#4B4A6B",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  fieldWrap: {
    display: "flex",
    alignItems: "center",
    background: "#F4F4F7",
    borderRadius: 12,
    border: "1px solid #E8E8EE",
    padding: "0 14px",
    height: 48,
    transition: "border-color 180ms cubic-bezier(.2,.7,.3,1), box-shadow 180ms cubic-bezier(.2,.7,.3,1)",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    fontFamily: "inherit",
    color: colors.brand.trustWorth,
    height: "100%",
  },
  eye: {
    background: "transparent",
    border: "none",
    fontSize: 16,
    cursor: "pointer",
    padding: 4,
    color: "#6B6A85",
  },
  error: {
    fontSize: 13,
    color: colors.brand.ultraRed,
    background: "rgba(255,0,0,0.08)",
    border: `1px solid rgba(255,0,0,0.18)`,
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 500,
  },
  submit: {
    height: 48,
    borderRadius: 12,
    border: "none",
    background: colors.brand.friendlyBlue,
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    transition: "transform 160ms cubic-bezier(.2,.7,.3,1), box-shadow 180ms",
    boxShadow: `0 6px 18px ${colors.brand.friendlyBlue}33`,
  },
  submitArrow: { fontSize: 16, fontWeight: 400 },
  footnote: {
    marginTop: 24,
    fontSize: 13,
    color: "#6B6A85",
    textAlign: "center",
  },
  link: { color: colors.brand.friendlyBlue, fontWeight: 700, textDecoration: "none" },
};
