import { PrismaClient } from "@trendywheels/db";

import { logger } from "../utils/logger.js";

export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
  ],
});

prisma.$on("error" as never, (e: unknown) => {
  logger.error(e, "Prisma error");
});
