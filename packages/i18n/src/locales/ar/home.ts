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
};

export default home;
