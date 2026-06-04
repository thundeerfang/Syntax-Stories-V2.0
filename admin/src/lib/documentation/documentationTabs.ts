export const DOCUMENTATION_TAB_KEYS = [
  'overview',
  'architecture',
  'cms-workflow',
  'api-contracts',
  'publishing',
] as const;

export type DocumentationTabKey = (typeof DOCUMENTATION_TAB_KEYS)[number];

export function documentationTabFromQuery(raw: string | null): DocumentationTabKey {
  if (raw && (DOCUMENTATION_TAB_KEYS as readonly string[]).includes(raw)) {
    return raw as DocumentationTabKey;
  }
  return 'overview';
}

export function documentationTabHref(tab: DocumentationTabKey): string {
  return tab === 'overview' ? '/documentation' : `/documentation?tab=${tab}`;
}
