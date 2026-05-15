const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// CRITICAL: lock `react` + `react/jsx-runtime` to mobile's local copy.
// Without this, any transitive dep resolving from workspaceRoot/node_modules
// can grab the React 18 that lives in the pnpm store (used by Next.js web
// apps). The "older version of React was rendered" hang on Android maps
// directly to that — Hermes blows up before the first paint.
const reactPath = path.resolve(projectRoot, "node_modules/react");
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: reactPath,
  "react/jsx-runtime": path.join(reactPath, "jsx-runtime.js"),
  "react/jsx-dev-runtime": path.join(reactPath, "jsx-dev-runtime.js"),
};

// Belt-and-braces: a resolveRequest hook so EVERY variant of the "react"
// specifier (bare, with subpath) lands on the same on-disk path no matter
// where the import comes from.
const reactRedirects = {
  react: path.join(reactPath, "index.js"),
  "react/jsx-runtime": path.join(reactPath, "jsx-runtime.js"),
  "react/jsx-dev-runtime": path.join(reactPath, "jsx-dev-runtime.js"),
};
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (reactRedirects[moduleName]) {
    return { type: "sourceFile", filePath: reactRedirects[moduleName] };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
