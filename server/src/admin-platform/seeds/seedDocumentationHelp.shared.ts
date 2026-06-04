import { Types } from 'mongoose';
import { NOT_DELETED_FILTER } from '../../shared/db/notDeleted.js';
import { UserModel } from '../../models/User.js';
import { SYNTAX_ADMIN_EMAIL } from './bootstrap.constants.js';
import { HelpArticleModel } from '../cms/help/helpArticle.model.js';
import { HelpArticleVersionModel } from '../cms/help/helpArticleVersion.model.js';
import { DOCUMENTATION_CATEGORY } from '../cms/help/help.constants.js';
import { DEFAULT_HELP_ICON, normalizeHelpIcon } from '../cms/help/help.icons.js';
import type { DocsHelpSeedItem } from './documentationHelpSeed.types.js';

function activeHelpFilter(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { $and: [extra, NOT_DELETED_FILTER] };
}

async function resolveSeedAuthorId(): Promise<string> {
  const admin = await UserModel.findOne({ staffRole: 'admin' })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean();
  if (admin?._id) return String(admin._id);

  const bootstrap = await UserModel.findOne({ email: SYNTAX_ADMIN_EMAIL }).select('_id').lean();
  if (bootstrap?._id) return String(bootstrap._id);

  const anyStaff = await UserModel.findOne({ staffRole: { $in: ['admin', 'editor'] } })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean();
  if (anyStaff?._id) return String(anyStaff._id);

  throw new Error(
    'No staff user found to own documentation seed content. Run `npm run seed:admin` first or create an admin user.'
  );
}

export type SeedDocumentationHelpOptions = {
  skipExisting?: boolean;
  publish?: boolean;
  /** Console label prefix, e.g. `seed:docs` or `seed:docs:blogs`. */
  logLabel?: string;
};

export async function seedDocumentationHelp(
  items: DocsHelpSeedItem[],
  options: SeedDocumentationHelpOptions = {}
): Promise<{ created: number; skipped: number; published: number; failed: number }> {
  const logLabel = options.logLabel ?? 'seed:docs';
  const skipExisting = options.skipExisting !== false;
  const shouldPublish = options.publish !== false;
  const authorId = await resolveSeedAuthorId();

  let created = 0;
  let skipped = 0;
  let published = 0;
  let failed = 0;

  for (const item of items) {
    const slug = item.slug.trim().toLowerCase();

    if (skipExisting) {
      const existing = await HelpArticleModel.findOne(
        activeHelpFilter({
          category: DOCUMENTATION_CATEGORY,
          $or: [{ slug }, { title: item.title }],
        })
      ).lean();
      if (existing) {
        skipped += 1;
        continue;
      }
    }

    const summary = item.summary.trim();
    const body = item.body.trim();
    const title = item.title.trim();

    if (!title || !slug) {
      failed += 1;
      console.error(`[${logLabel}] Invalid seed item (missing title or slug): ${item.title}`);
      continue;
    }

    if (shouldPublish && body.length < 50) {
      failed += 1;
      console.error(`[${logLabel}] Body too short for "${title}" (${body.length} chars, need 50)`);
      continue;
    }

    try {
      const taken = await HelpArticleModel.findOne(activeHelpFilter({ slug })).lean();
      if (taken) {
        failed += 1;
        console.error(`[${logLabel}] Slug already in use: ${slug}`);
        continue;
      }

      const now = new Date();
      const isPublished = shouldPublish;
      await HelpArticleModel.create({
        slug,
        slugHistory: [],
        title,
        summary,
        body: isPublished ? body : '',
        bodyFormat: 'markdown',
        category: DOCUMENTATION_CATEGORY,
        tags: item.tags ?? [],
        icon: normalizeHelpIcon(item.icon ?? DEFAULT_HELP_ICON),
        sortOrder: item.sortOrder,
        draftSummary: summary,
        draftBody: body,
        status: isPublished ? 'published' : 'draft',
        isPublished,
        draftVersion: 1,
        publishedVersion: isPublished ? 1 : 0,
        publishedAt: isPublished ? now : null,
        authorId: new Types.ObjectId(authorId),
        contentSchemaVersion: 1,
      });

      created += 1;
      if (isPublished) published += 1;
    } catch (err) {
      failed += 1;
      console.error(`[${logLabel}] Failed "${item.title}":`, err instanceof Error ? err.message : err);
    }
  }

  return { created, skipped, published, failed };
}

/**
 * Hard-delete documentation articles (including trashed rows) so seed slugs can be recreated.
 * `slug` is globally unique on `helparticles`; soft-delete alone blocks `--reset`.
 */
async function hardDeleteDocumentationArticles(
  extraFilter: Record<string, unknown> = {}
): Promise<number> {
  const docs = await HelpArticleModel.find({
    category: DOCUMENTATION_CATEGORY,
    ...extraFilter,
  })
    .select('_id')
    .lean();

  if (docs.length === 0) return 0;

  const ids = docs.map((d) => d._id);
  await HelpArticleVersionModel.deleteMany({ articleId: { $in: ids } });
  const result = await HelpArticleModel.deleteMany({ _id: { $in: ids } });
  return result.deletedCount ?? 0;
}

/** Remove documentation articles matching the given slugs (for blog-only reset). */
export async function resetDocumentationHelpBySlugs(slugs: string[]): Promise<number> {
  const normalized = slugs.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return 0;
  return hardDeleteDocumentationArticles({ slug: { $in: normalized } });
}

/** Remove all documentation articles (full docs reset). */
export async function resetAllDocumentationHelp(): Promise<number> {
  return hardDeleteDocumentationArticles();
}
