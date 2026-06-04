import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';

const STREAM_MAX_LEN = 50_000;

export type AuditStreamEntry = {
  action: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  traceId?: string;
  at: string;
};

/**
 * Append audit event to Redis Stream (Phase 2). Mongo write remains in `writeAuditLog`.
 */
export async function appendAuditStream(entry: AuditStreamEntry): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.xAdd(
      redisKeys.streams.audit,
      '*',
      {
        payload: JSON.stringify(entry),
        action: entry.action,
        actorId: entry.actorId ?? '',
        at: entry.at,
      },
      { TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: STREAM_MAX_LEN } }
    );
  } catch (e) {
    console.warn('[audit-stream] append failed:', (e as Error).message);
  }
}

let processorStarted = false;

/** Lightweight consumer: logs stream entries for observability (extend to ClickHouse/Elastic later). */
export async function startAuditStreamProcessor(): Promise<void> {
  if (processorStarted) return;
  const redis = getRedis();
  if (!redis) return;

  const sub = redis.duplicate();
  await sub.connect();
  processorStarted = true;

  const group = 'audit-processors';
  const consumer = `node-${process.pid}`;

  try {
    await sub.xGroupCreate(redisKeys.streams.audit, group, '0', { MKSTREAM: true });
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (!msg.includes('BUSYGROUP')) throw e;
  }

  void (async () => {
    for (;;) {
      try {
        const rows = await sub.xReadGroup(
          group,
          consumer,
          {
            key: redisKeys.streams.audit,
            id: '>',
          },
          { COUNT: 10, BLOCK: 5000 }
        );

        if (!rows) continue;
        for (const stream of rows) {
          for (const msg of stream.messages) {
            try {
              const payload = msg.message.payload;
              if (payload) {
                const entry = JSON.parse(payload) as AuditStreamEntry;
                console.info(
                  JSON.stringify({
                    event: 'audit_stream',
                    action: entry.action,
                    actorId: entry.actorId,
                    at: entry.at,
                  })
                );
              }
            } catch {
              /* skip bad message */
            }
            await sub.xAck(redisKeys.streams.audit, group, msg.id);
          }
        }
      } catch (e) {
        console.warn('[audit-stream] processor error:', (e as Error).message);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();

  console.log('[IAM] Audit stream processor started');
}
