import { createContext, useContext, type ReactNode } from "react";
import {
  Easing,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

// Auto-hide tab bar context. Each scrollable tab screen calls
// useTabBarScrollHandler() and passes the result to its scroll component as
// onScroll. The shared translateY is read by _layout.tsx to slide the
// BottomTabBar off-screen on scroll-down and back on scroll-up.

// Snap distance (px) the bar travels off-screen. Slightly larger than the bar
// height itself so the bottom hairline disappears too.
const BAR_TRAVEL = 88;
// Commit threshold (px). Direction has to be consistent for this much before
// the bar snaps. Lowered from 12 -> 6 because Rent/Sell's CategoryStrip has
// little scroll runway (7 tiles flow in 4 rows) and the old threshold meant
// the auto-hide never fired on those tabs.
const COMMIT_PX = 6;

interface TabBarScrollContextValue {
  translateY: SharedValue<number>;
  // Raw scroll offset (px), written every frame. Read by the living aurora so
  // the background flow drifts with the user's swipe. Separate from translateY
  // (which is a debounced show/hide target) so the aurora tracks scroll 1:1.
  scrollY: SharedValue<number>;
}

const TabBarScrollContext = createContext<TabBarScrollContextValue | null>(null);

export function TabBarScrollProvider({ children }: { children: ReactNode }): JSX.Element {
  const translateY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  return (
    <TabBarScrollContext.Provider value={{ translateY, scrollY }}>
      {children}
    </TabBarScrollContext.Provider>
  );
}

export function useTabBarTranslate(): SharedValue<number> {
  const ctx = useContext(TabBarScrollContext);
  if (!ctx) throw new Error("useTabBarTranslate must be used within TabBarScrollProvider");
  return ctx.translateY;
}

// Null-safe: aurora is also mounted OUTSIDE the tabs provider (auth, admin,
// staff). Those screens just get ambient drift with no scroll parallax.
export function useAuroraScrollY(): SharedValue<number> | null {
  return useContext(TabBarScrollContext)?.scrollY ?? null;
}

export function useTabBarScrollHandler(): ReturnType<typeof useAnimatedScrollHandler> {
  const ctx = useContext(TabBarScrollContext);
  if (!ctx) throw new Error("useTabBarScrollHandler must be used within TabBarScrollProvider");
  const { translateY, scrollY } = ctx;
  const lastY = useSharedValue(0);
  const accumulated = useSharedValue(0);
  const direction = useSharedValue<0 | 1 | -1>(0);
  return useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      scrollY.value = y; // feed the living aurora
      const dy = y - lastY.value;
      lastY.value = y;

      // Near the top: always show the bar.
      if (y <= 8) {
        translateY.value = withTiming(0, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        });
        accumulated.value = 0;
        direction.value = 0;
        return;
      }

      // Direction change resets the accumulator.
      const nextDir: 0 | 1 | -1 = dy > 0 ? 1 : dy < 0 ? -1 : direction.value;
      if (nextDir !== 0 && nextDir !== direction.value) {
        accumulated.value = dy;
        direction.value = nextDir;
      } else {
        accumulated.value += dy;
      }

      // Commit once the user has moved enough in one direction.
      if (Math.abs(accumulated.value) > COMMIT_PX) {
        const target = direction.value === 1 ? BAR_TRAVEL : 0;
        if (target !== translateY.value) {
          translateY.value = withTiming(target, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
          });
        }
        accumulated.value = 0;
      }
    },
  });
}
