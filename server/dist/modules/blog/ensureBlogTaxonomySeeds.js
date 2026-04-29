import { BlogCategoryModel } from '../../models/BlogCategory.js';
import { BlogTagModel } from '../../models/BlogTag.js';
const DEFAULT_CATEGORIES = [
    { slug: 'technical', name: 'Technical', sortOrder: 10 },
    { slug: 'tutorial', name: 'Tutorial', sortOrder: 20 },
    { slug: 'story', name: 'Story', sortOrder: 30 },
    { slug: 'news', name: 'News', sortOrder: 40 },
    { slug: 'opinion', name: 'Opinion', sortOrder: 50 },
    { slug: 'misc', name: 'Miscellaneous', sortOrder: 99 },
];
const DEFAULT_TAGS = [
    { slug: 'javascript', name: 'JavaScript', sortOrder: 10 },
    { slug: 'react', name: 'React', sortOrder: 20 },
    { slug: 'nodejs', name: 'Node.js', sortOrder: 30 },
    { slug: 'css', name: 'CSS', sortOrder: 40 },
    { slug: 'webdev', name: 'Web dev', sortOrder: 50 },
    { slug: 'typescript', name: 'TypeScript', sortOrder: 60 },
];
/** Idempotent seed for editor dropdowns + taxonomy API. */
export async function ensureBlogTaxonomySeeds() {
    const [c, t] = await Promise.all([BlogCategoryModel.countDocuments(), BlogTagModel.countDocuments()]);
    if (c === 0)
        await BlogCategoryModel.insertMany(DEFAULT_CATEGORIES);
    if (t === 0)
        await BlogTagModel.insertMany(DEFAULT_TAGS);
}
//# sourceMappingURL=ensureBlogTaxonomySeeds.js.map