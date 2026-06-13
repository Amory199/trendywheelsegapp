import type enNs from "../en/support";
import type { Stringify } from "../_stringify";

const support: Stringify<typeof enNs> = {
  tabTickets: "التذاكر",
  tabChat: "المحادثة",

  chatTitle: "محادثة مباشرة",
  chatEmpty: "لا توجد محادثات نشطة",
  chatNoMessages: "لا توجد رسائل",
  chatCustomer: "عميل",

  ticketsRole: "الدعم · صندوق الوارد",
  ticketsGreeting: "مرحبًا،",
  ticketsAgent: "موظف",
  filterOpen: "مفتوحة",
  filterInProgress: "قيد المعالجة",
  filterResolved: "تم حلها",
  unknownCustomer: "غير معروف",
  generalCategory: "عام",
  emptyOpen: "لا توجد تذاكر مفتوحة",
  emptyInProgress: "لا توجد تذاكر قيد المعالجة",
  emptyResolved: "لا توجد تذاكر تم حلها",
  emptyClosed: "لا توجد تذاكر مغلقة",

  detailFallbackTitle: "تذكرة",
  detailCustomer: "عميل",
  assignedTo: "مُسندة إلى",
  unassigned: "غير مُسندة",
  customerMessage: "رسالة العميل",
  priority: "الأولوية",
  status: "الحالة",
  reassign: "إعادة الإسناد",
  assign: "إسناد",
  close: "إغلاق",
  closeTitle: "إغلاق التذكرة؟",
  closeMessage: "هل تريد تعليم هذه التذكرة كمغلقة؟",
  replyTitle: "الرد على العميل",
  replyPlaceholder: "اكتب ردًا…",
  sendReply: "إرسال الرد",
  noRecipient: "لا يوجد مستلم",
  sentTitle: "تم الإرسال",
  sentMessage: "تم تسليم الرد إلى العميل.",
  sendFailed: "فشل الإرسال",
  updateFailed: "فشل التحديث",
  pickAgent: "اختر موظف الدعم",
  noAgents: "لا يوجد موظفو دعم.",

  statusOpen: "مفتوحة",
  statusInProgress: "قيد المعالجة",
  statusResolved: "تم حلها",
  statusClosed: "مغلقة",
  priorityLow: "منخفضة",
  priorityMedium: "متوسطة",
  priorityHigh: "عالية",
  priorityUrgent: "عاجلة",
};

export default support;
