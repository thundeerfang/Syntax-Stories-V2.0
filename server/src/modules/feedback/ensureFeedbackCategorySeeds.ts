import { formatDateTimeIst } from '../../utils/ist.js';
import { FeedbackCategoryModel } from '../../models/FeedbackCategory.js';

const SEEDS: Array<{
  slug: string;
  label: string;
  sortOrder: number;
}> = [
  { slug: 'bug-report', label: 'Bug report', sortOrder: 10 },
  { slug: 'ux-issue', label: 'UX issue', sortOrder: 20 },
  { slug: 'content-quality', label: 'Content quality', sortOrder: 30 },
  { slug: 'adult-content', label: 'Adult / sensitive content', sortOrder: 40 },
  { slug: 'feature-suggestion', label: 'Feature suggestion', sortOrder: 50 },
  { slug: 'other', label: 'Other', sortOrder: 90 },
];

/**
 * Idempotent defaults for feedback categories. Future admin panel can add rows or toggle `active`.
 */
export async function ensureFeedbackCategorySeeds(): Promise<void> {
  const ist = formatDateTimeIst();
  for (const row of SEEDS) {
    await FeedbackCategoryModel.updateOne(
      { slug: row.slug },
      {
        $setOnInsert: {
          slug: row.slug,
          label: row.label,
          sortOrder: row.sortOrder,
          active: true,
          isSystemSeed: true,
          createdByLabel: 'system',
          updatedByLabel: 'system',
          createdAtIst: ist,
          updatedAtIst: ist,
        },
      },
      { upsert: true }
    );
  }
}
