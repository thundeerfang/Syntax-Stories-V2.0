import { blogApi } from "@/api/blog";
import {
  toggleFollowedCategorySlug,
  writeFollowedCategorySlugs,
  readFollowedCategorySlugs,
} from "@/lib/feeds/followedCategoriesStorage";
export {
  FOLLOWED_CATEGORIES_CHANGED_EVENT,
  canSyncCategoryFollowState,
  isCategoryFollowedForViewer,
  isCategorySlugFollowed,
  readFollowedCategorySlugs,
  writeFollowedCategorySlugs,
  toggleFollowedCategorySlug,
  shouldHandleFollowedCategoriesEvent,
} from "@/lib/feeds/followedCategoriesStorage";
export async function toggleCategoryFollowWithSync(
  slug: string,
  userId: string | null | undefined,
  token: string | null | undefined,
): Promise<boolean> {
  if (!token || !userId?.trim()) {
    return false;
  }
  const nowFollowing = toggleFollowedCategorySlug(slug, userId);
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
  writeFollowedCategorySlugs(slugs, userId, { notify: false });
}
