import { createClient } from 'redis';
import { READ_VIEW_COMMIT_MERGED_LUA } from '../streak/readViewCommitMergedLua.js';

type RedisClient = ReturnType<typeof createClient>;

export type ViewCommitMergedStatus = 2 | 1 | 0 | -1 | -3;

export type ViewCommitMergedResult = {
  status: ViewCommitMergedStatus;
  current: number;
  longest: number;
  lastDay: string;
};

function coerce(raw: unknown): ViewCommitMergedResult {
  if (!Array.isArray(raw) || raw.length < 4) {
    throw new Error('readViewCommitMerged: unexpected EVAL return shape');
  }
  return {
    status: Number(raw[0]) as ViewCommitMergedStatus,
    current: Number(raw[1]),
    longest: Number(raw[2]),
    lastDay: String(raw[3] ?? ''),
  };
}

export async function evalReadViewCommitMerged(
  client: RedisClient,
  keys: [string, string, string, string],
  argv: {
    today: string;
    yesterday: string;
    zsetScoreMs: number;
    trimMinScoreStr: string;
    lastUpdatedMs: string;
    userId: string;
    postId: string;
    ackTtlSeconds: number;
  }
): Promise<ViewCommitMergedResult> {
  const raw = await client.eval(READ_VIEW_COMMIT_MERGED_LUA, {
    keys,
    arguments: [
      argv.today,
      argv.yesterday,
      String(argv.zsetScoreMs),
      argv.trimMinScoreStr,
      argv.lastUpdatedMs,
      argv.userId,
      argv.postId,
      String(argv.ackTtlSeconds),
    ],
  });
  return coerce(raw);
}
