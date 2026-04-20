import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "../config/env.js";

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const notificationsQueue = new Queue("notifications", { connection });
export const emailQueue = new Queue("emails", { connection });
export const reminderQueue = new Queue("reminders", { connection });

export const queueConnection = connection;
