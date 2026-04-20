import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrendyWheels Support",
  description: "Support agent dashboard - tickets, KB, and live chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
