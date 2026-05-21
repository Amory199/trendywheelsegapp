// Demo-data wipe: strips every customer-side row + every vehicle but keeps
// staff accounts (admin + sales/support/inventory/mechanic) and the
// singleton CrmRules row. Use to reset the prod DB to a clean baseline
// before real customers start signing up.
//
// Guarded by WIPE_CONFIRM=YES — refuses to run without it. Take a pg_dump
// FIRST.
//
//   pg_dump -U trendywheels trendywheels > /var/backups/trendywheels-pre-wipe.sql
//   WIPE_CONFIRM=YES tsx scripts/wipe-demo-data.ts

import { prisma } from "../src/config/database.js";
import { logger } from "../src/utils/logger.js";

async function main(): Promise<void> {
  if (process.env.WIPE_CONFIRM !== "YES") {
    console.error("Refusing to run without WIPE_CONFIRM=YES. Take a pg_dump first, then:");
    console.error("  WIPE_CONFIRM=YES tsx scripts/wipe-demo-data.ts");
    process.exit(2);
  }

  // Delete in dependency order so FK constraints don't trip. Children first,
  // then parents. CrmRules + staff users + the empty system tables stay.
  const steps: Array<[string, () => Promise<{ count: number }>]> = [
    // CRM
    ["leadActivity", () => prisma.leadActivity.deleteMany()],
    ["lead", () => prisma.lead.deleteMany()],

    // Bookings + payments + promo redemptions + reviews
    ["review", () => prisma.review.deleteMany()],
    ["promoRedemption", () => prisma.promoRedemption.deleteMany()],
    ["booking", () => prisma.booking.deleteMany()],

    // Service requests
    ["repairRequest", () => prisma.repairRequest.deleteMany()],
    ["maintenanceRequest", () => prisma.maintenanceRequest.deleteMany()],
    ["customizationRequest", () => prisma.customizationRequest.deleteMany()],
    ["transportRequest", () => prisma.transportRequest.deleteMany()],
    ["vehicleMaintenance", () => prisma.vehicleMaintenance.deleteMany()],
    ["vehicleConditionReport", () => prisma.vehicleConditionReport.deleteMany()],

    // Sales listings + trade-ins + orders
    ["orderItem", () => prisma.orderItem.deleteMany()],
    ["order", () => prisma.order.deleteMany()],
    ["tradeInQuote", () => prisma.tradeInQuote.deleteMany()],
    ["salesListing", () => prisma.salesListing.deleteMany()],

    // Messaging
    ["message", () => prisma.message.deleteMany()],
    ["conversationParticipant", () => prisma.conversationParticipant.deleteMany()],
    ["conversation", () => prisma.conversation.deleteMany()],

    // Support
    ["supportTicket", () => prisma.supportTicket.deleteMany()],

    // Loyalty + referrals + notes
    ["loyaltyTransaction", () => prisma.loyaltyTransaction.deleteMany()],
    ["referral", () => prisma.referral.deleteMany()],
    ["referralCode", () => prisma.referralCode.deleteMany()],
    ["customerNote", () => prisma.customerNote.deleteMany()],

    // Notifications + push tokens (everyone re-registers on next sign-in)
    ["notification", () => prisma.notification.deleteMany()],
    ["pushToken", () => prisma.pushToken.deleteMany()],

    // Auth artifacts for customers — staff sessions stay; we drop refresh
    // tokens + OTP codes for everyone so a fresh login is required.
    ["refreshToken", () => prisma.refreshToken.deleteMany()],
    ["otpCode", () => prisma.otpCode.deleteMany()],

    // Vehicles (and their images)
    ["vehicleImage", () => prisma.vehicleImage.deleteMany()],
    ["vehicle", () => prisma.vehicle.deleteMany()],

    // Audit log entries authored by non-staff users (the FK is no-action so
    // we have to clear it before deleting the users). For simplicity wipe
    // everything in audit_logs — historical staff actions can be reseeded if
    // needed, but post-wipe testing wants a clean trail.
    ["auditLog", () => prisma.auditLog.deleteMany()],
    ["errorLog", () => prisma.errorLog.deleteMany()],
    ["alertEvent", () => prisma.alertEvent.deleteMany()],

    // Finally: non-staff users. Keep accountType=admin AND staff roles.
    [
      "user (non-staff)",
      () =>
        prisma.user.deleteMany({
          where: {
            AND: [
              { accountType: { not: "admin" } },
              {
                OR: [
                  { staffRole: null },
                  {
                    staffRole: {
                      notIn: ["admin", "sales", "support", "inventory", "mechanic"],
                    },
                  },
                ],
              },
            ],
          },
        }),
    ],
  ];

  const results: Array<[string, number]> = [];
  for (const [name, fn] of steps) {
    const { count } = await fn();
    results.push([name, count]);
    logger.info({ model: name, deleted: count }, "wipe step done");
  }

  const remaining = {
    users: await prisma.user.count(),
    crmRules: await prisma.crmRules.count(),
    vehicles: await prisma.vehicle.count(),
    bookings: await prisma.booking.count(),
    leads: await prisma.lead.count(),
  };

  console.log("\n──── WIPE COMPLETE ─────────────────────────────");
  for (const [model, deleted] of results) {
    console.log(`  - ${model.padEnd(28)} deleted=${deleted}`);
  }
  console.log("\nRemaining:");
  for (const [k, v] of Object.entries(remaining)) {
    console.log(`  - ${k.padEnd(12)} ${v}`);
  }
  console.log("");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("wipe failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
