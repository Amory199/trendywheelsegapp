import type { Metadata } from "next";

import { Providers } from "../lib/providers";
import { Shell } from "../lib/shell";

import "./globals.css";

export const metadata: Metadata = {
  title: "TrendyWheels — Drive bold. Drive trendy.",
  description: "Egypt's smartest mobility app. Rent, sell, and service your car all in one place.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232B0FF8'/><circle cx='24' cy='9' r='3' fill='%23FF0065'/><text x='5' y='23' font-family='Impact,Anton,sans-serif' font-size='18' fill='%23fff'>tw</text></svg>",
  },
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
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
