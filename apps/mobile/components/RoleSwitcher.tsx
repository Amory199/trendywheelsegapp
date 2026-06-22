import { Ionicons } from "@expo/vector-icons";
import { colors } from "@trendywheels/ui-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../lib/auth-store";
import { useT } from "../lib/locale";

// Admin-only "View as" control. Lets a real admin assume a customer/staff role
// (with that role's actual permissions) without logging out. Renders nothing
// for non-admins. The matching ActingBanner provides the exit.
type Option = { key: string; role: "customer" | "staff"; staffRole?: string; home: string };

// Staff is a single unified role in this product — one staff member does CRM,
// inventory, support and repairs. So "view as" offers just Customer + Staff
// (admin is the viewer). Staff assumes the canonical "sales" staffRole, which
// the nav now treats as full operational access.
const OPTIONS: Option[] = [
  { key: "customer", role: "customer", home: "/(tabs)" },
  { key: "staff", role: "staff", staffRole: "sales", home: "/crm/pipeline" },
];

export function RoleSwitcher(): JSX.Element | null {
  const user = useAuth((s) => s.user);
  const assumeRole = useAuth((s) => s.assumeRole);
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Only a REAL admin (not an admin already acting) sees this.
  if (user?.accountType !== "admin" || user?.actingAsAdminId) return null;

  const pick = async (o: Option): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await assumeRole(o.role, o.staffRole);
      setOpen(false);
      router.replace(o.home as never);
    } catch {
      Alert.alert(t("roleSwitch.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Ionicons name="swap-horizontal" size={18} color="#fff" />
        <Text style={styles.triggerText}>{t("roleSwitch.viewAs")}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{t("roleSwitch.viewAs")}</Text>
            <Text style={styles.subtitle}>{t("roleSwitch.subtitle")}</Text>
            {OPTIONS.map((o) => (
              <Pressable
                key={o.key}
                style={[styles.option, busy && styles.optionDisabled]}
                disabled={busy}
                onPress={() => void pick(o)}
              >
                <Text style={styles.optionText}>{t(`roleSwitch.${o.key}` as never)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
              </Pressable>
            ))}
            <Pressable style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>{t("roleSwitch.cancel")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.brand.friendlyBlue,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  triggerText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 8,
  },
  title: { color: colors.text.light, fontSize: 18, fontWeight: "800" },
  subtitle: { color: colors.text.secondary, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.dark.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionDisabled: { opacity: 0.5 },
  optionText: { color: colors.text.light, fontSize: 15, fontWeight: "600" },
  cancel: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  cancelText: { color: colors.text.secondary, fontSize: 15, fontWeight: "600" },
});
