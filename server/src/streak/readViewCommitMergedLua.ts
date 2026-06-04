import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

/** Full F.1 merged VIEW_COMMIT script (session + HASH + ZSET + ack). */
export const READ_VIEW_COMMIT_MERGED_LUA = readFileSync(
  join(dir, 'lua', 'readViewCommitMerged.lua'),
  'utf8'
);
