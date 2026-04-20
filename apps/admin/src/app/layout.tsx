import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "TrendyWheels Admin",
  description: "TrendyWheels Admin Dashboard - Vehicle, booking, and user management",
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
