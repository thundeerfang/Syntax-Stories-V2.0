import { Queue, Worker } from "bullmq";
import { env } from "../../config/env.js";
import { getRedis } from "../../config/redis.js";
import {
  enqueueAuthEmail as enqueueRedisList,
  type AuthEmailJob,
} from "./authEmailQueue.js";
import { sendAuthEmail } from "../../infrastructure/mail/sendAuthEmail.js";
import { buildOtpEmail } from "../../infrastructure/mail/emailTemplates.js";
const QUEUE_NAME = "auth-email";
let queue: Queue<AuthEmailJob> | null = null;
let workerStarted = false;
function redisConnection() {
  const url = env.REDIS_URL;
  if (!url) return null;
  return { url };
}
async function processAuthEmailJob(job: AuthEmailJob): Promise<void> {
  if (job.type === "admin_invite_otp") {
    await sendAuthEmail({
      to: job.email,
      subject: "Verify admin operator email — Syntax Stories",
      html: buildOtpEmail({
        kicker: "Admin Platform",
        title: "Operator Verification",
        intro:
          "Use this code to verify the work email for a new Syntax Stories dashboard operator.",
        codeLabel: "Operator Code",
        code: job.code,
        ttlMin: job.ttlMin,
        notice: "This admin verification code expires in",
        footerNote:
          "Admin operator codes should only be used in the Syntax Stories admin dashboard.",
        footerLabel: "Transactional admin email.",
      }),
    });
  }
}
export async function enqueueAuthEmailBullmq(
  job: AuthEmailJob,
): Promise<boolean> {
  if (!env.FEATURE_AUTH_EMAIL_BULLMQ || !getRedis()) {
    return enqueueRedisList(job);
  }
  const conn = redisConnection();
  if (!conn) return enqueueRedisList(job);
  if (!queue) {
    queue = new Queue<AuthEmailJob>(QUEUE_NAME, { connection: conn });
  }
  try {
    await queue.add(job.type, job, {
      removeOnComplete: 500,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
    return true;
  } catch {
    return enqueueRedisList(job);
  }
}
export async function startAuthEmailBullmqWorker(): Promise<void> {
  if (workerStarted) return;
  if (!env.FEATURE_AUTH_EMAIL_BULLMQ || !getRedis()) {
    const { startAuthEmailQueueWorker } = await import("./authEmailQueue.js");
    await startAuthEmailQueueWorker();
    return;
  }
  const conn = redisConnection();
  if (!conn) return;
  const worker = new Worker<AuthEmailJob>(
    QUEUE_NAME,
    async (job) => {
      await processAuthEmailJob(job.data);
    },
    { connection: conn, concurrency: 2 },
  );
  worker.on("failed", (job, err) => {
    console.error("[auth-email-bullmq] failed", job?.id, err.message);
  });
  workerStarted = true;
  console.log("[IAM] Auth email BullMQ worker started");
}
