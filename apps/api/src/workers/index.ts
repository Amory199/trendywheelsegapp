/**
 * BullMQ workers. Run as a separate process: `tsx src/workers/index.ts`.
 */
import { Worker } from "bullmq";

import { prisma } from "../config/database.js";
import { sweepStaleLeads } from "../modules/crm/service.js";
import { queueConnection, scheduleRecurringSweeps } from "../queues/index.js";
import { getIO } from "../utils/io-registry.js";
import { logger } from "../utils/logger.js";

void scheduleRecurringSweeps().catch((err) =>
  logger.error({ err }, "Failed to schedule recurring sweeps"),
);

interface NotifyJob {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface EmailJob {
  to: string;
  subject: string;
  html: string;
}

interface ReminderJob {
  bookingId: string;
}

const notificationsWorker = new Worker<NotifyJob>(
  "notifications",
  async (job) => {
    const notification = await prisma.notification.create({
      data: {
        userId: job.data.userId,
        type: job.data.type,
        title: job.data.title,
        body: job.data.body,
        data: (job.data.data ?? {}) as object,
      },
    });
    logger.info({ userId: job.data.userId, type: job.data.type }, "Notification stored");

    const io = getIO();
    if (io) {
      io.of("/notifications").to(`user:${job.data.userId}`).emit("notification:new", notification);
    }
  },
  { connection: queueConnection },
);

const emailWorker = new Worker<EmailJob>(
  "emails",
  async (job) => {
    // TODO: integrate SendGrid when API key provided
    logger.info({ to: job.data.to, subject: job.data.subject }, "Email queued (stub)");
  },
  { connection: queueConnection },
);

const reminderWorker = new Worker<ReminderJob>(
  "reminders",
  async (job) => {
    const booking = await prisma.booking.findUnique({
      where: { id: job.data.bookingId },
      include: { user: true, vehicle: true },
    });
    if (!booking) return;
    const notification = await prisma.notification.create({
      data: {
        userId: booking.userId,
        type: "booking_reminder",
        title: "Booking reminder",
        body: `Your ${booking.vehicle.name} pickup starts soon.`,
        data: { bookingId: booking.id },
      },
    });
    const io = getIO();
    if (io) {
      io.of("/notifications").to(`user:${booking.userId}`).emit("notification:new", notification);
    }
  },
  { connection: queueConnection },
);

// Periodic sweep: delete OTP codes past their expiresAt. Runs every 15 minutes.
const otpCleanupWorker = new Worker<Record<string, never>>(
  "otp-cleanup",
  async () => {
    const result = await prisma.otpCode.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      logger.info({ purged: result.count }, "Expired OTP codes purged");
    }
  },
  { connection: queueConnection },
);

