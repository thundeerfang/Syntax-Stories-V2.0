import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createClient } from 'redis';
import {
  readDayZsetScoreMs,
  readDaysTrimMinRetainMsUtc,
  readDaysZsetTrimExclusiveMaxArg,
} from '../services/readStreakZset.js';

const runRedis = process.env.RUN_REDIS_TESTS === '1' && Boolean(process.env.REDIS_URL);
const describeRedis = runRedis ? describe : describe.skip;

describeRedis('readDays ZSET trim boundary (RUN_REDIS_TESTS=1 + REDIS_URL)', () => {
  const url = process.env.REDIS_URL as string;
  const client = createClient({ url });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  it('keeps member whose score equals trimMinRetain (F.4 boundary)', async () => {
    const k = `streak:zset:boundary:${Date.now()}`;
    const trimMin = readDaysTrimMinRetainMsUtc(new Date(Date.UTC(2026, 4, 10)));
    await client.del(k);
    await client.zAdd(k, { score: trimMin, value: 'keep-me' });
    await client.zAdd(k, { score: trimMin - 1, value: 'drop-me' });
    await client.zRemRangeByScore(k, '-inf', readDaysZsetTrimExclusiveMaxArg(trimMin));
    const members = await client.zRangeWithScores(k, 0, -1);
    expect(members).toEqual([{ value: 'keep-me', score: trimMin }]);
    await client.del(k);
  });

  it('readDayZsetScoreMs aligns with trim helper same calendar', () => {
    const day = '2026-05-10';
    expect(readDayZsetScoreMs(day)).toBe(Date.UTC(2026, 4, 10));
  });
});
