import type { Metadata, Viewport } from "next";
import type { JSX } from "react";

import { ChunkReloader } from "../lib/chunk-reloader";
import { ErrorReporter } from "../lib/error-reporter";
import { GlobalTourMounter } from "../lib/global-tour-mounter";
import { Providers } from "../lib/providers";
import { Shell } from "../lib/shell";
import { ServiceWorkerRegistrar } from "../lib/sw-registrar";

import "./globals.css";

export const metadata: Metadata = {
  title: "TrendyWheels Admin",
  description: "TrendyWheels Admin Dashboard - Vehicle, booking, and user management",
  manifest: "/manifest.webmanifest",
  applicationName: "TW Admin",
  appleWebApp: {
    capable: true,
    title: "TW Admin",
    statusBarStyle: "black-translucent",
  },
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
        {/* Intro overlay intentionally NOT mounted on the internal admin/staff
            console: the session-scoped brand animation replayed on every new
            tab/login and on chunk-recovery reloads (read as a "looping logo").
            The customer-facing app keeps its branded intro. (INC-057) */}
        <ChunkReloader />
        <ServiceWorkerRegistrar />
        <Providers>
          <ErrorReporter />
          <GlobalTourMounter />
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
