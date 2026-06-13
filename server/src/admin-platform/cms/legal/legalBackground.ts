import { LegalPolicyRevisionModel, DataDeletionRequestModel } from './models/legal.models.js';
import { verifyRevisionHash } from './legalContentHash.js';
import { legalJobQueue, type LegalJobMessage } from './legalJobQueue.js';
import { env } from '../../../config/env.js';
import { getLegalDbNow } from './legalDbTime.js';

function logJob(msg: LegalJobMessage): void {
  console.log('[legal:job]', msg.type, msg);
}

async function processPublishPurge(
  msg: Extract<LegalJobMessage, { type: 'LEGAL_POLICY_PUBLISHED' }>
): Promise<void> {
  logJob(msg);
  // CDN purge hooks: set env LEGAL_CDN_PURGE_WEBHOOK_URL to integrate later.
}

async function processReconsentFanout(
  msg: Extract<LegalJobMessage, { type: 'LEGAL_RECONSENT_FANOUT' }>
): Promise<void> {
  logJob(msg);
  // Email/push fan-out (§25): integrate with mailer / queue later.
}

const DEFAULT_DELETION_STEPS = ['purge_profile', 'anonymize_pii', 'finalize'];

async function processDeletionPipeline(
  msg: Extract<LegalJobMessage, { type: 'DATA_DELETION_PROCESS' }>
): Promise<void> {
  const maxSteps = 20;
  for (let i = 0; i < maxSteps; i++) {
    const doc = await DataDeletionRequestModel.findById(msg.requestId).exec();
    if (!doc) return;

    if (doc.status === 'requested') {
      const steps = DEFAULT_DELETION_STEPS.map((step) => ({
        step,
        status: 'pending' as const,
      }));
      doc.status = 'processing';
      doc.executionSteps = steps;
      await doc.save();
      continue;
    }

    if (doc.status !== 'processing' || doc.legalHold) return;

    const steps =
      (doc.executionSteps as { step: string; status: string; at?: Date }[] | undefined) ?? [];
    const next = steps.find(
      (s: { status: string }) => s.status === 'pending' || s.status === 'failed'
    );
    if (!next) {
      if (steps.length && steps.every((s: { status: string }) => s.status === 'done')) {
        const now = await getLegalDbNow();
        doc.status = 'completed';
        doc.completedAt = now;
        await doc.save();
      }
      return;
    }

    next.status = 'done';
    next.at = new Date();
    await doc.save();
  }
}

async function runIntegrityAudit(): Promise<void> {
  try {
    const sample = await LegalPolicyRevisionModel.find({ status: 'published' }).limit(50).exec();
    for (const rev of sample) {
      const ok = verifyRevisionHash({
        title: rev.title,
        summary: rev.summary,
        body: rev.body,
        contentHash: rev.contentHash,
      });
      if (!ok) {
        console.error('[legal:integrity] drift', { revisionId: rev.revisionId, kind: rev.kind });
      }
    }
  } catch (e) {
    console.warn('[legal:integrity] skipped:', (e as Error).message);
  }
}

export function startLegalBackgroundJobs(): void {
  const intervalMs = env.LEGAL_JOB_POLL_MS;
  setInterval(() => {
    while (legalJobQueue.length) {
      const msg = legalJobQueue.shift();
      if (!msg) break;
      void (async () => {
        try {
          if (msg.type === 'LEGAL_POLICY_PUBLISHED') await processPublishPurge(msg);
          else if (msg.type === 'LEGAL_RECONSENT_FANOUT') await processReconsentFanout(msg);
          else if (msg.type === 'DATA_DELETION_PROCESS') await processDeletionPipeline(msg);
        } catch (e) {
          console.error('[legal:job] failed', msg, e);
        }
      })();
    }
  }, intervalMs);

  setInterval(() => {
    void runIntegrityAudit();
  }, env.LEGAL_INTEGRITY_INTERVAL_MS);
}
