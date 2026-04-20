"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./auth-store";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/bookings", label: "Bookings" },
  { href: "/sales", label: "Sales" },
  { href: "/repairs", label: "Repairs" },
  { href: "/users", label: "Users" },
];

export function Shell({ children }: { children: React.ReactNode }): JSX.Element | null {
  const router = useRouter();
  const path = usePathname();
  const { user, initialized, hydrate, logout } = useAuth();

  useEffect(() => {
    if (!initialized) void hydrate();
  }, [initialized, hydrate]);

  useEffect(() => {
    if (initialized && !user && path !== "/login") router.replace("/login");
  }, [initialized, user, path, router]);

  if (path === "/login") return <>{children}</>;
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 bg-gradient-to-b from-purple-700 to-purple-900 text-white p-6 flex flex-col">
        <div className="text-xl font-bold mb-8">TrendyWheels</div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => {
            const active = path === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  active ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-white/10 pt-4 text-sm">
          <div className="opacity-75 truncate">{user.name}</div>
          <button
            onClick={() => {
              void logout();
              router.replace("/login");
            }}
            className="mt-2 text-xs opacity-80 hover:opacity-100 underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
