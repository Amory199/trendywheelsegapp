// React Native Firebase v22+ ships its iOS modules as framework modules with
// strict module-import verification. Under Xcode 26's Clang, RNFB's framework
// modules can't see RCTBridgeModule because React-Core isn't declared as a
// module — and we can't make it one without breaking Expo autolinking.
//
// The cleanest sidestep is the `$RNFirebaseAsStaticFramework = true` global
// flag (documented in the React Native Firebase iOS install guide). When set,
// the RNFB Podspecs link as a static framework and skip the modular umbrella
// header verification — RCTBridgeModule is then included via the regular
// header search path, not as a module import.
//
// We inject this at the top of the Podfile via a dangerous mod, plus keep
// the -Wno-error / non-modular-include allowances as a belt-and-suspenders
// fallback in case the static framework path still emits warnings.

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const HEAD_MARKER = "# tw-rnfb-static-framework marker";
const POST_MARKER = "# tw-rnfb-warning-fix marker";

module.exports = function withRNFBModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfile)) return cfg;
      let contents = fs.readFileSync(podfile, "utf8");

      if (!contents.includes(HEAD_MARKER)) {
        contents = `${HEAD_MARKER}\n$RNFirebaseAsStaticFramework = true\n\n${contents}`;
      }

      if (!contents.includes(POST_MARKER)) {
        const snippet = [
          `    ${POST_MARKER}`,
          `    installer.pods_project.targets.each do |target|`,
          `      next unless target.name.start_with?('RNFB')`,
          `      target.build_configurations.each do |bc|`,
          `        bc.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'`,
          `        bc.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'`,
          `        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'`,
          `        bc.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'`,
          `        bc.build_settings['CLANG_WARN_IMPLICIT_INT'] = 'NO'`,
          `        bc.build_settings['CLANG_WARN_STRICT_PROTOTYPES'] = 'NO'`,
          `        bc.build_settings['DEFINES_MODULE'] = 'NO'`,
          `        bc.build_settings['WARNING_CFLAGS'] = '$(inherited) -Wno-implicit-int -Wno-non-modular-include-in-framework-module -Wno-error'`,
          `        bc.build_settings['OTHER_CFLAGS'] = '$(inherited) -Wno-error'`,
          `      end`,
          `    end`,
        ].join("\n");

        const re = /(post_install do \|installer\|\s*\n)/;
        if (re.test(contents)) {
          contents = contents.replace(re, `$1${snippet}\n`);
        } else {
          contents = contents.trimEnd() + `\n\npost_install do |installer|\n${snippet}\nend\n`;
        }
      }

      fs.writeFileSync(podfile, contents);
      return cfg;
    },
  ]);
};
