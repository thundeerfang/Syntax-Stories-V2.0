import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

/** Full Lua source for HASH-only `applyDailyStreakTransition` (§33 golden parity). */
export const APPLY_DAILY_STREAK_HASH_LUA = readFileSync(
  join(dir, 'lua', 'applyDailyStreakHash.lua'),
  'utf8'
);
