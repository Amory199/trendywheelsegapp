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
  chipBuySub: "عربات · قطع غيار",
  chipRent: "إيجار",
  chipRentSub: "بالـيوم",
  chipSell: "بيع",
  chipSellSub: "بيع · استبدال",
  chipService: "خدمة",
  chipServiceSub: "صيانة · رحلة",

  // Intro reel
  skip: "تخطّي ▸",

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
  searchPlaceholder: "ابحث عن عربات، قطع غيار، إيجارات…",
  searchHint: "ابحث في العربات وقطع الغيار والإيجارات والمزيد",
  searchNoResults: "لا نتائج لـ",
  browse: "تصفّح",
  seeAll: "عرض الكل",
  railForRent: "للإيجار",
  railForSale: "عربات للبيع",
  railShop: "قطع غيار وإكسسوارات",
  badgeForRent: "إيجار",
  badgeForSale: "بيع",
  promoTitle: "عربات فاخرة، جاهزة للانطلاق",
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
};

export default home;
