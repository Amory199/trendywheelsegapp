module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "api",
        "mobile",
        "admin",
        "support",
        "inventory",
        "db",
        "types",
        "api-client",
        "validators",
        "ui-tokens",
        "ui-web",
        "ui-mobile",
        "i18n",
        "infra",
        "ci",
        "deps",
      ],
    ],
    "scope-empty": [1, "never"],
  },
};
