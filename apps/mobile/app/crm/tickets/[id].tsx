// Staff ticket detail. Renders the shared support ticket workspace verbatim so
// a staff member working the hub's Support tab gets the full toolkit (status,
// priority, assign, reply) without leaving the staff route group — one source
// of truth serves both /support and /crm. The CRM hub is a Tabs navigator with
// headerShown:false, so the shared screen's inner <Stack.Screen> is inert here
// (no native header / back arrow); overlay an explicit BackButton so staff who
// drilled in from the support queue always have a visible way back.
import { colors } from "@trendywheels/ui-tokens";
import { View } from "react-native";

import { BackButton } from "../../../components/BackButton";
import SupportTicketDetail from "../../support/tickets/[id]";

export default function CrmTicketDetail(): React.JSX.Element {
  return (
    <View style={{ flex: 1, backgroundColor: colors.dark.bg }}>
      <SupportTicketDetail />
      <View style={{ position: "absolute", top: 56, left: 12 }}>
        <BackButton fallback="/crm/pipeline" />
      </View>
    </View>
  );
}
