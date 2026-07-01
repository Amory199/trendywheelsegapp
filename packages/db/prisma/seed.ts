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
      // Phone is a Firebase test phone (Console fixed verification code 100001),
      // listed in STAFF_TEST_PHONES so the firebase-token endpoint issues an
      // admin JWT instead of rejecting on the customer-only check.
      phone: "+201500001001",
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
        // Phone is a Firebase test phone (fixed code 100002), in
        // STAFF_TEST_PHONES so phone auth issues a sales JWT.
        phone: "+201500001002",
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
      type: "ON_ROAD" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 600,
      location: "Marassi Marina",
      features: ["Headlights", "USB Charging", "Bluetooth Speaker", "Sun Canopy"],
    },
    {
      name: "E-Z-GO RXV Lithium",
      type: "ON_ROAD" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 550,
      location: "El Gouna",
      features: ["Lithium Battery", "Premium Seats", "LED Lights", "Quiet Motor"],
    },
    {
      name: "Yamaha Drive2 PTV",
      type: "ON_ROAD" as const,
      seating: 4,
      fuelType: "gasoline" as const,
      transmission: "automatic" as const,
      dailyRate: 450,
      location: "Hacienda — Sahel",
      features: ["Cargo Bed", "Cup Holders", "Hard Roof", "All-Terrain Tires"],
    },
    {
      name: "Garia Via 6 Resort",
      type: "OFF_ROAD" as const,
      seating: 6,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 950,
      location: "Telal Soma Bay",
      features: ["Forward 3rd Row", "Premium Upholstery", "Bluetooth", "Wireless Charging"],
    },
    {
      name: "Club Car Villager 6",
      type: "OFF_ROAD" as const,
      seating: 6,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 850,
      location: "Marina 6 — North Coast",
      features: ["Bench Seats", "USB Ports", "Rain Enclosure", "All-Terrain Tires"],
    },
    {
      name: "Hisun Sector E1 6P",
      type: "OFF_ROAD" as const,
      seating: 6,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 800,
      location: "Diplo 4 — New Cairo",
      features: ["Independent Suspension", "Headlights", "Cargo Rack", "Tow Hitch"],
    },
    {
      name: "Garia Via LED Edition",
      type: "LUXURY" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 1200,
      location: "Marassi Marina",
      features: ["RGB LED Underglow", "Premium Audio", "Glass Roof", "Wireless Charging"],
    },
    {
      name: "Star EV Capella LED Lounge",
      type: "LUXURY" as const,
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

  // ─── Golf-cart product universe (TRACK AA) ────────────────
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.tradeInQuote.deleteMany({});
  await prisma.transportRequest.deleteMany({});
  await prisma.product.deleteMany({});

  const cartNew = [
    {
      name: "Club Car Onward 4P (2026)",
      brand: "Club Car",
      model: "Onward 4P",
      year: 2026,
      priceEgp: 480_000,
      image: "club-car-onward-4p",
    },
    {
      name: "E-Z-GO RXV Lithium (2026)",
      brand: "E-Z-GO",
      model: "RXV Lithium",
      year: 2026,
      priceEgp: 440_000,
      image: "ezgo-rxv-lithium",
    },
    {
      name: "Garia Via 6 Resort (2026)",
      brand: "Garia",
      model: "Via 6 Resort",
      year: 2026,
      priceEgp: 920_000,
      image: "garia-via-6",
    },
    {
      name: "Star EV Capella LED Lounge",
      brand: "Star EV",
      model: "Capella LED",
      year: 2026,
      priceEgp: 1_350_000,
      image: "star-ev-capella",
    },
    {
      name: "Yamaha Drive2 PTV (2026)",
      brand: "Yamaha",
      model: "Drive2 PTV",
      year: 2026,
      priceEgp: 380_000,
      image: "yamaha-drive2",
    },
    {
      name: "Hisun Sector E1 6P (2026)",
      brand: "Hisun",
      model: "Sector E1 6P",
      year: 2026,
      priceEgp: 720_000,
      image: "hisun-sector-e1",
    },
  ];

  const cartUsed = [
    {
      name: "2024 Club Car Tempo — Single owner",
      brand: "Club Car",
      model: "Tempo",
      year: 2024,
      priceEgp: 280_000,
      image: "used-club-car-tempo",
    },
    {
      name: "2022 E-Z-GO Express L6 — 6 seater",
      brand: "E-Z-GO",
      model: "Express L6",
      year: 2022,
      priceEgp: 220_000,
      image: "used-ezgo-express",
    },
    {
      name: "2023 Yamaha Drive2 — Resort fleet",
      brand: "Yamaha",
      model: "Drive2",
      year: 2023,
      priceEgp: 240_000,
      image: "used-yamaha-drive2",
    },
    {
      name: "2021 Garia Via 4 — Concours",
      brand: "Garia",
      model: "Via 4",
      year: 2021,
      priceEgp: 320_000,
      image: "used-garia-via-4",
    },
    {
      name: "2024 Hisun Sector E1 — Lightly used",
      brand: "Hisun",
      model: "Sector E1",
      year: 2024,
      priceEgp: 460_000,
      image: "used-hisun-sector",
    },
    {
      name: "2020 Club Car Villager 6 — Mass mover",
      brand: "Club Car",
      model: "Villager 6",
      year: 2020,
      priceEgp: 180_000,
      image: "used-club-car-villager",
    },
  ];

  const parts = [
    {
      name: "48V Trojan Lithium battery pack",
      brand: "Trojan",
      priceEgp: 38_000,
      image: "battery-trojan-48v",
    },
    {
      name: "Curtis 1268 motor controller",
      brand: "Curtis",
      priceEgp: 9_500,
      image: "controller-curtis-1268",
    },
    { name: "AC induction motor 5kW", brand: "GE", priceEgp: 14_200, image: "motor-ge-5kw" },
    {
      name: "Front suspension kit (heavy-duty)",
      brand: "JakesLift",
      priceEgp: 6_400,
      image: "suspension-jakes",
    },
    {
      name: "Hydraulic brake caliper set",
      brand: "MadJax",
      priceEgp: 2_800,
      image: "brake-madjax",
    },
    { name: "Steering rack assembly", brand: "OEM", priceEgp: 4_200, image: "steering-oem" },
    {
      name: '10" alloy wheel set (4 wheels)',
      brand: "RHOX",
      priceEgp: 5_600,
      image: "wheels-rhox-10",
    },
    {
      name: "All-terrain tire (single, 22x10)",
      brand: "Duro",
      priceEgp: 1_400,
      image: "tire-duro",
    },
    {
      name: "On-board charger (48V, 15A)",
      brand: "Lester",
      priceEgp: 7_900,
      image: "charger-lester",
    },
    { name: "OBC fuse + circuit breaker", brand: "Cooper", priceEgp: 380, image: "fuse-cooper" },
    {
      name: "Solenoid 600A heavy-duty",
      brand: "Albright",
      priceEgp: 1_650,
      image: "solenoid-albright",
    },
    { name: "Dash cluster digital", brand: "Curtis", priceEgp: 3_400, image: "dash-curtis" },
  ];

  const accessories = [
    {
      name: "Premium leather seat cover set",
      brand: "MadJax",
      priceEgp: 4_200,
      image: "seat-leather",
    },
    {
      name: "Bluetooth premium audio system",
      brand: "Kicker",
      priceEgp: 8_900,
      image: "audio-kicker",
    },
    { name: "RGB LED underglow kit (full)", brand: "GTW", priceEgp: 3_500, image: "led-underglow" },
    {
      name: "Sun canopy with rain enclosure",
      brand: "Reliable",
      priceEgp: 5_200,
      image: "canopy-rain",
    },
    { name: "Cargo bed conversion kit", brand: "JakesLift", priceEgp: 4_800, image: "cargo-bed" },
    { name: "Cooler cup holder + tray", brand: "Tempo", priceEgp: 1_200, image: "cooler" },
    { name: "Side mirrors + rear-view (set)", brand: "OEM", priceEgp: 980, image: "mirrors" },
    {
      name: "Steering wheel wood-grain upgrade",
      brand: "RHOX",
      priceEgp: 2_400,
      image: "steering-wood",
    },
    {
      name: "Wireless phone charger mount",
      brand: "Anker",
      priceEgp: 1_100,
      image: "wireless-charger",
    },
    {
      name: "Ambient floor lighting (8-color)",
      brand: "GTW",
      priceEgp: 2_800,
      image: "floor-lights",
    },
    {
      name: "Sand-tire upgrade (set of 4)",
      brand: "Carlisle",
      priceEgp: 6_200,
      image: "sand-tires",
    },
    { name: "Dash cam 1080p", brand: "Garmin", priceEgp: 3_900, image: "dashcam" },
  ];

  const allProducts = [
    ...cartNew.map((p, i) => ({
      category: "cart_new" as const,
      name: p.name,
      description: `Brand-new ${p.brand} ${p.model}. Resort-ready. Full warranty.`,
      priceEgp: p.priceEgp,
      images: [`https://picsum.photos/seed/${p.image}-${i}/1200/900`],
      brand: p.brand,
      model: p.model,
      year: p.year,
    })),
    ...cartUsed.map((p, i) => ({
      category: "cart_used" as const,
      name: p.name,
      description: `${p.brand} ${p.model} (${p.year}). Inspected, road-ready, 90-day warranty.`,
      priceEgp: p.priceEgp,
      images: [`https://picsum.photos/seed/${p.image}-${i}/1200/900`],
      brand: p.brand,
      model: p.model,
      year: p.year,
    })),
    ...parts.map((p, i) => ({
      category: "parts" as const,
      name: p.name,
      description: `Genuine ${p.brand} part. OEM-grade replacement.`,
      priceEgp: p.priceEgp,
      images: [`https://picsum.photos/seed/${p.image}-${i}/800/800`],
      brand: p.brand,
      stockCount: 25,
    })),
    ...accessories.map((p, i) => ({
      category: "accessory" as const,
      name: p.name,
      description: `Premium ${p.brand} accessory. Install kit included.`,
      priceEgp: p.priceEgp,
      images: [`https://picsum.photos/seed/${p.image}-${i}/800/800`],
      brand: p.brand,
      stockCount: 40,
    })),
  ];

  await prisma.product.createMany({ data: allProducts });
  console.log(
    `✓ Seeded golf-cart product universe (${cartNew.length} new carts, ${cartUsed.length} used carts, ${parts.length} parts, ${accessories.length} accessories)`,
  );

  console.log("\n🎉 Seed complete!\n");
  console.log("Logins (3-role model):");
  console.log(
    "  admin@trendywheelseg.com      / Admin@123!     (superadmin · phone +201500001001 / Firebase code 100001)",
  );
  console.log(
    "  amira@trendywheelseg.com      / Sales@123!     (sales · phone +201500001002 / Firebase code 100002)",
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
