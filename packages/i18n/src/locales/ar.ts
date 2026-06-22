import type { TranslationKeys } from "./en";
import admin from "./ar/admin";
import buy from "./ar/buy";
import components from "./ar/components";
import crm from "./ar/crm";
import home from "./ar/home";
import messages from "./ar/messages";
import profile from "./ar/profile";
import rent from "./ar/rent";
import sale from "./ar/sale";
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
    loginSubtitle: "سجّل الدخول برقم هاتفك وكلمة المرور.",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    identifierLabel: "اسم المستخدم أو الهاتف أو البريد",
    identifierPlaceholder: "اسم المستخدم أو رقم الهاتف",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "كلمة المرور",
    loginCta: "تسجيل الدخول",
    loggingIn: "جارٍ تسجيل الدخول…",
    loginFailed: "فشل تسجيل الدخول",
    invalidCredentials: "بريد إلكتروني أو كلمة مرور غير صحيحة.",
    noAccount: "لا يوجد حساب بهذا البريد الإلكتروني.",
    noPasswordSet:
      "هذا الحساب لا يملك كلمة مرور بعد. سجّل الدخول برقم هاتفك أو اطلب من المدير تعيين كلمة مرور.",
    wrongPassword: "كلمة المرور غير صحيحة. حاول مرة أخرى.",
    accountInactive: "هذا الحساب غير نشط. يُرجى التواصل مع المدير.",
    noAccountSignup: "جديد هنا؟ سجّل عبر رقم هاتفك",
  },
  roleSwitch: {
    viewAs: "العرض كدور آخر",
    subtitle: "عاين التطبيق كعميل أو كموظف، بصلاحيات ذلك الدور الفعلية. هذا متاح للمدير فقط.",
    actingAs: "تعرض كـ",
    exit: "خروج",
    customer: "عميل",
    staff: "موظف",
    sales: "مبيعات",
    support: "دعم",
    inventory: "المخزون",
    mechanic: "فني",
    cancel: "إلغاء",
    failed: "تعذّر تبديل الدور",
  },
  verifyId: {
    title: "توثيق الهوية",
    heading: "أكّد هويتك",
    subtitle:
      "لأمانك وأماننا، نحتاج صورة لوجه وظهر بطاقة الرقم القومي قبل إتمام هذه المعاملة. تقوم بذلك مرة واحدة فقط.",
    frontLabel: "البطاقة — الوجه",
    backLabel: "البطاقة — الظهر",
    tapToUpload: "اضغط للرفع",
    privacy: "تُحفظ بطاقتك بشكل آمن وتُستخدم فقط للتحقق من الإيجار والشراء والإعلانات.",
    saveContinue: "حفظ ومتابعة",
    saveErrorTitle: "تعذّر حفظ بطاقتك",
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
  sale,
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
