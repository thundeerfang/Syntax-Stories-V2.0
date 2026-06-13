import { ensureLocalClamd } from './config/clamavLocal.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { env } from './config/env.js';
import './config/keys.js'; // Ensure PEM keys are loaded (warns if missing)

async function start(): Promise<void> {
  await ensureLocalClamd();
  await connectRedis();
  const {
    startPermissionInvalidationSubscriber,
    startAuditStreamProcessor,
    startAuthEmailBullmqWorker,
  } = await import('./admin-platform/index.js');
  await startPermissionInvalidationSubscriber();
  await startAuditStreamProcessor();
  await startAuthEmailBullmqWorker();
  await connectDatabase();
  try {
    const { backfillReferralConversionsOnce } =
      await import('./services/referral/referralBackfill.service.js');
    await backfillReferralConversionsOnce();
  } catch (e) {
    console.warn('[referral] Backfill skipped:', String(e));
  }
  try {
    const { startGamificationOutboxProcessor, startGamificationWorker } =
      await import('./services/gamification/gamificationWorker.service.js');
    const { startAchievementOutboxProcessor } =
      await import('./services/achievements/achievementOutboxProcessor.service.js');
    const { startAchievementUnlockOutboxConsumer } =
      await import('./services/achievements/achievementUnlockOutbox.service.js');
    await startGamificationOutboxProcessor();
    await startGamificationWorker();
    await startAchievementOutboxProcessor();
    await startAchievementUnlockOutboxConsumer();
  } catch (e) {
    console.warn('[Gamification] Background workers failed to start (API continues):', String(e));
  }
  const { startBillingBackgroundJobs } = await import('./services/billing/billingBackground.js');
  startBillingBackgroundJobs();
  try {
    const { startSearchIndexWorker } = await import('./services/search/searchIndex.service.js');
    await startSearchIndexWorker();
  } catch (e) {
    console.warn('[search] Index worker failed to start (API continues):', String(e));
  }
  const { startLegalBackgroundJobs } =
    await import('./admin-platform/cms/legal/legalBackground.js');
  startLegalBackgroundJobs();
  const { startStorageGuardProbe } =
    await import('./services/platform/storageGuard.service.js');
  startStorageGuardProbe();
  const { default: app } = await import('./app.js');
  app.listen(env.PORT, () => {
    console.log(`[Server] Listening on port ${env.PORT}`);
  });
}

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error('[process] Unhandled rejection (server stays up):', msg);
  if (msg.includes('ENOTFOUND') || msg.includes('MongoServerSelection')) {
    console.error(
      '[MongoDB] Atlas unreachable — verify MONGO_CONN in server/.env, network, and that the cluster is running.'
    );
  }
});

process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught exception:', err);
  process.exit(1);
});

try {
  await start();
} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
