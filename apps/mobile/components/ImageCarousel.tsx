import { Image } from "expo-image";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

// Swipeable photo pager used by the buy/rent detail heroes. Native paging
// (momentum snap per photo) + tappable dot indicators. Horizontal, so it
// nests fine inside the vertical detail ScrollViews.
export function ImageCarousel({
  urls,
  width,
  height,
  fallback = "https://placehold.co/800x600/2B0FF8/FFFFFF?text=TrendyWheels",
}: {
  urls: string[];
  width: number;
  height: number;
  fallback?: string;
}): JSX.Element {
  const data = urls.length > 0 ? urls : [fallback];
  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIdx(Math.max(0, Math.min(next, data.length - 1)));
    },
    [width, data.length],
  );

  return (
    <View style={{ width, height }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height }}
            contentFit="cover"
            transition={250}
          />
        )}
      />
      {data.length > 1 && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 14,
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {data.map((_, i) => (
            <Pressable
              key={i}
              hitSlop={8}
              onPress={() => {
                listRef.current?.scrollToIndex({ index: i, animated: true });
                setIdx(i);
              }}
              style={{
                width: i === idx ? 26 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === idx ? "#fff" : "rgba(255,255,255,0.55)",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
