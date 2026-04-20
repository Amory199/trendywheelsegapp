/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./base.js", "plugin:@next/next/recommended"],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    "@next/next/no-html-link-for-pages": "off",
  },
};
