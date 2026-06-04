import type { IHelpArticle } from './helpArticle.model.js';
import type { HelpArticlePublicDTO } from './help.dto.js';
import { DEFAULT_HELP_ICON, normalizeHelpIcon } from './help.icons.js';

function iso(d: Date | undefined | null): string | null {
  if (!d) return null;
  return d.toISOString();
}

/** Public URL for a published article (help center vs product documentation). */
export function helpCanonicalPath(doc: Pick<IHelpArticle, 'slug' | 'category'>): string {
  const c = (doc.category ?? 'general').toLowerCase();
  if (c === 'documentation') return `/docs/${doc.slug}`;
  return `/help/${doc.slug}`;
}

export function toHelpArticlePublicDTO(
  doc: IHelpArticle,
  opts?: { redirectTo?: string }
): HelpArticlePublicDTO {
  const slug = doc.slug;
  return {
    slug,
    canonicalPath: helpCanonicalPath(doc),
    title: doc.title,
    summary: doc.summary ?? '',
    body: doc.body ?? '',
    bodyFormat: doc.bodyFormat ?? 'markdown',
    category: doc.category ?? 'general',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    icon: normalizeHelpIcon(doc.icon ?? DEFAULT_HELP_ICON),
    sortOrder: typeof doc.sortOrder === 'number' ? doc.sortOrder : 0,
    updatedAt: iso(doc.updatedAt) ?? new Date().toISOString(),
    publishedAt: iso(doc.publishedAt),
    ...(opts?.redirectTo ? { redirectTo: opts.redirectTo } : {}),
  };
}
