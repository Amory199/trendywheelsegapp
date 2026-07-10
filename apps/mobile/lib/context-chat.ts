// Open (or resume) the chat thread ABOUT one transaction — a booking,
// reservation, repair, order, or sales listing. The server keeps exactly one
// shared customer+staff conversation per context and pins a label on it, so
// every "Message" button across the app lands in the right thread.

import { Alert } from "react-native";
import type { useRouter } from "expo-router";

import { api } from "./api";
import { translate } from "./locale";

export type ChatContextType = "booking" | "reservation" | "repair" | "order" | "listing";

export interface ChatContext {
  contextType: ChatContextType;
  contextId: string;
  /** Human label pinned to the thread, e.g. "Jeep Grand Cherokee · TW-829301". */
  contextTitle?: string;
}

export async function openContextChat(
  router: ReturnType<typeof useRouter>,
  context: ChatContext,
): Promise<void> {
  try {
    const res = await api.request<{ data: { id: string } }>(
      "POST",
      "/api/messages/context-thread",
      { body: context },
    );
    router.push(`/messages/${res.data.id}` as never);
  } catch (err) {
    Alert.alert(
      translate("messages.openFailedTitle" as never),
      err instanceof Error ? err.message : translate("common.tryAgain" as never),
    );
  }
}
