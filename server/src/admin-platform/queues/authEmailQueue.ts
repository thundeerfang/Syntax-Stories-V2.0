import { getRedis } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { sendAuthEmail } from "../../infrastructure/mail/sendAuthEmail.js";
export type AuthEmailJob = {
  type: "admin_invite_otp";
  email: string;
  code: string;
  ttlMin: number;
};
let workerStarted = false;
export async function enqueueAuthEmail(job: AuthEmailJob): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.lPush(redisKeys.queues.authEmail, JSON.stringify(job));
    return true;
  } catch {
    return false;
  }
}
async function processAuthEmailJob(job: AuthEmailJob): Promise<void> {
  if (job.type === "admin_invite_otp") {
    await sendAuthEmail({
      to: job.email,
      subject: "Verify admin operator email — Syntax Stories",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333;">
          <h2 style="color: #5f4fe6;">Admin operator verification</h2>
          <p>Use this code to verify the work email for a new dashboard operator:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${job.code}</p>
          <p style="font-size: 14px; color: #666;">Expires in ${job.ttlMin} minute(s).</p>
        </div>
      `,
    });
  }
}
export async function startAuthEmailQueueWorker(): Promise<void> {
  if (workerStarted) return;
  const redis = getRedis();
  if (!redis) return;
  workerStarted = true;
  void (async () => {
    for (;;) {
      try {
        const raw = await redis.brPop(redisKeys.queues.authEmail, 0);
        if (!raw?.element) continue;
        const job = JSON.parse(raw.element) as AuthEmailJob;
        await processAuthEmailJob(job);
      } catch (e) {
        console.error("[auth-email-queue]", e);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  })();
  console.log("[IAM] Auth email queue worker started");
}
