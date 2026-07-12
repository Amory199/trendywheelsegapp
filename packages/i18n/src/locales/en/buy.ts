export default {
  // Currency label (composed inline with data prices)
  egp: "EGP",

  // Catalog tab — app/(tabs)/buy.tsx
  catalogTitle: "Catalog",
  catalogSubtitle: "Golf carts, parts, and accessories.",
  tabAll: "All",
  tabNew: "New",
  tabUsed: "Used",
  tabParts: "Parts",
  tabAccessory: "Access.",
  emptyCatalog: "Nothing here yet.",
  outOfStock: "OUT OF STOCK",

  // Category page — app/buy/category/[key].tsx
  allCategories: "All categories",
  searchPlaceholder: "Search by name or brand…",
  noMatches: "No matches",
  noProductsInCategory: "Nothing for sale in this category yet",

  // Product detail — app/buy/[id].tsx
  categoryCartNew: "New golf cart",
  categoryCartUsed: "Used golf cart",
  categoryParts: "Parts",
  categoryAccessory: "Accessory",
  notFound: "Not found.",
  showDetails: "Show details ▾",
  hideDetails: "Hide details ▴",
  specBrand: "Brand",
  specModel: "Model",
  specYear: "Year",
  total: "Total",
  placing: "Placing…",
  unavailable: "Unavailable",
  reserveNow: "Reserve now",
  buyNow: "Buy now",
  orderPlacedTitle: "Order placed",
  orderPlacedWithIdPrefix: "Your order #",
  orderPlacedWithIdSuffix: " is confirmed. You'll get updates via push and SMS.",
  orderPlacedNoId: "Your order is confirmed. You'll get updates via push and SMS.",
  viewMyOrders: "View my orders",
  couldNotPlaceTitle: "Could not place order",
  couldNotPlaceMessage: "Please try again in a moment.",

  // Order status labels (used by my-orders + order detail)
  orderStatusPending: "Pending",
  orderStatusConfirmed: "Confirmed",
  orderStatusDelivered: "Delivered",
  orderStatusCancelled: "Cancelled",

  // My orders — app/buy/my-orders.tsx
  myOrdersTitle: "My Orders",
  noOrdersYet: "You haven't placed any orders yet",
  browseCars: "Browse cars",
  fallbackOrder: "Order",
  orderNumberPrefix: "Order #",
  moreSuffixPrefix: " + ",
  moreSuffix: " more",

  // Order detail — app/buy/orders/[id].tsx
  orderDetailTitlePrefix: "Order #",
  status: "Status",
  placed: "Placed",
  items: "Items",
  fallbackItem: "Item",
  customerSection: "Customer",
  noIdUploaded: "No ID uploaded by this customer.",

  // Inventory toggle (sales) — app/inventory/[id].tsx
  inventoryTitle: "Inventory",
  fallbackVehicle: "Vehicle",
  statusAvailable: "Available",
  statusReserved: "Reserved",
  statusSold: "Sold",
  currentStatus: "Current status",
  changeTo: "Change to",
  currentHint: "Current",
  dealNote: "Deal note (optional)",
  dealNotePlaceholder: "e.g. cash, plate #1234, customer Ahmed",
  saving: "Saving…",
  updateStatus: "Update status",
  pickStatusFirst: "Pick a status first",
  updatedTitle: "Updated",
  couldNotUpdateTitle: "Could not update",
  tryAgainShort: "Try again",
} as const;
