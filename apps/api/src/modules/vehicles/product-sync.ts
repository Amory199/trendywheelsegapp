import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";

// Vehicles are the single source of truth for cart inventory (owner
// directive 2026-06-11): a vehicle marked listingType "sale"/"both" maintains
// its own Product row automatically, so the Buy section and the order flow
// (order_items FK → products) keep working with zero double entry. The
// Catalog page is hand-managed ONLY for parts/accessories now.
//
// Best-effort: a sync failure must never fail the admin's vehicle save.
export async function syncVehicleProduct(vehicleId: string): Promise<void> {
  try {
    const v = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!v) return;

    const existing = await prisma.product.findFirst({ where: { vehicleId } });
    const forSale =
      (v.listingType === "sale" || v.listingType === "both") && v.status !== "inactive";

    if (!forSale) {
      // Not (or no longer) for sale: hide rather than delete so historical
      // order items keep a valid product reference.
      if (existing && existing.inStock) {
        await prisma.product.update({ where: { id: existing.id }, data: { inStock: false } });
      }
      return;
    }

    // A sale listing without a price can't be sold — keep it hidden until
    // the owner sets salePrice on the vehicle.
    const hasPrice = v.salePrice !== null && Number(v.salePrice) > 0;
    const data = {
      name: v.name,
      priceEgp: hasPrice ? v.salePrice! : 0,
      images: v.images.map((i) => i.url),
      inStock: hasPrice && v.status === "available" && v.quantity > 0,
      stockCount: v.quantity,
      vehicleId: v.id,
      description: v.saleDescription ?? null,
    };
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
    } else {
      await prisma.product.create({ data: { ...data, category: "cart_new" } });
    }
  } catch (err) {
    logger.warn({ err, vehicleId }, "vehicle→product sync failed (non-fatal)");
  }
}
