// Admin ticket detail. Same shared support workspace the staff hub uses
// (status, priority, assign, reply) — rendered in the admin navigator with an
// explicit BackButton to the admin queue.
import { colors } from "@trendywheels/ui-tokens";
import { View } from "react-native";

import { BackButton } from "../../../components/BackButton";
import SupportTicketDetail from "../../support/tickets/[id]";

export default function AdminTicketDetail(): React.JSX.Element {
  return (
    <View style={{ flex: 1, backgroundColor: colors.dark.bg }}>
      <SupportTicketDetail />
      <View style={{ position: "absolute", top: 56, left: 12 }}>
        <BackButton fallback="/admin/tickets" />
      </View>
    </View>
  );
}
