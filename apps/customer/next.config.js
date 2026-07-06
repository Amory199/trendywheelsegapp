/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@trendywheels/ui-tokens",
    "@trendywheels/types",
    "@trendywheels/validators",
    "@trendywheels/api-client",
    "@trendywheels/i18n",
  ],
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      // Apple fetches the (extensionless) AASA and expects application/json.
      // Next would otherwise serve the public/ file as octet-stream.
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
  async redirects() {
    return [
      // Short aliases for legal pages — App Store reviewers + older mobile
      // builds sometimes hit /privacy or /delete instead of the canonical
      // /legal/privacy and /account/delete paths.
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
      { source: "/delete", destination: "/account/delete", permanent: true },
      { source: "/account-deletion", destination: "/account/delete", permanent: true },
    ];
  },
};

module.exports = nextConfig;
