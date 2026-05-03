import type { Metadata } from "next";

import { ErrorReporter } from "../lib/error-reporter";
import { Providers } from "../lib/providers";
import { Shell } from "../lib/shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "TrendyWheels Inventory",
  description: "Inventory management — vehicle availability, maintenance, and alerts",
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Source+Sans+3:wght@300;400;500;600;700;800&family=Cairo:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>
          <>
            <ErrorReporter />
            <Shell>{children}</Shell>
          </>
        </Providers>
      </body>
    </html>
  );
}
