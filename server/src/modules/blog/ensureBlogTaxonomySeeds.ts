import { BlogCategoryModel } from '../../models/BlogCategory.js';
import { BlogTagModel } from '../../models/BlogTag.js';

const DEFAULT_CATEGORIES = [
  {
    slug: 'technical',
    name: 'Technical',
    sortOrder: 10,
    description: 'Deep dives, architecture notes, and implementation details for builders.',
  },
  {
    slug: 'tutorial',
    name: 'Tutorial',
    sortOrder: 20,
    description: 'Step-by-step guides to help you ship features faster with fewer wrong turns.',
  },
  {
    slug: 'story',
    name: 'Story',
    sortOrder: 30,
    description: 'Career paths, lessons learned, and narratives from the Syntax Stories community.',
  },
  {
    slug: 'news',
    name: 'News',
    sortOrder: 40,
    description: 'What is changing in frameworks, languages, and the wider developer ecosystem.',
  },
  {
    slug: 'opinion',
    name: 'Opinion',
    sortOrder: 50,
    description: 'Hot takes, thoughtful critiques, and debate-worthy perspectives on tech culture.',
  },
  {
    slug: 'misc',
    name: 'Miscellaneous',
    sortOrder: 99,
    description: 'Everything else worth reading that does not fit a neat box.',
  },
];

const DEFAULT_TAGS = [
  {
    slug: 'javascript',
    name: 'JavaScript',
    sortOrder: 10,
    description: 'Language fundamentals, patterns, and runtime tips from the browser to the server.',
  },
  {
    slug: 'react',
    name: 'React',
    sortOrder: 20,
    description: 'Components, hooks, and patterns for modern UI engineering.',
  },
  {
    slug: 'nodejs',
    name: 'Node.js',
    sortOrder: 30,
    description: 'Packages, APIs, and backend workflows on the JavaScript runtime.',
  },
  {
    slug: 'css',
    name: 'CSS',
    sortOrder: 40,
    description: 'Layout, design tokens, and styling techniques that hold up in production.',
  },
  {
    slug: 'webdev',
    name: 'Web dev',
    sortOrder: 50,
    description: 'End-to-end delivery across browsers, APIs, and deployment pipelines.',
  },
  {
    slug: 'typescript',
    name: 'TypeScript',
    sortOrder: 60,
    description: 'Types, tooling, and safer refactors for growing codebases.',
  },
];

/** Idempotent seed for editor dropdowns + taxonomy API. */
export async function ensureBlogTaxonomySeeds(): Promise<void> {
  const [c, t] = await Promise.all([BlogCategoryModel.countDocuments(), BlogTagModel.countDocuments()]);
  if (c === 0) await BlogCategoryModel.insertMany(DEFAULT_CATEGORIES);
  if (t === 0) await BlogTagModel.insertMany(DEFAULT_TAGS);

  await Promise.all([
    ...DEFAULT_CATEGORIES.map((row) =>
      BlogCategoryModel.updateOne({ slug: row.slug }, { $set: { description: row.description } }),
    ),
    ...DEFAULT_TAGS.map((row) =>
      BlogTagModel.updateOne({ slug: row.slug }, { $set: { description: row.description } }),
    ),
  ]);
}