// Periodic sweep: evaluate fleet against AlertConfig thresholds and emit AlertEvent rows.
const alertEvaluatorWorker = new Worker<Record<string, never>>(
  "alert-evaluator",
  async () => {
    const config =
      (await prisma.alertConfig.findFirst({ orderBy: { updatedAt: "desc" } })) ??
      (await prisma.alertConfig.create({ data: {} }));

    const [totalVehicles, rentedVehicles, dueMaintenance, hotVehicles] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: "rented" } }),
      prisma.vehicleMaintenance.findMany({
        where: {
          completedAt: null,
          scheduledAt: {
            lte: new Date(Date.now() + config.maintenanceDueDays * 24 * 60 * 60 * 1000),
          },
        },
        select: { id: true, vehicleId: true, type: true, scheduledAt: true },
      }),
      prisma.$queryRaw<Array<{ vehicleId: string; count: bigint }>>`
        SELECT vehicle_id AS "vehicleId", COUNT(*)::bigint AS count
        FROM repair_requests
        WHERE status IN ('submitted', 'assigned', 'in-progress')
        GROUP BY vehicle_id
        HAVING COUNT(*) > ${config.maxConcurrentRepairs}
      `,
    ]);

    // Utilization
    const utilizationPct =
      totalVehicles > 0 ? Math.round((rentedVehicles / totalVehicles) * 100) : 0;
    const existingUtilization = await prisma.alertEvent.findFirst({
      where: { type: "utilization-high", resolvedAt: null },
    });
    if (utilizationPct >= config.utilizationMaxPct && !existingUtilization) {
      await prisma.alertEvent.create({
        data: {
          type: "utilization-high",
          severity: "warning",
          message: `Fleet utilization at ${utilizationPct}% (threshold ${config.utilizationMaxPct}%)`,
        },
      });
    } else if (utilizationPct < config.utilizationMaxPct && existingUtilization) {
      await prisma.alertEvent.update({
        where: { id: existingUtilization.id },
        data: { resolvedAt: new Date() },
      });
    }

    // Maintenance due
    for (const m of dueMaintenance) {
      const exists = await prisma.alertEvent.findFirst({
        where: { type: "maintenance-due", vehicleId: m.vehicleId, resolvedAt: null },
      });
      if (!exists) {
        await prisma.alertEvent.create({
          data: {
            type: "maintenance-due",
            severity: "info",
            message: `${m.type} maintenance due ${new Date(m.scheduledAt).toLocaleDateString()}`,
            vehicleId: m.vehicleId,
          },
        });
      }
    }

    // Repair stack
    for (const v of hotVehicles) {
      if (!v.vehicleId) continue;
      const exists = await prisma.alertEvent.findFirst({
        where: { type: "repair-stack", vehicleId: v.vehicleId, resolvedAt: null },
      });
      if (!exists) {
        await prisma.alertEvent.create({
          data: {
            type: "repair-stack",
            severity: "critical",
            message: `${Number(v.count)} open repairs on this vehicle (threshold ${config.maxConcurrentRepairs})`,
            vehicleId: v.vehicleId,
          },
        });
      }
    }

    logger.debug(
      { utilizationPct, dueMaintenance: dueMaintenance.length },
      "Alert evaluation tick",
    );
  },
  { connection: queueConnection },
);

// Periodic sweep: enqueue reminder jobs for bookings pickup-ing in ~24h. Runs every 15 minutes.
const bookingReminderSchedulerWorker = new Worker<Record<string, never>>(
  "booking-reminder-scheduler",
  async () => {
    const windowStart = new Date(Date.now() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000);
    const due = await prisma.booking.findMany({
      where: {
        status: "confirmed",
        startDate: { gte: windowStart, lte: windowEnd },
      },
      select: { id: true },
    });
    const { remindersQueue } = await import("../queues/index.js");
    for (const b of due) {
      await remindersQueue.add(
        `reminder-${b.id}`,
        { bookingId: b.id },
        { jobId: `reminder-${b.id}`, removeOnComplete: true, removeOnFail: 50 },
      );
    }
    if (due.length > 0) {
      logger.info({ enqueued: due.length }, "Booking reminders enqueued");
    }
  },
  { connection: queueConnection },
);

// Sweep leads whose claim deadline has expired → reassign via round-robin.
const leadSweeperWorker = new Worker<Record<string, never>>(
  "lead-sweeper",
  async () => {
    const result = await sweepStaleLeads();
    if (result.reassigned > 0) {
      logger.info({ reassigned: result.reassigned }, "Lead sweeper tick");
    }
  },
  { connection: queueConnection },
);

for (const w of [
  notificationsWorker,
  emailWorker,
  reminderWorker,
  otpCleanupWorker,
  bookingReminderSchedulerWorker,
  alertEvaluatorWorker,
  leadSweeperWorker,
]) {
  w.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Job failed");
    void import("../utils/error-sink.js").then(({ writeError }) =>
      writeError({
        level: "error",
        source: "worker",
        message: `Job failed (${w.name}): ${err.message}`,
        stack: err.stack ?? null,
        metadata: {
          worker: w.name,
          jobId: job?.id ?? null,
          jobName: job?.name ?? null,
          attempts: job?.attemptsMade ?? null,
          data: job?.data ?? null,
        },
      }),
    );
  });
  w.on("error", (err) => {
    logger.error({ err, worker: w.name }, "Worker error");
    void import("../utils/error-sink.js").then(({ writeError }) =>
      writeError({
        level: "error",
        source: "worker",
        message: `Worker runtime error (${w.name}): ${err.message}`,
        stack: err.stack ?? null,
        metadata: { worker: w.name },
      }),
    );
  });
  w.on("completed", (job) => logger.debug({ jobId: job.id }, "Job completed"));
}

logger.info(
  "Workers started: notifications, emails, reminders, otp-cleanup, booking-reminder-scheduler, alert-evaluator, lead-sweeper",
);
