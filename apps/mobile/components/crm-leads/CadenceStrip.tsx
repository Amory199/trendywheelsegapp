// Three-chip cadence strip: calls / messages / next-call-deadline. Each chip
// turns red when the sales agent is at risk of busting the SLA defined in
// CrmRules. Used at the top of the lead-detail screen.

import { useMemo } from "react";
import { Text, View } from "react-native";

import { useTheme } from "../../lib/use-theme";

import { makeStyles } from "./styles";

export interface CrmRules {
  firstCallWithinMinutes: number;
  followUpCallWithinHours: number;
  maxCallsBeforeReassign: number;
  requireMessageAfterCall: boolean;
}

export function CadenceStrip({
  calls,
  messages,
  lastCallAt,
  rules,
}: {
  calls: number;
  messages: number;
  lastCallAt: string | null;
  rules: CrmRules;
}): React.JSX.Element {
  const { palette } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const callsBad = calls >= rules.maxCallsBeforeReassign;
  const msgsBad = messages >= rules.maxCallsBeforeReassign;
  let nextLabel = "Ready";
  let nextBad = false;
  if (lastCallAt) {
    const next = new Date(lastCallAt).getTime() + rules.followUpCallWithinHours * 3600_000;
    if (next > Date.now()) {
      nextLabel = `Next ${new Date(next).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      nextBad = true;
    }
  }
  const cadenceChip = (label: string, value: string, bad: boolean): React.JSX.Element => (
    <View
      style={[
        styles.cadenceChip,
        { backgroundColor: bad ? "rgba(255,72,72,0.15)" : "rgba(0,200,120,0.15)" },
      ]}
    >
      <Text style={[styles.cadenceChipLabel, { color: bad ? "#FF8888" : "#3DD68C" }]}>{label}</Text>
      <Text style={styles.cadenceChipValue}>{value}</Text>
    </View>
  );
  return (
    <View style={styles.cadenceRow}>
      {cadenceChip("Calls", `${calls}/${rules.maxCallsBeforeReassign}`, callsBad)}
      {cadenceChip("Msgs", `${messages}/${rules.maxCallsBeforeReassign}`, msgsBad)}
      {cadenceChip("Cadence", nextLabel, nextBad)}
    </View>
  );
}
