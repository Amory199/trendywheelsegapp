const { tailwindPreset } = require("@trendywheels/ui-tokens/src/index");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { ...tailwindPreset.theme.extend } },
  plugins: [],
};
