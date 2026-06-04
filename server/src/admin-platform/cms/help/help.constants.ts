/** Help center articles managed via Admin → Help CMS (`/help`). */
export const HELP_CENTER_CATEGORY = 'general';

/** Product documentation served at `/docs` (docs-webapp + webapp). */
export const DOCUMENTATION_CATEGORY = 'documentation';

export function isHelpCenterCategory(category: string | undefined | null): boolean {
  const c = (category ?? HELP_CENTER_CATEGORY).trim().toLowerCase();
  return c === HELP_CENTER_CATEGORY || c === '';
}

/** Mongo filter: only help-center rows (excludes product documentation category). */
export function helpCenterCategoryFilter(): Record<string, unknown> {
  return {
    $or: [
      { category: HELP_CENTER_CATEGORY },
      { category: { $exists: false } },
      { category: '' },
    ],
  };
}
