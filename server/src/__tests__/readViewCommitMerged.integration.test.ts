import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createClient } from 'redis';
import { redisKeys } from '../shared/redis/keys.js';
import { evalReadViewCommitMerged } from '../services/readViewCommitRedis.js';
import { readDayZsetScoreMs, readDaysTrimMinRetainMsUtc } from '../services/readStreakZset.js';
import {
  MIN_READ_COMMIT_DWELL_MS,
  READ_VIEW_ACK_TTL_SEC,
} from '../services/blogReadView.constants.js';

const runRedis = process.env.RUN_REDIS_TESTS === '1' && Boolean(process.env.REDIS_URL);
const describeRedis = runRedis ? describe : describe.skip;

describeRedis('readViewCommitMerged Lua (RUN_REDIS_TESTS=1 + REDIS_URL)', () => {
  const url = process.env.REDIS_URL as string;
  const client = createClient({ url });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  it('consumes session, sets ack, updates streak and zset', async () => {
    const sessionId = `jest-sess-${Date.now()}`;
    const userId = `507f1f77bcf86cd799439011`;
    const postId = `507f1f77bcf86cd799439012`;
    const sk = redisKeys.readStreak.viewSession(sessionId);
    const streakKey = redisKeys.readStreak.dailyHash(userId);
    const zKey = redisKeys.readStreak.readDaysZset(userId);
    const ackKey = redisKeys.readStreak.viewCommitAck(userId, sessionId);

    await client.del([sk, streakKey, zKey, ackKey]);
    const now = new Date();
    const today = '2030-06-15';
    const yesterday = '2030-06-14';
    await client.hSet(sk, {
      userId,
      postId,
      startTime: String(Date.now() - MIN_READ_COMMIT_DWELL_MS - 1),
      used: '0',
    });

    const out = await evalReadViewCommitMerged(
      client,
      [sk, streakKey, zKey, ackKey],
      {
        today,
        yesterday,
        zsetScoreMs: readDayZsetScoreMs(today),
        trimMinScoreStr: String(readDaysTrimMinRetainMsUtc(now)),
        lastUpdatedMs: String(now.getTime()),
        userId,
        postId,
        ackTtlSeconds: READ_VIEW_ACK_TTL_SEC,
      }
    );

    expect([0, 1]).toContain(out.status);
    expect(out.lastDay).toBe(today);
    expect(await client.exists(sk)).toBe(0);
    expect(await client.get(ackKey)).toBe('1');
    expect(await client.zScore(zKey, today)).toBe(readDayZsetScoreMs(today));

    await client.del([streakKey, zKey, ackKey]);
  });

  it('returns status 2 when ack already set', async () => {
    const sessionId = `jest-sess2-${Date.now()}`;
    const userId = `507f1f77bcf86cd799439021`;
    const postId = `507f1f77bcf86cd799439022`;
    const sk = redisKeys.readStreak.viewSession(sessionId);
    const streakKey = redisKeys.readStreak.dailyHash(userId);
    const zKey = redisKeys.readStreak.readDaysZset(userId);
    const ackKey = redisKeys.readStreak.viewCommitAck(userId, sessionId);

    await client.del([sk, streakKey, zKey, ackKey]);
    await client.set(ackKey, '1', { EX: 60 });

    const now = new Date();
    const today = '2030-07-01';
    const yesterday = '2030-06-30';

    const out = await evalReadViewCommitMerged(
      client,
      [sk, streakKey, zKey, ackKey],
      {
        today,
        yesterday,
        zsetScoreMs: readDayZsetScoreMs(today),
        trimMinScoreStr: String(readDaysTrimMinRetainMsUtc(now)),
        lastUpdatedMs: String(now.getTime()),
        userId,
        postId,
        ackTtlSeconds: READ_VIEW_ACK_TTL_SEC,
      }
    );

    expect(out.status).toBe(2);
    await client.del(ackKey);
  });
});
