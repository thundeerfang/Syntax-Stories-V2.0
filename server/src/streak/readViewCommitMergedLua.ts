import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));
export const READ_VIEW_COMMIT_MERGED_LUA = readFileSync(
  join(dir, "lua", "readViewCommitMerged.lua"),
  "utf8",
);
