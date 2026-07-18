import type { TranslationKeys } from "../en";

// شاشة تسجيل الاستلام للموظفين / المسؤولين (تسليم عبر رمز QR).
const checkin: TranslationKeys["checkin"] = {
  title: "تسجيل الاستلام",
  searchPlaceholder: "امسح أو أدخل رمز التذكرة (TW-…)",
  hint: "ابحث عن حجز مؤكَّد برمز TW أو اسم العميل أو المركبة، ثم أكِّد التسليم.",
  empty: "لا توجد حجوزات بانتظار الاستلام.",
  noMatch: "لا يوجد حجز مطابق.",
  guest: "زائر",
  paid: "مدفوع",
  unpaid: "غير مدفوع",
  confirmTitle: "تأكيد التسليم",
  customer: "العميل",
  phone: "الهاتف",
  vehicle: "المركبة",
  dates: "التواريخ",
  total: "الإجمالي",
  collectLabel: "تم تحصيل الدفع",
  collectSub: "نقدًا — ضع علامة على هذا الحجز كمدفوع",
  confirmCta: "تأكيد التسليم",
  cancel: "إلغاء",
  doneTitle: "تم التسليم",
  doneBody: "تم تسجيل الاستلام. رحلة سعيدة!",
  failTitle: "تعذّر تسجيل الاستلام",
  pickedUp: "تم الاستلام",
};

export default checkin;
