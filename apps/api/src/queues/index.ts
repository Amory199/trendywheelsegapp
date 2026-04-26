import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "../config/env.js";

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const notificationsQueue = new Queue("notifications", { connection });
export const emailQueue = new Queue("emails", { connection });
export const reminderQueue = new Queue("reminders", { connection });
export const remindersQueue = reminderQueue;
export const otpCleanupQueue = new Queue("otp-cleanup", { connection });
export const bookingReminderSchedulerQueue = new Queue("booking-reminder-scheduler", { connection });
export const alertEvaluatorQueue = new Queue("alert-evaluator", { connection });
export const leadSweeperQueue = new Queue("lead-sweeper", { connection });

export const queueConnection = connection;

// Schedule recurring sweeps. Safe to call repeatedly — BullMQ dedupes by jobId.
export async function scheduleRecurringSweeps(): Promise<void> {
  await otpCleanupQueue.add(
    "otp-cleanup-tick",
    {},
    {
      jobId: "otp-cleanup-recurring",
      repeat: { pattern: "*/15 * * * *" },
      removeOnComplete: true,
      removeOnFail: 50,
    },
  );
  await bookingReminderSchedulerQueue.add(
    "booking-reminder-scheduler-tick",
    {},
    {
      jobId: "booking-reminder-scheduler-recurring",
      repeat: { pattern: "*/15 * * * *" },
      removeOnComplete: true,
      removeOnFail: 50,
    },
  );
  await alertEvaluatorQueue.add(
    "alert-evaluator-tick",
    {},
    {
      jobId: "alert-evaluator-recurring",
      repeat: { pattern: "*/15 * * * *" },
      removeOnComplete: true,
      removeOnFail: 50,
    },
  );
  await leadSweeperQueue.add(
    "lead-sweeper-tick",
    {},
    {
      jobId: "lead-sweeper-recurring",
      repeat: { pattern: "*/5 * * * *" },
      removeOnComplete: true,
      removeOnFail: 50,
    },
  );
}
