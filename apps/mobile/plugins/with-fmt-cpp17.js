// Disable fmt's consteval mode globally. React Native 0.79.x bundles fmt 11.0.2
// whose `basic_format_string` constructor is `consteval`. Xcode 16.2+ / Xcode 26
// rejects calls to this constructor with non-constexpr arguments coming from
// React / Folly / ReactCommon. Setting FMT_USE_CONSTEVAL=0 forces fmt to fall
// back to constexpr — solves the build without touching React Native source.
//
// We set it via GCC_PREPROCESSOR_DEFINITIONS on every Pod target so it applies
// to whichever pod actually includes the fmt headers, not just the fmt pod.
//
// Drop this plugin when we upgrade to Expo SDK 54+ (RN 0.80+ ships fixed fmt).

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# tw-fmt-no-consteval marker";

module.exports = function withFmtCpp17(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      if (!fs.existsSync(podfile)) return cfg;
      let contents = fs.readFileSync(podfile, "utf8");
      if (contents.includes(MARKER)) return cfg;

      const snippet = [
        `    ${MARKER}`,
        "    installer.pods_project.targets.each do |target|",
        "      target.build_configurations.each do |bc|",
        "        defs = bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']",
        "        defs = [defs] unless defs.is_a?(Array)",
        "        defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')",
        "        bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs",
        "      end",
        "    end",
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
