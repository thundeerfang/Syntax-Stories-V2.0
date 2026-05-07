import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createClient } from 'redis';
import {
  dailyStreakGoldenCases,
  dailyStreakGoldenExpected,
  evalApplyDailyStreakHash,
} from '../streak/index.js';
import type { DailyStreakState } from '../streak/applyDailyStreakTransition.js';

const runRedis = process.env.RUN_REDIS_TESTS === '1' && Boolean(process.env.REDIS_URL);

const describeRedis = runRedis ? describe : describe.skip;

describeRedis('Lua applyDailyStreakHash golden parity (RUN_REDIS_TESTS=1 + REDIS_URL)', () => {
  const url = process.env.REDIS_URL as string;
  const client = createClient({ url });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.quit();
  });

  async function seedStreak(key: string, state: DailyStreakState): Promise<void> {
    await client.del(key);
    const fields: Record<string, string> = {
      current: String(state.current),
      longest: String(state.longest),
    };
    if (state.lastDay != null) {
      fields.lastDay = state.lastDay;
    }
    await client.hSet(key, fields);
  }

  dailyStreakGoldenCases.forEach((input, i) => {
    it(`case ${i}: matches TS reference`, async () => {
      const key = `streak:lua:golden:test:${i}`;
      await seedStreak(key, input);
      const out = await evalApplyDailyStreakHash(client, key, input.today, input.yesterday);
      const exp = dailyStreakGoldenExpected[i];
      expect(out.applied).toBe(exp.applied);
      expect(out.current).toBe(exp.current);
      expect(out.longest).toBe(exp.longest);
      expect(out.lastDay).toBe(exp.lastDay);

      const h = await client.hGetAll(key);
      expect(Number(h.current)).toBe(exp.current);
      expect(Number(h.longest)).toBe(exp.longest);
      expect(h.lastDay).toBe(exp.lastDay);
    });
  });
});
