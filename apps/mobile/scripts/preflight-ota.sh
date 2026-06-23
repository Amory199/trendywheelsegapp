#!/usr/bin/env bash
# Pre-OTA safety gate. Run BEFORE `eas update --branch production`.
#
# Catches the single most dangerous OTA mistake (see INCIDENTS / the launch
# audit): shipping a NATIVE module over-the-air. A native import that isn't in
# the installed binary crashes every old-build device on load, BEFORE Sentry
# initializes, so the crash is invisible. These modules require a fresh native
# build (eas build) + an app.config.js `version` bump — never an OTA.
#
# This duplicates the eslint `no-restricted-imports` rule on purpose: eslint can
# be skipped, but this hard-fails the publish. Exit non-zero blocks the deploy.
set -euo pipefail

cd "$(dirname "$0")/.."

# Native modules that must NEVER reach a device via OTA — only via a native build.
BANNED='react-native-maps|expo-location|expo-task-manager|expo-background-fetch|react-native-geolocation-service|@react-native-community/geolocation'

echo "→ Preflight: scanning app/ lib/ components/ for native-only imports…"
# Match real import/require of a banned module; ignore comments and node_modules.
HITS=$(grep -rnE "(from[[:space:]]+['\"](${BANNED})['\"]|require\(['\"](${BANNED})['\"]\))" \
  app lib components 2>/dev/null | grep -vE '^\s*//' || true)

if [ -n "$HITS" ]; then
  echo "✖ BLOCKED: native-only module imported — this CANNOT ship via OTA:" >&2
  echo "$HITS" >&2
  echo "" >&2
  echo "  These need a native build (eas build) + an app.config.js version bump." >&2
  echo "  Shipping them over-the-air crash-loops every old-binary device (invisible to Sentry)." >&2
  exit 1
fi

VERSION=$(grep -m1 'version:' app.config.js | sed -E "s/.*version:[[:space:]]*['\"]([^'\"]+)['\"].*/\1/")
echo "✓ No native-only imports found."
echo "  app version / runtimeVersion = ${VERSION} (OTA targets binaries built at this version)."
echo "  If you ADDED a native dependency, you must bump this version and run a native build, not an OTA."
echo "✓ Preflight passed — safe to eas update."
