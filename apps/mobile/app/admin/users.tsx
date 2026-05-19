import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../lib/api";

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  accountType: "customer" | "staff" | "admin";
  staffRole?: string | null;
  status: string;
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "customer", label: "Customers" },
  { key: "staff", label: "Staff" },
  { key: "admin", label: "Admin" },
];

export default function AdminUsers(): JSX.Element {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const listQ = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const r = await api.adminListUsers();
      return (r.data ?? []) as AdminUser[];
    },
  });

  const filtered = (listQ.data ?? []).filter((u) => {
    if (filter !== "all" && u.accountType !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.text.secondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, phone, email"
          placeholderTextColor={colors.text.secondary}
          style={styles.search}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filter, filter === f.key && styles.filterActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {listQ.isLoading ? (
        <ActivityIndicator color={colors.brand.friendlyBlue} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120, gap: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={listQ.isFetching}
              onRefresh={() => listQ.refetch()}
              tintColor={colors.text.light}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No users match</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/admin/users/${item.id}`)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.name || item.phone).slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name || "(no name)"}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {item.phone}
                  {item.email ? ` · ${item.email}` : ""}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  item.accountType === "admin" && styles.badgeAdmin,
                  item.accountType === "staff" && styles.badgeStaff,
                ]}
              >
                <Text style={styles.badgeText}>{item.staffRole ?? item.accountType}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark.bg },
  header: { paddingTop: 72, paddingHorizontal: 18, paddingBottom: 10 },
  title: { color: colors.text.light, fontSize: 24, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: 10,
  },
  search: { flex: 1, color: colors.text.light, paddingVertical: 10 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterActive: {
    backgroundColor: colors.brand.friendlyBlue,
    borderColor: colors.brand.friendlyBlue,
  },
  filterText: { color: colors.text.secondary, fontSize: 12, fontWeight: "700" },
  filterTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.text.secondary, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.friendlyBlue + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text.light, fontWeight: "700" },
  name: { color: colors.text.light, fontSize: 14, fontWeight: "600" },
  sub: { color: colors.text.secondary, fontSize: 11 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.dark.bg,
  },
  badgeStaff: { backgroundColor: colors.brand.poolBlue + "33" },
  badgeAdmin: { backgroundColor: colors.brand.trendyPink + "33" },
  badgeText: {
    color: colors.text.light,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
