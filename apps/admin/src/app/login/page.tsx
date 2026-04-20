"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api, writeTokens } from "../../lib/api";
import { useAuth } from "../../lib/auth-store";

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const { hydrate } = useAuth();
  const [email, setEmail] = useState("admin@trendywheelseg.com");
  const [password, setPassword] = useState("");
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
        throw new Error(body.message ?? "Login failed");
      }
      const data = (await res.json()) as { token: string; refreshToken: string };
      writeTokens({ token: data.token, refreshToken: data.refreshToken });
      // Force re-hydrate user
      await hydrate();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
    void api;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-900">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-900">TrendyWheels Admin</h1>
        <p className="text-sm text-gray-500">Sign in to your account</p>

        <label className="block text-sm font-medium text-gray-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block text-sm font-medium text-gray-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-700 hover:bg-purple-800 text-white font-medium py-2 rounded-md disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-xs text-gray-400 text-center">
          Demo: admin@trendywheelseg.com / Admin@123!
        </p>
      </form>
    </div>
  );
}
