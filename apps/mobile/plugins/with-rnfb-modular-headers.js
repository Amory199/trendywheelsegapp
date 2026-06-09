// React Native Firebase v22+ ships its iOS modules as framework modules. Those
// modules import React-Core headers (RCTBridgeModule.h, RCTConvert.h,
// RCTEventEmitter.h), which Clang refuses with
// `-Wnon-modular-include-in-framework-module` under `-Werror`.
//
// Re-declaring React-Core in the Podfile to flip `:modular_headers => true`
// conflicts with Expo's autolinking (which already declares it with a local
// path source). `use_modular_headers!` globally is also ignored once the
// autolinking has run.
//
// Surgical fix: set `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES`
// on every Pod target build configuration via the existing post_install hook.
// This just tells the compiler not to treat that specific include as an error.

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# tw-rnfb-allow-non-modular marker";

module.exports = function withRNFBModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfile)) return cfg;
      let contents = fs.readFileSync(podfile, "utf8");
      if (contents.includes(MARKER)) return cfg;

      const snippet = [
        `    ${MARKER}`,
        `    installer.pods_project.targets.each do |target|`,
        `      target.build_configurations.each do |bc|`,
        `        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'`,
        `      end`,
        `    end`,
      ].join("\n");

      const re = /(post_install do \|installer\|\s*\n)/;
      if (re.test(contents)) {
        contents = contents.replace(re, `$1${snippet}\n`);
      } else {
        contents = contents.trimEnd() + `\n\npost_install do |installer|\n${snippet}\nend\n`;
      }

      fs.writeFileSync(podfile, contents);
      return cfg;
    },
  ]);
};
