import type { Metadata } from "next";

import { Providers } from "../lib/providers";
import { Shell } from "../lib/shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "TrendyWheels Admin",
  description: "TrendyWheels Admin Dashboard - Vehicle, booking, and user management",
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
