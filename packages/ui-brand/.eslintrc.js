module.exports = {
  root: true,
  extends: ["@trendywheels/eslint-config"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
