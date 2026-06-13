import type enNs from "../en/messages";
import type { Stringify } from "../_stringify";

const messages: Stringify<typeof enNs> = {
  title: "الرسائل",
  emptyTitle: "لا توجد محادثات بعد",
  messageSupport: "راسل الدعم",
  unknownUser: "غير معروف",
  noMessagesYet: "لا توجد رسائل بعد",
  supportOpenFailedTitle: "تعذّر فتح الدعم",
  chatTitle: "محادثة",
  inputPlaceholder: "اكتب رسالة…",
  noRecipient: "لا يوجد مستلم لهذه المحادثة",
  sendFailedTitle: "لم تُرسل الرسالة",
};

export default messages;
