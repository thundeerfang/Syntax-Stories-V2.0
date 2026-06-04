import { DOCS_HELP_SEED } from './docsHelp.seedData.js';
import {
  resetAllDocumentationHelp,
  seedDocumentationHelp,
  type SeedDocumentationHelpOptions,
} from './seedDocumentationHelp.shared.js';

export type SeedDocsHelpOptions = SeedDocumentationHelpOptions;

export async function seedDocsHelp(options: SeedDocsHelpOptions = {}) {
  return seedDocumentationHelp(DOCS_HELP_SEED, { logLabel: 'seed:docs', ...options });
}

/** Remove all documentation articles. Use with `--reset` only. */
export async function resetDocsHelpSeed(): Promise<number> {
  return resetAllDocumentationHelp();
}
