import { DOCS_BLOGS_HELP_SEED } from './docsBlogsHelp.seedData.js';
import {
  resetDocumentationHelpBySlugs,
  seedDocumentationHelp,
  type SeedDocumentationHelpOptions,
} from './seedDocumentationHelp.shared.js';

export type SeedDocsBlogsHelpOptions = SeedDocumentationHelpOptions;

export async function seedDocsBlogsHelp(options: SeedDocsBlogsHelpOptions = {}) {
  return seedDocumentationHelp(DOCS_BLOGS_HELP_SEED, { logLabel: 'seed:docs:blogs', ...options });
}

/** Remove blog documentation articles only. Use with `--reset` only. */
export async function resetDocsBlogsHelpSeed(): Promise<number> {
  return resetDocumentationHelpBySlugs(DOCS_BLOGS_HELP_SEED.map((item) => item.slug));
}
