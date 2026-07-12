// One-shot backfill: make sure EVERY for-sale vehicle has its synced Product
// row in the Buy feed. syncVehicleProduct() runs automatically on vehicle
// create/update, but vehicles that predate the sync hook (or whose best-effort
// sync silently failed) never got a product. Loop every listingType sale/both
// vehicle through the same sync — it upserts by vehicleId, so re-running is
// safe (idempotent).
//
//   tsx scripts/backfill-vehicle-products.ts

import { prisma } from "../src/config/database.js";
import { syncVehicleProduct } from "../src/modules/vehicles/product-sync.js";

async function main(): Promise<void> {
  const vehicles = await prisma.vehicle.findMany({
    where: { listingType: { in: ["sale", "both"] } },
    select: { id: true, name: true, listingType: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`For-sale vehicles found: ${vehicles.length}`);

  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  for (const v of vehicles) {
    const had = await prisma.product.findFirst({
      where: { vehicleId: v.id },
      select: { id: true },
    });
    await syncVehicleProduct(v.id);
    const has = await prisma.product.findFirst({
      where: { vehicleId: v.id },
      select: { id: true, inStock: true },
    });
    // No product after sync = the vehicle isn't sellable (inactive) or the
    // sync failed non-fatally (it logs its own warning) — nothing to do here.
    const outcome = !has ? "skipped" : had ? "refreshed" : "created";
    if (outcome === "created") created++;
    else if (outcome === "refreshed") refreshed++;
    else skipped++;
    console.log(
      `${v.id}  ${v.listingType}/${v.status}  ${outcome}${has ? ` inStock=${has.inStock}` : ""}  ${v.name}`,
    );
  }
  console.log(
    `Done — ${vehicles.length} vehicles: ${created} products created, ${refreshed} refreshed, ${skipped} skipped.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
