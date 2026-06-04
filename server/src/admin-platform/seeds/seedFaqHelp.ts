import { slugifyDisplayName } from '../../shared/slug/slugifyDisplayName.js';
import { NOT_DELETED_FILTER } from '../../shared/db/notDeleted.js';
import { UserModel } from '../../models/User.js';
import { SYNTAX_ADMIN_EMAIL } from './bootstrap.constants.js';
import { helpService } from '../cms/help/help.service.js';
import { HelpArticleModel } from '../cms/help/helpArticle.model.js';
import { HELP_CENTER_CATEGORY } from '../cms/help/help.constants.js';
import { FAQ_HELP_SEED } from './faqHelp.seedData.js';

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
    'No staff user found to own FAQ seed content. Run `npm run seed:admin` first or create an admin user.'
  );
}

export type SeedFaqHelpOptions = {
  /** Skip items whose slug already exists (default true). */
  skipExisting?: boolean;
  /** Publish seeded items (default true). */
  publish?: boolean;
};

export async function seedFaqHelp(options: SeedFaqHelpOptions = {}): Promise<{
  created: number;
  skipped: number;
  published: number;
  failed: number;
}> {
  const skipExisting = options.skipExisting !== false;
  const shouldPublish = options.publish !== false;
  const authorId = await resolveSeedAuthorId();
  const staffRole = 'admin' as const;

  let created = 0;
  let skipped = 0;
  let published = 0;
  let failed = 0;

  for (let i = 0; i < FAQ_HELP_SEED.length; i++) {
    const item = FAQ_HELP_SEED[i];
    const slugPreview = slugifyDisplayName(item.title, { maxLen: 200 });

    if (skipExisting) {
      const existing = await HelpArticleModel.findOne(
        activeHelpFilter({
          category: HELP_CENTER_CATEGORY,
          $or: [{ slug: slugPreview }, { title: item.title }],
        })
      ).lean();
      if (existing) {
        skipped += 1;
        continue;
      }
    }

    try {
      const doc = await helpService.createArticle(authorId, {
        title: item.title,
        summary: item.answer,
        icon: item.icon,
        sortOrder: i,
      });

      created += 1;

      if (shouldPublish) {
        await helpService.publish(authorId, staffRole, String(doc._id));
        published += 1;
      }
    } catch (err) {
      failed += 1;
      console.error(`[seed:faq] Failed "${item.title}":`, err instanceof Error ? err.message : err);
    }
  }

  return { created, skipped, published, failed };
}

/** Soft-delete all help-center FAQ articles. Use with `--reset` only. */
export async function resetFaqHelpSeed(): Promise<number> {
  const result = await HelpArticleModel.updateMany(
    activeHelpFilter({ category: HELP_CENTER_CATEGORY }),
    { $set: { deletedAt: new Date(), status: 'archived' } }
  );
  return result.modifiedCount ?? 0;
}
