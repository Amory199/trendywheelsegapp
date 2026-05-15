import type { Metadata, Viewport } from "next";

import { ErrorReporter } from "../lib/error-reporter";
import { Providers } from "../lib/providers";
import { Shell } from "../lib/shell";
import { ServiceWorkerRegistrar } from "../lib/sw-registrar";

import "./globals.css";

export const metadata: Metadata = {
  title: "TrendyWheels — Cruise bold. Cruise trendy.",
  description:
    "Egypt's smartest resort mobility app. Rent, sell, and service your golf cart all in one place.",
  manifest: "/manifest.webmanifest",
  applicationName: "TrendyWheels",
  appleWebApp: {
    capable: true,
    title: "TrendyWheels",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#02011F",
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
        <ServiceWorkerRegistrar />
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
