import { blogApi } from '@/api/blog';
import {
  toggleFollowedCategorySlug,
  writeFollowedCategorySlugs,
  readFollowedCategorySlugs,
} from '@/lib/feeds/followedCategoriesStorage';

/** Toggle category follow — persists to localStorage and server when signed in. */
export async function toggleCategoryFollowWithSync(
  slug: string,
  userId: string | null | undefined,
  token: string | null | undefined,
): Promise<boolean> {
  const nowFollowing = toggleFollowedCategorySlug(slug, userId);
  if (!token) return nowFollowing;

  try {
    if (nowFollowing) {
      await blogApi.followCategory(slug, token);
    } else {
      await blogApi.unfollowCategory(slug, token);
    }
    return nowFollowing;
  } catch (e) {
    toggleFollowedCategorySlug(slug, userId);
    throw e;
  }
}

/** Pull server follows into localStorage (after sync-up). */
export async function refreshFollowedCategoriesFromServer(
  userId: string | null | undefined,
  token: string | null | undefined,
): Promise<void> {
  if (!token || !userId?.trim()) return;
  const localSlugs = readFollowedCategorySlugs(userId);
  if (localSlugs.length > 0) {
    await blogApi.syncFollowedCategories(localSlugs, token);
  }
  const { slugs } = await blogApi.listFollowedCategories(token);
  writeFollowedCategorySlugs(slugs, userId);
}
