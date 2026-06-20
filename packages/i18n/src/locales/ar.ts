import type { TranslationKeys } from "./en";
import admin from "./ar/admin";
import buy from "./ar/buy";
import components from "./ar/components";
import crm from "./ar/crm";
import home from "./ar/home";
import messages from "./ar/messages";
import profile from "./ar/profile";
import rent from "./ar/rent";
import sell from "./ar/sell";
import service from "./ar/service";
import support from "./ar/support";

const ar: TranslationKeys = {
  common: {
    loading: "جاري التحميل...",
    error: "حدث خطأ ما",
    retry: "إعادة المحاولة",
    cancel: "إلغاء",
    confirm: "تأكيد",
    save: "حفظ",
    delete: "حذف",
    edit: "تعديل",
    back: "رجوع",
    next: "التالي",
    search: "بحث",
    filter: "تصفية",
    sort: "ترتيب",
    noResults: "لا توجد نتائج",
    viewAll: "عرض الكل",
    tryAgain: "حاول مرة أخرى",
  },
  auth: {
    enterPhone: "أدخل رقم هاتفك",
    sendOtp: "إرسال رمز التحقق",
    enterOtp: "أدخل رمز التحقق",
    verifyOtp: "تحقق",
    otpSent: "تم إرسال رمز التحقق إلى واتساب",
    invalidOtp: "رمز التحقق غير صالح",
    logout: "تسجيل الخروج",
    welcome: "مرحباً بك في تريندي ويلز",
    phoneSubtitle: "أدخل رقم هاتفك للبدء",
    privacyAgreePrefix: "أوافق على",
    privacyPolicy: "سياسة الخصوصية",
    privacyAgreeSuffix: "وأقرّ بموافقتي على معالجة بياناتي الشخصية.",
    sending: "جاري الإرسال…",
    requiredTitle: "مطلوب",
    privacyRequired: "يرجى الموافقة على سياسة الخصوصية للمتابعة.",
    invalidNumberTitle: "رقم غير صحيح",
    invalidNumberMessage: "أدخل رقم موبايل مصري مكوّناً من 10 أرقام يبدأ بـ 1.",
    otpSendFailed: "تعذر إرسال رمز التحقق",
    verifyTitle: "تأكيد رقمك",
    otpSentTo: "أدخل الرمز المرسل إلى",
    verifying: "جاري التحقق…",
    verificationFailed: "فشل التحقق",
    guestTitle: "سجّل الدخول للمتابعة",
    guestBody: "سجّل الدخول لاستخدام هذه الميزة. يمكنك متابعة التصفّح بدون حساب.",
    guestCta: "تسجيل الدخول",
    browseAsGuest: "تابع التصفّح بدون حساب",
    keepBrowsing: "ليس الآن — تابع التصفّح",
    haveAccountLogin: "لديك حساب بالفعل؟ سجّل الدخول",
    loginTitle: "مرحبًا بعودتك",
    loginSubtitle: "سجّل الدخول ببريدك الإلكتروني وكلمة المرور.",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "كلمة المرور",
    loginCta: "تسجيل الدخول",
    loggingIn: "جارٍ تسجيل الدخول…",
    loginFailed: "فشل تسجيل الدخول",
    invalidCredentials: "بريد إلكتروني أو كلمة مرور غير صحيحة.",
    noAccountSignup: "جديد هنا؟ سجّل عبر رقم هاتفك",
  },
  tabs: {
    home: "الرئيسية",
    buy: "شراء",
    rent: "إيجار",
    sell: "بيع",
    repair: "الصيانة",
    profile: "حسابي",
  },
  settings: {
    languageChanged: "تم تغيير اللغة",
    restartToApply: "يرجى إعادة تشغيل التطبيق لتطبيق اللغة والاتجاه الجديدين.",
  },
  home,
  buy,
  rent,
  sell,
  service,
  profile,
  messages,
  admin,
  crm,
  support,
  components,
};

export default ar;
