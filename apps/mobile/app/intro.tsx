import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useT } from "../lib/locale";

// Brand intro reel played once on cold launch. Falls through to /(tabs) or
// /(auth)/phone via the index route after the video ends, the user taps Skip,
// or a safety timeout fires (video failed to load).

const INTRO_SRC = require("../assets/intro.mp4");
const SAFETY_TIMEOUT_MS = 9500;

export default function Intro(): JSX.Element {
  const router = useRouter();
  const t = useT();
  const dismissedRef = useRef(false);

  const player = useVideoPlayer(INTRO_SRC, (p) => {
    p.muted = true;
    p.loop = false;
    p.play();
  });

  function dismiss(): void {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    router.replace("/");
  }

  useEffect(() => {
    const safety = setTimeout(dismiss, SAFETY_TIMEOUT_MS);
    const sub = player.addListener("playToEnd", dismiss);
    return () => {
      clearTimeout(safety);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        surfaceType="textureView"
      />
      <Pressable onPress={dismiss} style={styles.skip} hitSlop={12}>
        <Text style={styles.skipText}>{t("home.skip")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#02011F",
  },
  skip: {
    position: "absolute",
    right: 16,
    bottom: 32,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  skipText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
