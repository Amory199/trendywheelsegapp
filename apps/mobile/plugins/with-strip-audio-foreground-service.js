// expo-audio ships an AndroidManifest that unconditionally declares a
// media-playback + microphone foreground service and their permissions:
//
//   FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, RECORD_AUDIO
//   + services AudioControlsService (mediaPlayback) / AudioRecordingService (microphone)
//
// We only use expo-audio for tiny in-app UI sound effects (lib/sounds.ts —
// createAudioPlayer + play()). We never enable background playback, a media
// session, lock-screen controls, or audio recording, so none of the above is
// used at runtime. But Google Play scans the *merged manifest*: the
// FOREGROUND_SERVICE_MEDIA_PLAYBACK permission triggers the "Foreground service
// permissions" policy declaration (which otherwise demands a justification
// video), and RECORD_AUDIO is a sensitive mic permission a marketplace app
// should never request.
//
// These come from the library's own manifest, not from a config-plugin option,
// so the only way to drop them is a Gradle manifest-merger `tools:node="remove"`
// marker in the app manifest. That instructs the merger to delete the matching
// nodes from the final APK/AAB manifest. Sound effects keep working — the
// normal playback path needs none of these.

const { withAndroidManifest } = require("@expo/config-plugins");

const TOOLS_NS = "http://schemas.android.com/tools";

const PERMISSIONS_TO_REMOVE = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.RECORD_AUDIO",
];

const SERVICES_TO_REMOVE = [
  "expo.modules.audio.service.AudioControlsService",
  "expo.modules.audio.service.AudioRecordingService",
];

module.exports = function withStripAudioForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // The `tools:` namespace must be declared on <manifest> for node="remove".
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = TOOLS_NS;

    // --- Remove permissions ---------------------------------------------
    manifest["uses-permission"] = manifest["uses-permission"] || [];
    for (const name of PERMISSIONS_TO_REMOVE) {
      // Drop any normally-merged entry we authored, then add the remove marker.
      manifest["uses-permission"] = manifest["uses-permission"].filter(
        (p) => p?.$?.["android:name"] !== name || p?.$?.["tools:node"] === "remove",
      );
      const already = manifest["uses-permission"].some(
        (p) => p?.$?.["android:name"] === name && p?.$?.["tools:node"] === "remove",
      );
      if (!already) {
        manifest["uses-permission"].push({
          $: { "android:name": name, "tools:node": "remove" },
        });
      }
    }

    // --- Remove the foreground services ---------------------------------
    const application = manifest.application?.[0];
    if (application) {
      application.service = application.service || [];
      for (const name of SERVICES_TO_REMOVE) {
        const already = application.service.some(
          (s) => s?.$?.["android:name"] === name && s?.$?.["tools:node"] === "remove",
        );
        if (!already) {
          application.service.push({
            $: { "android:name": name, "tools:node": "remove" },
          });
        }
      }
    }

    return cfg;
  });
};
