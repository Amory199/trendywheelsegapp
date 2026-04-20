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
  const adminPassword = await bcrypt.hash("Admin@123!", 12);
  const staffPassword = await bcrypt.hash("Staff@123!", 12);

  const admin = await prisma.user.create({
    data: {
      phone: "+201000000001",
      email: "admin@trendywheelseg.com",
      name: "Mostafa Admin",
      accountType: "admin",
      status: "active",
      passwordHash: adminPassword,
      loyaltyTier: "platinum",
    },
  });

  const supportAgent = await prisma.user.create({
    data: {
      phone: "+201000000002",
      email: "support@trendywheelseg.com",
      name: "Sara Support",
      accountType: "staff",
      status: "active",
      passwordHash: staffPassword,
      loyaltyTier: "gold",
    },
  });

  const mechanic = await prisma.user.create({
    data: {
      phone: "+201000000003",
      email: "mechanic@trendywheelseg.com",
      name: "Ahmed Mechanic",
      accountType: "staff",
      status: "active",
      passwordHash: staffPassword,
      loyaltyTier: "gold",
    },
  });

  const customers = await Promise.all(
    [
      { phone: "+201112223344", name: "Mohamed Hassan", email: "mohamed@example.com" },
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

  console.log(`✓ Created ${2 + 1 + customers.length} users`);

  // ─── Vehicles ────────────────────────────────────────────
  const vehiclesData = [
    {
      name: "Tesla Model 3 Standard",
      type: "FOUR_SEATER" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 2500,
      location: "New Cairo",
      features: ["Autopilot", "Premium Audio", "Glass Roof", "Heated Seats"],
    },
    {
      name: "BYD Han EV",
      type: "FOUR_SEATER" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 2200,
      location: "Sheikh Zayed",
      features: ["360 Camera", "Massage Seats", "Wireless Charging"],
    },
    {
      name: "Toyota Hiace Family",
      type: "SIX_SEATER" as const,
      seating: 6,
      fuelType: "gasoline" as const,
      transmission: "automatic" as const,
      dailyRate: 1800,
      location: "Maadi",
      features: ["AC", "Bluetooth", "Spacious Cargo", "Rear Camera"],
    },
    {
      name: "Hyundai H1 Premium",
      type: "SIX_SEATER" as const,
      seating: 6,
      fuelType: "hybrid" as const,
      transmission: "automatic" as const,
      dailyRate: 2000,
      location: "Heliopolis",
      features: ["Leather Interior", "Sunroof", "Captain Chairs"],
    },
    {
      name: "Mercedes EQS LED",
      type: "LED" as const,
      seating: 5,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 4500,
      location: "Zamalek",
      features: ["Hyperscreen", "AR Navigation", "Burmester Sound", "Air Suspension"],
    },
    {
      name: "Audi e-tron GT LED",
      type: "LED" as const,
      seating: 4,
      fuelType: "electric" as const,
      transmission: "automatic" as const,
      dailyRate: 4200,
      location: "New Cairo",
      features: ["Matrix LED", "Sport Chassis", "Bang & Olufsen"],
    },
    {
      name: "Honda Civic 2024",
      type: "FOUR_SEATER" as const,
      seating: 4,
      fuelType: "gasoline" as const,
      transmission: "automatic" as const,
      dailyRate: 1500,
      location: "Nasr City",
      features: ["Honda Sensing", "Apple CarPlay", "Lane Assist"],
    },
    {
      name: "Kia Carnival Family",
      type: "SIX_SEATER" as const,
      seating: 6,
      fuelType: "gasoline" as const,
      transmission: "automatic" as const,
      dailyRate: 1900,
      location: "October City",
      features: ["8 Seats", "Power Sliding Doors", "Dual Sunroof"],
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

  // Add demo images
  await Promise.all(
    vehicles.flatMap((v, i) =>
      [0, 1, 2].map((idx) =>
        prisma.vehicleImage.create({
          data: {
            vehicleId: v.id,
            url: `https://picsum.photos/seed/${v.id.slice(0, 8)}-${idx}/800/600`,
            sortOrder: idx,
          },
        }),
      ),
    ),
  );

  console.log(`✓ Created ${vehicles.length} vehicles with images`);

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
        totalCost: 7500,
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
        totalCost: 5400,
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
        totalCost: 13500,
      },
    }),
  ]);

  console.log(`✓ Created ${bookings.length} bookings`);

  // ─── Sales Listings ──────────────────────────────────────
  await Promise.all([
    prisma.salesListing.create({
      data: {
        userId: customers[0].id,
        title: "2022 Hyundai Elantra — Excellent Condition",
        make: "Hyundai",
        model: "Elantra",
        year: 2022,
        mileage: 35000,
        price: 650000,
        transmission: "automatic",
        fuelType: "gasoline",
        color: "Pearl White",
        description:
          "Single owner, full service history at authorized dealer. Non-smoker, garage kept. All original paint.",
        images: [
          "https://picsum.photos/seed/elantra1/800/600",
          "https://picsum.photos/seed/elantra2/800/600",
        ],
        status: "active",
      },
    }),
    prisma.salesListing.create({
      data: {
        userId: customers[3].id,
        title: "2020 BMW 320i — Sport Package",
        make: "BMW",
        model: "320i",
        year: 2020,
        mileage: 58000,
        price: 1250000,
        transmission: "automatic",
        fuelType: "gasoline",
        color: "Alpine White",
        description:
          "M-Sport package, panoramic sunroof, Harman Kardon sound system. All maintenance up to date.",
        images: ["https://picsum.photos/seed/bmw1/800/600"],
        status: "active",
      },
    }),
  ]);

  // ─── Repair Requests ─────────────────────────────────────
  await prisma.repairRequest.create({
    data: {
      userId: customers[1].id,
      vehicleId: vehicles[2].id,
      description: "AC not cooling properly. Strange noise when starting engine in the morning.",
      category: "mechanical",
      priority: "medium",
      status: "assigned",
      assignedMechanicId: mechanic.id,
      preferredDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      estimatedCost: 1500,
    },
  });

  // ─── Support Tickets & KB ────────────────────────────────
  await prisma.supportTicket.create({
    data: {
      userId: customers[2].id,
      subject: "Refund request for cancelled booking",
      status: "open",
      priority: "high",
      assignedAgentId: supportAgent.id,
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
  console.log("\n🎉 Seed complete!\n");
  console.log("Admin login: admin@trendywheelseg.com / Admin@123!");
  console.log("Customer phones: +20111222334, +20122333445, +20133444556");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
