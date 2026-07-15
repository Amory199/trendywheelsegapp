import { Ionicons } from "@expo/vector-icons";
import { colors, type Palette } from "@trendywheels/ui-tokens";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useT } from "../lib/locale";
import { useTheme } from "../lib/use-theme";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number): string => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number): string => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * Month-grid range calendar for the booking date step. Greys out dates that
 * aren't bookable — in the past, on a weekday the vehicle isn't available
 * (availableDays), an admin blackout date (blockedDates), or a fully-booked date
 * (bookedDates). Tapping picks a start then an end; a range that would cross a
 * greyed date restarts the selection so every booked span is contiguous & valid.
 * Single-day = tap the same date twice (or continue with just a start).
 */
export function RentCalendar({
  availableDays,
  blockedDates,
  bookedDates,
  startDate,
  endDate,
  onSelect,
}: {
  availableDays: number[];
  blockedDates: string[];
  bookedDates: string[];
  startDate: string;
  endDate: string;
  onSelect: (start: string, end: string) => void;
}): JSX.Element {
  const { palette } = useTheme();
  const t = useT();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const today = new Date();
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const allowWeekdays = availableDays.length > 0 ? new Set(availableDays) : null;

  const isDisabled = (s: string, weekday: number): boolean =>
    s < todayIso ||
    (allowWeekdays ? !allowWeekdays.has(weekday) : false) ||
    blockedSet.has(s) ||
    bookedSet.has(s);

  const rangeHasDisabled = (a: string, b: string): boolean => {
    const start = new Date(`${a}T00:00:00Z`).getTime();
    const end = new Date(`${b}T00:00:00Z`).getTime();
    for (let ti = start; ti <= end; ti += 86_400_000) {
      const dt = new Date(ti);
      if (isDisabled(dt.toISOString().slice(0, 10), dt.getUTCDay())) return true;
    }
    return false;
  };

  const press = (s: string): void => {
    if (!startDate || (startDate && endDate)) {
      onSelect(s, "");
      return;
    }
    // start set, no end
    if (s < startDate) {
      onSelect(s, "");
      return;
    }
    if (rangeHasDisabled(startDate, s)) {
      onSelect(s, ""); // can't span a greyed date — restart from the tapped day
      return;
    }
    onSelect(startDate, s);
  };

  const canPrev = cursor.y > today.getFullYear() || cursor.m > today.getMonth();
  const prev = (): void => {
    if (!canPrev) return;
    setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  };
  const next = (): void =>
    setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));

  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const inRange = (s: string): boolean =>
    !!startDate && !!endDate && s >= startDate && s <= endDate;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={prev} hitSlop={8} disabled={!canPrev} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={canPrev ? palette.text : palette.border} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS[cursor.m]} {cursor.y}
        </Text>
        <Pressable onPress={next} hitSlop={8} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={palette.text} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <View key={`h${d}`} style={styles.cell}>
            <Text style={styles.dow}>{t(`rent.dow${d}` as Parameters<typeof t>[0])}</Text>
          </View>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={styles.cell} />;
          const s = iso(cursor.y, cursor.m, d);
          const weekday = new Date(cursor.y, cursor.m, d).getDay();
          const disabled = isDisabled(s, weekday);
          const isStart = s === startDate;
          const isEnd = s === endDate;
          const selected = isStart || isEnd;
          const between = inRange(s) && !selected;
          return (
            <View key={s} style={styles.cell}>
              <Pressable
                disabled={disabled}
                onPress={() => press(s)}
                style={[styles.day, between && styles.dayBetween, selected && styles.daySelected]}
              >
                <Text
                  style={[
                    styles.dayText,
                    disabled && styles.dayTextDisabled,
                    (selected || between) && styles.dayTextOn,
                  ]}
                >
                  {d}
                </Text>
                {disabled && !selected ? <View style={styles.strike} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.brand.friendlyBlue }]} />
          <Text style={styles.legendText}>{t("rent.legendSelected")}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.border }]} />
          <Text style={styles.legendText}>{t("rent.legendUnavailable")}</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: palette.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 10,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    navBtn: { padding: 4 },
    monthLabel: { color: palette.text, fontSize: 15, fontWeight: "800" },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
    dow: { color: palette.muted, fontSize: 11, fontWeight: "700" },
    day: {
      width: "84%",
      height: "84%",
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    dayBetween: { backgroundColor: `${colors.brand.friendlyBlue}2A`, borderRadius: 8 },
    daySelected: { backgroundColor: colors.brand.friendlyBlue },
    dayText: { color: palette.text, fontSize: 14, fontWeight: "600" },
    dayTextDisabled: { color: palette.border },
    dayTextOn: { color: "#fff", fontWeight: "800" },
    strike: {
      position: "absolute",
      width: "58%",
      height: 1,
      backgroundColor: palette.border,
      transform: [{ rotate: "-20deg" }],
    },
    legend: {
      flexDirection: "row",
      gap: 16,
      paddingTop: 10,
      paddingHorizontal: 4,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: palette.muted, fontSize: 11 },
  });
}
