import { Ionicons } from "@expo/vector-icons";
import { isRTL } from "@trendywheels/i18n";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useLocale } from "../lib/locale";
import { useDisplay } from "../lib/typography";

const INK = "#02011F";

interface RailProps<T> {
  title: string;
  data: T[];
  keyExtractor: (item: T) => string;
  renderCard: (item: T) => JSX.Element;
  seeAllLabel: string;
  onSeeAll?: () => void;
  loading?: boolean;
  /** Hide the whole section when there's nothing to show and not loading. */
  hideWhenEmpty?: boolean;
}

/**
 * A titled, horizontally-scrolling section ("New arrivals → See all"). Powers
 * the home discovery feed. Generic over the item type so it carries products,
 * vehicles, or anything the caller renders into a card.
 */
export function Rail<T>({
  title,
  data,
  keyExtractor,
  renderCard,
  seeAllLabel,
  onSeeAll,
  loading,
  hideWhenEmpty = true,
}: RailProps<T>): JSX.Element | null {
  const locale = useLocale((s) => s.locale);
  const rtl = isRTL(locale);
  const display = useDisplay();

  if (!loading && hideWhenEmpty && data.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, display(0.3)]}>{title}</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={10} style={styles.seeAll}>
            <Text style={styles.seeAllText}>{seeAllLabel}</Text>
            <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={14} color={INK} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={INK} style={styles.loader} />
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => renderCard(item)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          initialNumToRender={4}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

function Separator(): JSX.Element {
  return <View style={{ width: 12 }} />;
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 22, color: INK },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontWeight: "700", color: INK },
  loader: { alignSelf: "flex-start", marginLeft: 24 },
  listContent: { paddingHorizontal: 16 },
});
