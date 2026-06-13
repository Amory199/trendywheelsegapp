// Labeled text-input field used on the lead-detail "Details" tab. Wraps a
// native TextInput in the shared card style so the screen body stays free
// of styling boilerplate.

import { useMemo } from "react";
import { Text, TextInput, View } from "react-native";

import { useTheme } from "../../lib/use-theme";

import { makeStyles } from "./styles";

export function DetailField({
  label,
  value,
  onChange,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  multiline?: boolean;
}): React.JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        placeholderTextColor={palette.muted}
        style={[styles.noteInput, multiline ? { minHeight: 80 } : { minHeight: 0, paddingTop: 4 }]}
      />
    </View>
  );
}
