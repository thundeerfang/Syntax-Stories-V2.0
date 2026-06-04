import type { HelpIconKey } from '../cms/help/help.icons.js';

export type DocsHelpSeedItem = {
  /** Stable URL slug under `/docs/<slug>`. */
  slug: string;
  title: string;
  /** Short blurb for list cards and SEO summary. */
  summary: string;
  /** Markdown body (must be ≥ 50 characters when published). */
  body: string;
  icon: HelpIconKey;
  sortOrder: number;
  tags?: string[];
};
