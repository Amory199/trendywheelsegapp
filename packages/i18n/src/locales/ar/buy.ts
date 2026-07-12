import type enNs from "../en/buy";
import type { Stringify } from "../_stringify";

const buy: Stringify<typeof enNs> = {
  // Currency label (composed inline with data prices)
  egp: "ج.م",

  // Catalog tab — app/(tabs)/buy.tsx
  catalogTitle: "الكتالوج",
  catalogSubtitle: "عربات جولف وقطع غيار وإكسسوارات.",
  tabAll: "الكل",
  tabNew: "جديد",
  tabUsed: "مستعمل",
  tabParts: "قطع غيار",
  tabAccessory: "إكسسوار",
  emptyCatalog: "لا يوجد شيء هنا بعد.",
  outOfStock: "غير متوفر",

  // Category page — app/buy/category/[key].tsx
  allCategories: "كل الفئات",
  searchPlaceholder: "ابحث بالاسم أو الماركة…",
  noMatches: "لا توجد نتائج",
  noProductsInCategory: "لا يوجد شيء للبيع في هذه الفئة بعد",

  // Product detail — app/buy/[id].tsx
  categoryCartNew: "عربة جولف جديدة",
  categoryCartUsed: "عربة جولف مستعملة",
  categoryParts: "قطع غيار",
  categoryAccessory: "إكسسوار",
  notFound: "غير موجود.",
  showDetails: "عرض التفاصيل ▾",
  hideDetails: "إخفاء التفاصيل ▴",
  specBrand: "الماركة",
  specModel: "الموديل",
  specYear: "السنة",
  total: "الإجمالي",
  placing: "جارٍ تنفيذ الطلب…",
  unavailable: "غير متاح",
  reserveNow: "احجز الآن",
  buyNow: "اشترِ الآن",
  orderPlacedTitle: "تم تنفيذ الطلب",
  orderPlacedWithIdPrefix: "طلبك رقم #",
  orderPlacedWithIdSuffix: " مؤكد. ستصلك التحديثات عبر الإشعارات والرسائل القصيرة.",
  orderPlacedNoId: "تم تأكيد طلبك. ستصلك التحديثات عبر الإشعارات والرسائل القصيرة.",
  viewMyOrders: "عرض طلباتي",
  couldNotPlaceTitle: "تعذّر تنفيذ الطلب",
  couldNotPlaceMessage: "من فضلك حاول مرة أخرى بعد قليل.",

  // Order status labels (used by my-orders + order detail)
  orderStatusPending: "قيد الانتظار",
  orderStatusConfirmed: "مؤكد",
  orderStatusDelivered: "تم التسليم",
  orderStatusCancelled: "ملغي",

  // My orders — app/buy/my-orders.tsx
  myOrdersTitle: "طلباتي",
  noOrdersYet: "لم تقم بتنفيذ أي طلبات بعد",
  browseCars: "تصفّح السيارات",
  fallbackOrder: "طلب",
  orderNumberPrefix: "طلب رقم #",
  moreSuffixPrefix: " + ",
  moreSuffix: " أخرى",

  // Order detail — app/buy/orders/[id].tsx
  orderDetailTitlePrefix: "طلب رقم #",
  status: "الحالة",
  placed: "تاريخ الطلب",
  items: "العناصر",
  fallbackItem: "عنصر",
  customerSection: "العميل",
  noIdUploaded: "لم يرفع هذا العميل بطاقة هوية.",

  // Inventory toggle (sales) — app/inventory/[id].tsx
  inventoryTitle: "المخزون",
  fallbackVehicle: "المركبة",
  statusAvailable: "متاحة",
  statusReserved: "محجوزة",
  statusSold: "مباعة",
  currentStatus: "الحالة الحالية",
  changeTo: "تغيير إلى",
  currentHint: "الحالية",
  dealNote: "ملاحظة الصفقة (اختياري)",
  dealNotePlaceholder: "مثال: نقداً، لوحة #1234، العميل أحمد",
  saving: "جارٍ الحفظ…",
  updateStatus: "تحديث الحالة",
  pickStatusFirst: "اختر حالة أولاً",
  updatedTitle: "تم التحديث",
  couldNotUpdateTitle: "تعذّر التحديث",
  tryAgainShort: "حاول مرة أخرى",
};

export default buy;
