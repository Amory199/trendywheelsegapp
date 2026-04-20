/**
 * BullMQ workers. Run as a separate process: `tsx src/workers/index.ts`.
 */
import { Worker } from "bullmq";

import { prisma } from "../config/database.js";
import { queueConnection } from "../queues/index.js";
import { logger } from "../utils/logger.js";

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
    await prisma.notification.create({
      data: {
        userId: job.data.userId,
        type: job.data.type,
        title: job.data.title,
        body: job.data.body,
        data: (job.data.data ?? {}) as object,
      },
    });
    logger.info({ userId: job.data.userId, type: job.data.type }, "Notification stored");
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
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        type: "booking_reminder",
        title: "Booking reminder",
        body: `Your ${booking.vehicle.name} pickup starts soon.`,
        data: { bookingId: booking.id },
      },
    });
  },
  { connection: queueConnection },
);

for (const w of [notificationsWorker, emailWorker, reminderWorker]) {
  w.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "Job failed"));
  w.on("completed", (job) => logger.debug({ jobId: job.id }, "Job completed"));
}

logger.info("Workers started: notifications, emails, reminders");
