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
};

module.exports = nextConfig;
