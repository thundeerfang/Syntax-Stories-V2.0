import { BlogCategoryModel } from "../../models/BlogCategory.js";
import { BlogTagModel } from "../../models/BlogTag.js";
const DUMMY_CATEGORY_SLUGS = [
  "technical",
  "tutorial",
  "story",
  "news",
  "opinion",
  "misc",
] as const;
const DUMMY_TAG_SLUGS = [
  "javascript",
  "react",
  "nodejs",
  "css",
  "webdev",
  "typescript",
] as const;
export async function removeBlogTaxonomyDummyData(): Promise<void> {
  await Promise.all([
    BlogCategoryModel.deleteMany({ slug: { $in: [...DUMMY_CATEGORY_SLUGS] } }),
    BlogTagModel.deleteMany({ slug: { $in: [...DUMMY_TAG_SLUGS] } }),
  ]);
}
export async function ensureBlogTaxonomySeeds(): Promise<void> {
  await removeBlogTaxonomyDummyData();
}
