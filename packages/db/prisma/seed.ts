/**
 * TrendyWheels seed script — Egyptian market demo data.
 * Run with: pnpm --filter @trendywheels/db db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding TrendyWheels database...");

  // Clean slate (dev only)
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.repairRequest.deleteMany();
  await prisma.salesListing.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.kBArticle.deleteMany();
  await prisma.vehicleMaintenance.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.vehicleImage.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ───────────────────────────────────────────────
  // Three-role model: superadmin (accountType=admin), sales agent (accountType=staff,
  // staffRole=sales — also handles inventory + support + repairs), customer.
  const adminPassword = await bcrypt.hash("Admin@123!", 12);

  const admin = await prisma.user.create({
    data: {
      phone: "+201000000001",
      email: "admin@trendywheelseg.com",
      name: "Mostafa Admin",
      accountType: "admin",
      staffRole: "admin",
      status: "active",
      passwordHash: adminPassword,
      loyaltyTier: "platinum",
      salesTargetMonthly: 250000,
      salesAssignmentWeight: 1,
    },
  });

  // ─── Sales Agents ────────────────────────────────────────
  const salesPassword = await bcrypt.hash("Sales@123!", 12);
  const salesAgents = await Promise.all(
    [
      {
        phone: "+201000000010",
        email: "amira@trendywheelseg.com",
        name: "Amira Hassan",
        weight: 2,
        target: 180000,
      },
      {
        phone: "+201000000011",
        email: "youssef@trendywheelseg.com",
        name: "Youssef Maged",
        weight: 1,
        target: 120000,
      },
      {
        phone: "+201000000012",
        email: "rana@trendywheelseg.com",
        name: "Rana Adel",
        weight: 1,
        target: 120000,
      },
    ].map((s) =>
      prisma.user.create({
        data: {
          phone: s.phone,
          email: s.email,
          name: s.name,
          accountType: "staff",
          staffRole: "sales",
          status: "active",
          passwordHash: salesPassword,
          loyaltyTier: "gold",
          salesTargetMonthly: s.target,
          salesAssignmentWeight: s.weight,
        },
      }),
    ),
  );

  const customerPassword = await bcrypt.hash("Customer@123!", 12);

  const customers = await Promise.all(
    [
      {
        phone: "+201112223344",
        name: "Mohamed Hassan",
        email: "mohamed@example.com",
        passwordHash: customerPassword,
        licenseNumber: "EG-LIC-2025-001",
      },
      { phone: "+201223334455", name: "Nour Ibrahim", email: "nour@example.com" },
      { phone: "+201334445566", name: "Omar Khaled", email: "omar@example.com" },
      { phone: "+201445556677", name: "Yasmin Abdallah", email: "yasmin@example.com" },
      { phone: "+201556667788", name: "Karim Mostafa", email: "karim@example.com" },
    ].map((u) =>
      prisma.user.create({
        data: {
          ...u,
          accountType: "customer",
          status: "active",
          loyaltyTier: "bronze",
          loyaltyPoints: Math.floor(Math.random() * 500),
        },
      }),
    ),
  );

  console.log(`✓ Created ${1 + salesAgents.length + customers.length} users`);

  // ─── Golf Carts (the actual fleet) ───────────────────────
  const vehiclesData = [
    {
      name: "Club Car Onward 4P",
      type: "FOUR_SEATER" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 600,
      location: "Marassi Marina",
      features: ["Headlights", "USB Charging", "Bluetooth Speaker", "Sun Canopy"],
    },
    {
      name: "E-Z-GO RXV Lithium",
      type: "FOUR_SEATER" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 550,
      location: "El Gouna",
      features: ["Lithium Battery", "Premium Seats", "LED Lights", "Quiet Motor"],
    },
    {
      name: "Yamaha Drive2 PTV",
      type: "FOUR_SEATER" as const,
      seating: 4,
      fuelType: "gasoline" as const,
      transmission: "automatic" as const,
      dailyRate: 450,
      location: "Hacienda — Sahel",
      features: ["Cargo Bed", "Cup Holders", "Hard Roof", "All-Terrain Tires"],
    },
    {
      name: "Garia Via 6 Resort",
      type: "SIX_SEATER" as const,
      seating: 6,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 950,
      location: "Telal Soma Bay",
      features: ["Forward 3rd Row", "Premium Upholstery", "Bluetooth", "Wireless Charging"],
    },
    {
      name: "Club Car Villager 6",
      type: "SIX_SEATER" as const,
      seating: 6,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 850,
      location: "Marina 6 — North Coast",
      features: ["Bench Seats", "USB Ports", "Rain Enclosure", "All-Terrain Tires"],
    },
    {
      name: "Hisun Sector E1 6P",
      type: "SIX_SEATER" as const,
      seating: 6,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 800,
      location: "Diplo 4 — New Cairo",
      features: ["Independent Suspension", "Headlights", "Cargo Rack", "Tow Hitch"],
    },
    {
      name: "Garia Via LED Edition",
      type: "LED" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 1200,
      location: "Marassi Marina",
      features: ["RGB LED Underglow", "Premium Audio", "Glass Roof", "Wireless Charging"],
    },
    {
      name: "Star EV Capella LED Lounge",
      type: "LED" as const,
      seating: 6,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 1400,
      location: "Telal Soma Bay",
      features: ["Lounge Seating", "LED Ambient", "Disco Mode", "Dual Bluetooth Speakers"],
    },
  ];

  const vehicles = await Promise.all(
    vehiclesData.map((v) =>
      prisma.vehicle.create({
        data: {
          ...v,
          status: "available",
          totalBookings: Math.floor(Math.random() * 50),
          averageRating: Number((4 + Math.random()).toFixed(2)),
        },
      }),
    ),
  );

  // Add demo images (golf-cart-themed seeds for picsum)
  await Promise.all(
    vehicles.flatMap((v) =>
      [0, 1, 2].map((idx) =>
        prisma.vehicleImage.create({
          data: {
            vehicleId: v.id,
            url: `https://picsum.photos/seed/golf-cart-${v.id.slice(0, 8)}-${idx}/800/600`,
            sortOrder: idx,
          },
        }),
      ),
    ),
  );

  console.log(`✓ Created ${vehicles.length} golf carts with images`);

  // ─── Bookings ────────────────────────────────────────────
  const today = new Date();
  const bookings = await Promise.all([
    prisma.booking.create({
      data: {
        userId: customers[0].id,
        vehicleId: vehicles[0].id,
        startDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: "completed",
        paymentStatus: "paid",
        totalCost: 1800,
      },
    }),
    prisma.booking.create({
      data: {
        userId: customers[1].id,
        vehicleId: vehicles[2].id,
        startDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
        status: "confirmed",
        paymentStatus: "paid",
        totalCost: 1350,
      },
    }),
    prisma.booking.create({
      data: {
        userId: customers[2].id,
        vehicleId: vehicles[4].id,
        startDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
        status: "confirmed",
        paymentStatus: "pending",
        totalCost: 2550,
      },
    }),
  ]);

  console.log(`✓ Created ${bookings.length} bookings`);

  // ─── Sales Listings (used golf carts) ────────────────────
  await Promise.all([
    prisma.salesListing.create({
      data: {
        userId: customers[0].id,
        title: "2024 Club Car Tempo — Single owner, like new",
        make: "Club Car",
        model: "Tempo 4P",
        year: 2024,
        mileage: 1200,
        price: 380000,
        transmission: "automatic",
        fuelType: "electric",
        color: "Pearl White",
        description:
          "Lithium battery (48V), full service history, garage-kept at Marassi compound. Headlights, Bluetooth, USB charging — exactly as new. Selling because we upgraded to a 6-seater.",
        images: [
          "https://picsum.photos/seed/golf-cart-tempo-1/800/600",
          "https://picsum.photos/seed/golf-cart-tempo-2/800/600",
        ],
        status: "active",
      },
    }),
    prisma.salesListing.create({
      data: {
        userId: customers[3].id,
        title: "2022 E-Z-GO Express L6 — 6-seater, family ready",
        make: "E-Z-GO",
        model: "Express L6",
        year: 2022,
        mileage: 4800,
        price: 290000,
        transmission: "automatic",
        fuelType: "gasoline",
        color: "Sand Beige",
        description:
          "Kawasaki gas engine, perfect for North Coast or Sahel. Bench seats, rain enclosure, all-terrain tires. Recently serviced — battery, brakes, tires all checked.",
        images: ["https://picsum.photos/seed/golf-cart-ezgo-1/800/600"],
        status: "active",
      },
    }),
  ]);

  // ─── Repair Requests (golf-cart faults) ──────────────────
  await prisma.repairRequest.create({
    data: {
      userId: customers[1].id,
      vehicleId: vehicles[2].id,
      description:
        "Battery doesn't hold charge after 15 km — used to do 40 km on a full charge. Needs diagnostic.",
      category: "electrical",
      priority: "medium",
      status: "assigned",
      assignedMechanicId: salesAgents[0].id,
      preferredDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      estimatedCost: 800,
    },
  });

  // ─── Support Tickets & KB ────────────────────────────────
  await prisma.supportTicket.create({
    data: {
      userId: customers[2].id,
      subject: "Refund request for cancelled booking",
      status: "open",
      priority: "high",
      assignedAgentId: salesAgents[1].id,
    },
  });

  await prisma.kBArticle.createMany({
    data: [
      {
        title: "How to book your first rental",
        content:
          "Open the TrendyWheels app, browse vehicles by location, select dates, confirm payment. You're set!",
        category: "Getting Started",
      },
      {
        title: "Cancellation & refund policy",
        content:
          "Free cancellation up to 24 hours before pickup. After that, 50% refund. No-shows are non-refundable.",
        category: "Payments",
      },
      {
        title: "Selling your vehicle on TrendyWheels",
        content:
          "List your car in 3 minutes: add photos, description, price. Buyers will contact you through the app.",
        category: "Selling",
      },
    ],
  });

  console.log("✓ Seeded sales, repairs, support, KB");

  // ─── CRM: leads from existing customers + assigned to sales ─
  const leadStatuses: Array<"new" | "contacted" | "qualified" | "proposal" | "won" | "lost"> = [
    "new",
    "contacted",
    "qualified",
    "proposal",
    "won",
  ];
  await Promise.all(
    customers.map(async (c, i) => {
      const owner = salesAgents[i % salesAgents.length];
      const status = leadStatuses[i % leadStatuses.length];
      const value = 2000 + Math.floor(Math.random() * 23000);
      const ttl = 24 * 60 * 60 * 1000;
      const lead = await prisma.lead.create({
        data: {
          customerId: c.id,
          contactName: c.name,
          contactPhone: c.phone,
          contactEmail: c.email,
          source: "signup",
          status,
          estimatedValue: value,
          ownerId: owner.id,
          assignedAt: new Date(),
          claimDeadline: new Date(Date.now() + ttl),
          lastActivityAt: new Date(Date.now() - i * 60 * 60 * 1000),
          closedAt: status === "won" ? new Date() : null,
        },
      });
      await prisma.leadActivity.createMany({
        data: [
          { leadId: lead.id, actorId: null, type: "created", body: "Auto-created from signup" },
          {
            leadId: lead.id,
            actorId: null,
            type: "assigned",
            body: `Auto-assigned to ${owner.name}`,
          },
          ...(status !== "new"
            ? [{ leadId: lead.id, actorId: owner.id, type: "call", body: "Initial outreach call" }]
            : []),
          ...(status === "won"
            ? [
                {
                  leadId: lead.id,
                  actorId: owner.id,
                  type: "won",
                  body: "Closed-won — booking confirmed",
                },
              ]
            : []),
        ],
      });
    }),
  );
  console.log("✓ Seeded CRM leads + activities");

  // ─── God Mode + customer features ──────────────────────
  await prisma.promoCode.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.businessHours.deleteMany();

  const inOneMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.promoCode.createMany({
    data: [
      { code: "SUMMER20", kind: "percent", value: 20, appliesTo: "booking", expiresAt: inOneMonth },
      { code: "WELCOME50", kind: "fixed", value: 50, appliesTo: "booking", usageLimit: 100 },
      { code: "RESORT10", kind: "percent", value: 10, appliesTo: "both" },
    ],
  });

  await prisma.pricingRule.createMany({
    data: [
      {
        name: "Weekend surcharge",
        kind: "weekend",
        surchargePct: 15,
        daysOfWeek: [5, 6],
        dateRanges: [],
        appliesTo: "rent",
      },
      {
        name: "Summer peak",
        kind: "peak",
        surchargePct: 25,
        daysOfWeek: [],
        dateRanges: [{ from: "2026-07-01", to: "2026-08-31" }],
        appliesTo: "rent",
      },
    ],
  });

  await prisma.notificationTemplate.createMany({
    data: [
      {
        key: "booking_confirmed",
        channel: "push",
        bodyMd: "Your {{vehicleName}} is booked. See you on {{startDate}}!",
        variables: [{ name: "vehicleName" }, { name: "startDate" }],
      },
      {
        key: "booking_reminder",
        channel: "push",
        bodyMd: "Pickup tomorrow! Your {{vehicleName}} starts at {{startDate}}.",
        variables: [{ name: "vehicleName" }, { name: "startDate" }],
      },
      {
        key: "lead_assigned",
        channel: "push",
        bodyMd: "New lead assigned: {{contactName}}. Call within 30 minutes.",
        variables: [{ name: "contactName" }],
      },
      {
        key: "lead_reassigned",
        channel: "push",
        bodyMd: "Lead reassigned: {{contactName}} was taken back.",
        variables: [{ name: "contactName" }],
      },
      {
        key: "booking_completed",
        channel: "email",
        subject: "How was your trip?",
        bodyMd: "Thanks for riding with TrendyWheels. Rate your trip and earn loyalty points.",
        variables: [],
      },
    ],
  });

  await prisma.featureFlag.createMany({
    data: [
      {
        key: "mobile.offline_mode",
        enabled: false,
        description: "Cache vehicle list for offline browsing",
      },
      { key: "crm.auto_assign", enabled: true, description: "Round-robin assignment of new leads" },
      {
        key: "customer.referrals",
        enabled: true,
        description: "Referral program (refer-a-friend)",
      },
      { key: "customer.reviews", enabled: true, description: "Booking review submissions" },
      {
        key: "customer.loyalty_redemption",
        enabled: true,
        description: "Allow points redemption at checkout",
      },
    ],
  });

  await prisma.holiday.createMany({
    data: [
      { date: new Date("2026-04-13"), name: "Eid al-Fitr (Day 1)", closed: false },
      { date: new Date("2026-04-14"), name: "Eid al-Fitr (Day 2)", closed: false },
    ],
  });

  await prisma.businessHours.createMany({
    data: Array.from({ length: 7 }, (_, day) => ({
      dayOfWeek: day,
      openHHMM: day === 0 ? "10:00" : "08:00",
      closeHHMM: "23:00",
      locationId: null,
      active: true,
    })),
  });
  console.log(
    "✓ Seeded God-Mode config (3 promo codes, 2 pricing rules, 5 templates, 5 flags, 2 holidays, 7 business-hour rows)",
  );

  console.log("\n🎉 Seed complete!\n");
  console.log("Logins (3-role model):");
  console.log("  admin@trendywheelseg.com      / Admin@123!     (superadmin)");
  console.log(
    "  amira@trendywheelseg.com      / Sales@123!     (sales · also handles inventory + support)",
  );
  console.log("  youssef@trendywheelseg.com    / Sales@123!     (sales)");
  console.log("  rana@trendywheelseg.com       / Sales@123!     (sales)");
  console.log("  mohamed@example.com           / Customer@123!  (customer)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
