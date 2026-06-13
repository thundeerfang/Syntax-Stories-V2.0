import { Queue, Worker } from 'bullmq';
import { env } from '../../config/env.js';
import { getRedis } from '../../config/redis.js';
import { enqueueAuthEmail as enqueueRedisList, type AuthEmailJob } from './authEmailQueue.js';
import { sendAuthEmail } from '../../infrastructure/mail/sendAuthEmail.js';

const QUEUE_NAME = 'auth-email';

let queue: Queue<AuthEmailJob> | null = null;
let workerStarted = false;

function redisConnection() {
  const url = env.REDIS_URL;
  if (!url) return null;
  return { url };
}

async function processAuthEmailJob(job: AuthEmailJob): Promise<void> {
  if (job.type === 'admin_invite_otp') {
    await sendAuthEmail({
      to: job.email,
      subject: 'Verify admin operator email — Syntax Stories',
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

export async function enqueueAuthEmailBullmq(job: AuthEmailJob): Promise<boolean> {
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
      backoff: { type: 'exponential', delay: 2000 },
    });
    return true;
  } catch {
    return enqueueRedisList(job);
  }
}

export async function startAuthEmailBullmqWorker(): Promise<void> {
  if (workerStarted) return;
  if (!env.FEATURE_AUTH_EMAIL_BULLMQ || !getRedis()) {
    const { startAuthEmailQueueWorker } = await import('./authEmailQueue.js');
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
    { connection: conn, concurrency: 2 }
  );

  worker.on('failed', (job, err) => {
    console.error('[auth-email-bullmq] failed', job?.id, err.message);
  });

  workerStarted = true;
  console.log('[IAM] Auth email BullMQ worker started');
}
