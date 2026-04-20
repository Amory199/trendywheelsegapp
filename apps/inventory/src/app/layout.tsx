import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrendyWheels Inventory",
  description: "Fleet management, maintenance tracking, and vehicle lifecycle",
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
