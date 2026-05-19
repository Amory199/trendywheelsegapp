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
const BAR_TRAVEL = 96;
// Commit threshold (px). Direction has to be consistent for this much before
// the bar snaps. Prevents jitter on flicks that briefly reverse.
const COMMIT_PX = 12;

interface TabBarScrollContextValue {
  translateY: SharedValue<number>;
}

const TabBarScrollContext = createContext<TabBarScrollContextValue | null>(null);

export function TabBarScrollProvider({ children }: { children: ReactNode }): JSX.Element {
  const translateY = useSharedValue(0);
  return (
    <TabBarScrollContext.Provider value={{ translateY }}>{children}</TabBarScrollContext.Provider>
  );
}

export function useTabBarTranslate(): SharedValue<number> {
  const ctx = useContext(TabBarScrollContext);
  if (!ctx) throw new Error("useTabBarTranslate must be used within TabBarScrollProvider");
  return ctx.translateY;
}

export function useTabBarScrollHandler(): ReturnType<typeof useAnimatedScrollHandler> {
  const translateY = useTabBarTranslate();
  const lastY = useSharedValue(0);
  const accumulated = useSharedValue(0);
  const direction = useSharedValue<0 | 1 | -1>(0);
  return useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
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
