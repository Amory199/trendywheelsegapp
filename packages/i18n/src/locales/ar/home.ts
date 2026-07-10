import type enNs from "../en/home";
import type { Stringify } from "../_stringify";

const home: Stringify<typeof enNs> = {
  // Home hero
  heroGreeting: "أهلاً",
  heroDefault: "انطلق بجرأة",
  heroTitleLine1: "ماذا تحتاج",
  heroTitleLine2: "اليوم؟",

  // Home action chips
  chipBuy: "شراء",
  chipBuySub: "عربات جولف · قطع غيار",
  chipRent: "إيجار",
  chipRentSub: "بالـيوم",
  chipSell: "بيع",
  chipSellSub: "بيع · استبدال",
  chipService: "خدمة",
  chipServiceSub: "صيانة · رحلة",

  // Intro reel
  skip: "تخطّي ▸",

  // First-run onboarding carousel (3 slides, shown once after language pick)
  intro: {
    slide1Title: "استأجر عربية جولف في مصر",
    slide1Body: "إيجار بالساعة أو باليوم في الكمبوندات والقرى السياحية — احجز في دقائق.",
    slide2Title: "اشترِ أو بِع مركبتك",
    slide2Body: "إعلانات من المُلّاك وبائعون موثّقون — عربيات جولف وباجي وأكثر.",
    slide3Title: "صيانة في دقائق",
    slide3Body: "ميكانيكية معتمدون يصلون إليك أينما كانت مركبتك.",
    next: "التالي",
    getStarted: "ابدأ الآن",
    skip: "تخطّي",
  },

  // Hub card CTA
  start: "ابدأ →",

  // Category strip
  allCategories: "كل الفئات",
  categories: {
    "golf-cart": "عربات الجولف",
    scooter: "سكوتر",
    "scooter-sidecar": "سكوتر بعربة جانبية",
    buggy: "عربات الباجي",
    utv: "مركبات UTV",
    "jet-ski": "جت سكي",
    "hover-board": "هوفر بورد",
  },

  // Discovery home (header, search, promo, rails)
  welcome: "أهلاً بك",
  tagline: "اعثر على مركبتك",
  searchPlaceholder: "ابحث عن عربات جولف، قطع غيار، إيجارات…",
  searchHint: "ابحث في عربات الجولف وقطع الغيار والإيجارات والمزيد",
  searchNoResults: "لا نتائج لـ",
  browse: "تصفّح",
  browseRentSubtitle: "استأجر عربة الجولف اليوم",
  seeAll: "عرض الكل",
  railForRent: "للإيجار",
  railForSale: "عربات جولف للبيع",
  forSaleSubtitle: "امتلك عربة الجولف — عربات جولف للبيع",
  railShop: "قطع غيار وإكسسوارات",
  badgeForRent: "إيجار",
  badgeForSale: "بيع",
  promoTitle: "عربات جولف فاخرة، جاهزة للانطلاق",
  promoCta: "تسوّق الآن",
  egp: "ج.م",
  perDay: "/يوم",

  // Quick-access grid (Talabat-style home tiles)
  quickTitle: "ماذا تحتاج؟",
  quickBuy: "شراء",
  quickRent: "إيجار",
  quickSell: "بيع",
  quickTradeIn: "استبدال",
  quickMaintenance: "صيانة",
  quickCustomization: "تخصيص",
  quickDelivery: "توصيل",
  quickSupport: "الدعم",

  // Header location pill
  deliverTo: "التوصيل إلى",
  deliverDefault: "القاهرة، مصر",

  // Promo carousel
  promoBrowseTitle: "اعثر على مركبتك",
  promoCrossTitle: "استأجر اليوم، اشترِ غداً",
  promoServiceTitle: "نأتي إليك",
  promoChipFreeDelivery: "توصيل حتى باب منزلك",
  promoChipNoAccount: "تصفّح دون حساب",
  promoChipRentBuy: "استأجر أو اشترِ",

  // Continue card — discovery off a completed purchase / saved favorite
  continueOrderTitle: "اشتريت هذا من قبل",
  continueExploreSub: "اكتشف المزيد مما يعجبك",
  continueFavoriteTitle: "عُد إلى مركبتك المحفوظة",
  continueCtaExplore: "استكشف المزيد",
  continueCtaView: "عرض",

  // Redeem & save row (loyalty + refer)
  loyaltyTitle: "الولاء",
  loyaltyPoints: "نقطة",
  referTitle: "ادعُ واربح",
  referSub: "شارك ترندي ويلز",
  redeemGuestTitle: "سجّل الدخول لتربح المكافآت",
  redeemGuestCta: "تسجيل الدخول",
  tier: {
    bronze: "برونزي",
    silver: "فضي",
    gold: "ذهبي",
    platinum: "بلاتيني",
  },

  // On sale rail (honest salePrice only)
  railDeals: "للبيع",
  dealsSubtitle: "عروض لفترة محدودة — تخفيضات الآن",
  dealsBadge: "للبيع",

  // Services rail
  servicesTitle: "الخدمات",
  serviceMaintenance: "الصيانة",
  serviceMaintenanceSub: "إصلاح وضبط",
  serviceCustomize: "التخصيص",
  serviceCustomizeSub: "اجعلها على ذوقك",
  serviceDelivery: "التوصيل",
  serviceDeliverySub: "استلام وتسليم",
  serviceTradeIn: "الاستبدال",
  serviceTradeInSub: "بدّل وطوّر",
};

export default home;
