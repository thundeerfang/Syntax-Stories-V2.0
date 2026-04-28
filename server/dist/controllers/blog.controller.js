import mongoose from 'mongoose';
import { sanitizeThumbnailUrl, validateBlogPostContent } from '../modules/blog/blogContentValidation.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { BlogCategoryModel } from '../models/BlogCategory.js';
import { BlogTagModel } from '../models/BlogTag.js';
import { UserModel, normalizeProfileImg } from '../models/User.js';
import { ensureBlogTaxonomySeeds } from '../modules/blog/ensureBlogTaxonomySeeds.js';
import { normalizeTaxonomyInput } from '../modules/blog/postTaxonomy.js';
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function paramString(v) {
    if (v == null)
        return undefined;
    if (Array.isArray(v))
        return v[0];
    return v;
}
const SLUG_MAX_LEN = 320;
const SUMMARY_MAX_LEN = 12000;
/** Active rows are not soft-deleted (`deletedAt` unset or null). */
const NOT_DELETED = {
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};
function mapLastEditor(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return undefined;
    const u = raw;
    const username = typeof u.username === 'string' ? u.username.trim() : '';
    if (!username)
        return undefined;
    const fullName = typeof u.fullName === 'string' && u.fullName.trim() ? u.fullName.trim() : username;
    return { username, fullName };
}
function slugify(text) {
    return (text
        .trim()
        .toLowerCase()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/[^\w-]/g, '')
        .replaceAll(/-+/g, '-')
        .replaceAll(/^-+/g, '')
        .replaceAll(/-+$/g, '')
        .slice(0, 200) || 'post');
}
function mapTaxonomyFromDoc(p) {
    const category = typeof p.category === 'string' && p.category.trim() ? p.category.trim() : undefined;
    const tags = Array.isArray(p.tags) && p.tags.length ? p.tags : undefined;
    const language = typeof p.language === 'string' && p.language.trim() ? p.language.trim().toLowerCase() : 'en';
    return { category, tags, language };
}
function slugWithCollisionSuffix(base, attempt) {
    if (attempt <= 0)
        return base.slice(0, SLUG_MAX_LEN);
    const suf = `-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const room = SLUG_MAX_LEN - suf.length;
    return `${base.slice(0, Math.max(1, room))}${suf}`;
}
/** POST /api/blog - create a new blog post (draft or published) */
export async function createPost(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { title, summary, content, thumbnailUrl, status } = req.body;
        const tax = normalizeTaxonomyInput(req.body);
        const titleStr = typeof title === 'string' ? title.trim() : '';
        const contentStr = typeof content === 'string' ? content : '';
        if (!titleStr || titleStr.length > 300) {
            res.status(400).json({ success: false, message: 'Title is required and must be at most 300 characters' });
            return;
        }
        const contentCheck = validateBlogPostContent(contentStr);
        if (!contentCheck.ok) {
            res.status(contentCheck.status).json({ success: false, message: contentCheck.message });
            return;
        }
        const baseSlug = slugify(titleStr);
        const finalStatus = status === 'published' ? 'published' : 'draft';
        const thumb = sanitizeThumbnailUrl(thumbnailUrl);
        const summaryStr = typeof summary === 'string' ? summary.trim().slice(0, SUMMARY_MAX_LEN) : '';
        let post = null;
        let lastErr;
        for (let attempt = 0; attempt < 12; attempt++) {
            const slug = slugWithCollisionSuffix(baseSlug, attempt);
            try {
                post = await BlogPostModel.create({
                    authorId: user._id,
                    title: titleStr,
                    slug,
                    summary: summaryStr || undefined,
                    content: contentCheck.normalizedJson,
                    thumbnailUrl: thumb,
                    status: finalStatus,
                    ...(tax.category ? { category: tax.category } : {}),
                    ...(tax.tags?.length ? { tags: tax.tags } : {}),
                    ...(tax.language ? { language: tax.language } : { language: 'en' }),
                });
                break;
            }
            catch (err) {
                lastErr = err;
                const e = err;
                if (e.code === 11000)
                    continue;
                throw err;
            }
        }
        if (!post) {
            const e = lastErr;
            if (e?.code === 11000) {
                res.status(409).json({
                    success: false,
                    message: 'Could not allocate a unique URL slug. Try a slightly different title.',
                });
                return;
            }
            throw lastErr;
        }
        res.status(201).json({
            success: true,
            post: {
                _id: post._id,
                title: post.title,
                slug: post.slug,
                summary: post.summary,
                content: post.content,
                thumbnailUrl: post.thumbnailUrl,
                status: post.status,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                ...mapTaxonomyFromDoc(post),
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to create post' });
    }
}
/** PUT /api/blog/draft - upsert current user's draft (sync from local) */
export async function upsertDraft(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const { title, summary, content, thumbnailUrl } = req.body;
        const rawBody = req.body;
        const hasTaxonomyKeys = 'category' in rawBody || 'tags' in rawBody || 'language' in rawBody;
        const tax = hasTaxonomyKeys ? normalizeTaxonomyInput(rawBody) : null;
        const titleStr = typeof title === 'string' ? title.trim() : '';
        const contentStr = typeof content === 'string' ? content : '';
        const summaryStr = typeof summary === 'string' ? summary.trim().slice(0, SUMMARY_MAX_LEN) : '';
        const contentCheck = validateBlogPostContent(contentStr);
        if (!contentCheck.ok) {
            res.status(contentCheck.status).json({ success: false, message: contentCheck.message });
            return;
        }
        const thumb = sanitizeThumbnailUrl(thumbnailUrl);
        const finalTitle = titleStr || 'Untitled draft';
        const post = await BlogPostModel.findOne({ authorId: user._id, status: 'draft', ...NOT_DELETED })
            .sort({ updatedAt: -1 })
            .limit(1)
            .lean();
        if (post) {
            const slug = slugify(finalTitle);
            const updated = await BlogPostModel.findByIdAndUpdate(post._id, {
                title: finalTitle,
                slug,
                summary: summaryStr || undefined,
                content: contentCheck.normalizedJson,
                thumbnailUrl: thumb,
                ...(tax
                    ? {
                        category: tax.category,
                        tags: tax.tags?.length ? tax.tags : undefined,
                        language: tax.language ?? 'en',
                    }
                    : {}),
            }, { new: true });
            if (!updated) {
                res.status(404).json({ success: false, message: 'Draft not found' });
                return;
            }
            res.status(200).json({
                success: true,
                post: {
                    _id: updated._id,
                    title: updated.title,
                    slug: updated.slug,
                    summary: updated.summary,
                    content: updated.content,
                    thumbnailUrl: updated.thumbnailUrl,
                    status: updated.status,
                    createdAt: updated.createdAt,
                    updatedAt: updated.updatedAt,
                    ...mapTaxonomyFromDoc(updated),
                },
            });
            return;
        }
        const uniqueSlug = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const created = await BlogPostModel.create({
            authorId: user._id,
            title: finalTitle,
            slug: uniqueSlug,
            summary: summaryStr || undefined,
            content: contentCheck.normalizedJson,
            thumbnailUrl: thumb,
            status: 'draft',
            ...(tax
                ? {
                    category: tax.category,
                    tags: tax.tags?.length ? tax.tags : undefined,
                    language: tax.language ?? 'en',
                }
                : { language: 'en' }),
        });
        res.status(201).json({
            success: true,
            post: {
                _id: created._id,
                title: created.title,
                slug: created.slug,
                summary: created.summary,
                content: created.content,
                thumbnailUrl: created.thumbnailUrl,
                status: created.status,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
                ...mapTaxonomyFromDoc(created),
            },
        });
    }
    catch (err) {
        const e = err;
        if (e.code === 11000) {
            res.status(409).json({ success: false, message: 'Draft slug conflict. Try a different title.' });
            return;
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to save draft' });
    }
}
/** GET /api/blog/draft - get current user's single draft (for sync/restore) */
export async function getDraft(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const draft = await BlogPostModel.findOne({ authorId: user._id, status: 'draft', ...NOT_DELETED })
            .sort({ updatedAt: -1 })
            .limit(1)
            .lean();
        if (!draft) {
            res.status(200).json({ success: true, draft: null });
            return;
        }
        res.status(200).json({
            success: true,
            draft: {
                _id: draft._id,
                title: draft.title,
                slug: draft.slug,
                summary: draft.summary,
                content: draft.content,
                thumbnailUrl: draft.thumbnailUrl,
                status: draft.status,
                createdAt: draft.createdAt,
                updatedAt: draft.updatedAt,
                ...mapTaxonomyFromDoc(draft),
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to get draft' });
    }
}
/** GET /api/blog/feed — public: recent published posts (home / explore). */
export async function listPublishedFeed(req, res) {
    try {
        const raw = Number.parseInt(String(req.query.limit ?? ''), 10);
        const limit = Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 20;
        const posts = await BlogPostModel.find({ status: 'published', ...NOT_DELETED })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
            .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
            .lean();
        const items = posts
            .map((p) => {
            const authorRaw = p.authorId;
            if (!authorRaw || typeof authorRaw !== 'object' || Array.isArray(authorRaw)) {
                return null;
            }
            const a = authorRaw;
            if (typeof a.username !== 'string' || !a.username.trim()) {
                return null;
            }
            const leAt = p.lastEditedAt;
            const leBy = mapLastEditor(p.lastEditedById);
            return {
                _id: String(p._id),
                title: p.title,
                slug: p.slug,
                summary: p.summary ?? '',
                thumbnailUrl: p.thumbnailUrl,
                updatedAt: p.updatedAt,
                createdAt: p.createdAt,
                lastEditedAt: leAt ? leAt.toISOString() : undefined,
                lastEditedBy: leBy,
                author: {
                    username: a.username.trim(),
                    fullName: typeof a.fullName === 'string' && a.fullName.trim() ? a.fullName.trim() : a.username.trim(),
                    profileImg: normalizeProfileImg(a.profileImg),
                },
                ...mapTaxonomyFromDoc(p),
            };
        })
            .filter((x) => x !== null);
        res.status(200).json({ success: true, posts: items });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load feed' });
    }
}
/** GET /api/blog/u/:username/posts — public: published posts by that author (profile / u-page grid). */
export async function listUserPublishedPosts(req, res) {
    try {
        const usernameParam = paramString(req.params.username);
        if (!usernameParam?.trim()) {
            res.status(400).json({ success: false, message: 'Invalid username' });
            return;
        }
        const raw = Number.parseInt(String(req.query.limit ?? ''), 10);
        const limit = Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 24;
        const user = await UserModel.findOne({
            username: new RegExp(`^${escapeRegex(usernameParam.trim())}$`, 'i'),
        })
            .select('_id')
            .lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const posts = await BlogPostModel.find({
            authorId: user._id,
            status: 'published',
            ...NOT_DELETED,
        })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
            .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
            .lean();
        const items = posts
            .map((p) => {
            const authorRaw = p.authorId;
            if (!authorRaw || typeof authorRaw !== 'object' || Array.isArray(authorRaw)) {
                return null;
            }
            const a = authorRaw;
            if (typeof a.username !== 'string' || !a.username.trim()) {
                return null;
            }
            const leAt = p.lastEditedAt;
            const leBy = mapLastEditor(p.lastEditedById);
            return {
                _id: String(p._id),
                title: p.title,
                slug: p.slug,
                summary: p.summary ?? '',
                thumbnailUrl: p.thumbnailUrl,
                updatedAt: p.updatedAt,
                createdAt: p.createdAt,
                lastEditedAt: leAt ? leAt.toISOString() : undefined,
                lastEditedBy: leBy,
                author: {
                    username: a.username.trim(),
                    fullName: typeof a.fullName === 'string' && a.fullName.trim() ? a.fullName.trim() : a.username.trim(),
                    profileImg: normalizeProfileImg(a.profileImg),
                },
                ...mapTaxonomyFromDoc(p),
            };
        })
            .filter((x) => x !== null);
        res.status(200).json({ success: true, posts: items });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load posts' });
    }
}
/** GET /api/blog/p/:username/:slug — public: one published post by author username + slug. */
export async function getPublishedPostBySlug(req, res) {
    try {
        const usernameParam = paramString(req.params.username);
        const slug = paramString(req.params.slug);
        if (!usernameParam || !slug) {
            res.status(400).json({ success: false, message: 'Invalid path' });
            return;
        }
        const user = await UserModel.findOne({
            username: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i'),
        })
            .select('_id')
            .lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'Author not found' });
            return;
        }
        const post = await BlogPostModel.findOne({
            authorId: user._id,
            slug,
            status: 'published',
            ...NOT_DELETED,
        })
            .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
            .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
            .lean();
        if (!post) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }
        const aRaw = post.authorId;
        if (!aRaw || typeof aRaw !== 'object' || Array.isArray(aRaw)) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }
        const a = aRaw;
        const leAt = post.lastEditedAt;
        const leBy = mapLastEditor(post.lastEditedById);
        res.status(200).json({
            success: true,
            post: {
                _id: String(post._id),
                title: post.title,
                slug: post.slug,
                summary: post.summary ?? '',
                content: post.content,
                thumbnailUrl: post.thumbnailUrl,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                lastEditedAt: leAt ? leAt.toISOString() : undefined,
                lastEditedBy: leBy,
                author: {
                    username: a.username,
                    fullName: a.fullName?.trim() ? a.fullName : a.username,
                    profileImg: normalizeProfileImg(a.profileImg),
                },
                ...mapTaxonomyFromDoc(post),
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load post' });
    }
}
const SOFT_DELETE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
/** GET /api/blog - list current user's posts (for now: my posts only) */
export async function listMyPosts(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const status = req.query.status || undefined;
        const cutoff = new Date(Date.now() - SOFT_DELETE_RETENTION_MS);
        if (status === 'deleted') {
            const posts = await BlogPostModel.find({
                authorId: user._id,
                deletedAt: { $exists: true, $ne: null, $gte: cutoff },
            })
                .select('title slug summary content thumbnailUrl status createdAt updatedAt deletedAt lastEditedAt category tags language')
                .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
                .sort({ deletedAt: -1 })
                .limit(50)
                .lean();
            res.status(200).json({
                success: true,
                posts: posts.map((p) => {
                    const leAt = p.lastEditedAt;
                    const leBy = mapLastEditor(p.lastEditedById);
                    const delAt = p.deletedAt;
                    return {
                        _id: p._id,
                        title: p.title,
                        slug: p.slug,
                        summary: p.summary,
                        content: p.content,
                        thumbnailUrl: p.thumbnailUrl,
                        status: p.status,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        deletedAt: delAt ? delAt.toISOString() : undefined,
                        lastEditedAt: leAt ? leAt.toISOString() : undefined,
                        lastEditedBy: leBy,
                        ...mapTaxonomyFromDoc(p),
                    };
                }),
            });
            return;
        }
        const filter = { authorId: user._id, ...NOT_DELETED };
        if (status === 'draft' || status === 'published')
            filter.status = status;
        const posts = await BlogPostModel.find(filter)
            .select('title slug summary content thumbnailUrl status createdAt updatedAt lastEditedAt category tags language')
            .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
            .sort({ updatedAt: -1 })
            .limit(50)
            .lean();
        res.status(200).json({
            success: true,
            posts: posts.map((p) => {
                const leAt = p.lastEditedAt;
                const leBy = mapLastEditor(p.lastEditedById);
                return {
                    _id: p._id,
                    title: p.title,
                    slug: p.slug,
                    summary: p.summary,
                    content: p.content,
                    thumbnailUrl: p.thumbnailUrl,
                    status: p.status,
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt,
                    lastEditedAt: leAt ? leAt.toISOString() : undefined,
                    lastEditedBy: leBy,
                    ...mapTaxonomyFromDoc(p),
                };
            }),
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to list posts' });
    }
}
/** GET /api/blog/post/:postId — owner-only: load one post for editing. */
export async function getMyPostById(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const postId = paramString(req.params.postId);
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            res.status(400).json({ success: false, message: 'Invalid post id' });
            return;
        }
        const post = await BlogPostModel.findOne({ _id: postId, authorId: user._id, ...NOT_DELETED }).lean();
        if (!post) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }
        res.status(200).json({
            success: true,
            post: {
                _id: String(post._id),
                title: post.title,
                slug: post.slug,
                summary: post.summary ?? '',
                content: post.content,
                thumbnailUrl: post.thumbnailUrl,
                status: post.status,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt,
                ...mapTaxonomyFromDoc(post),
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load post' });
    }
}
/** PUT /api/blog/post/:postId — owner-only: update draft or published post. */
export async function updateMyPost(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const postId = paramString(req.params.postId);
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            res.status(400).json({ success: false, message: 'Invalid post id' });
            return;
        }
        const existing = await BlogPostModel.findOne({ _id: postId, authorId: user._id });
        if (!existing) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }
        const wasPublishedBefore = existing.status === 'published';
        const rawBody = req.body;
        const hasTaxonomyKeys = 'category' in rawBody || 'tags' in rawBody || 'language' in rawBody;
        const tax = hasTaxonomyKeys ? normalizeTaxonomyInput(rawBody) : null;
        const { title, summary, content, thumbnailUrl, status, silent } = req.body;
        const titleStr = typeof title === 'string' && title.trim() ? title.trim().slice(0, 300) : existing.title;
        const contentStr = typeof content === 'string' ? content : existing.content;
        const contentCheck = validateBlogPostContent(contentStr);
        if (!contentCheck.ok) {
            res.status(contentCheck.status).json({ success: false, message: contentCheck.message });
            return;
        }
        const summaryStr = typeof summary === 'string' ? summary.trim().slice(0, SUMMARY_MAX_LEN) : (existing.summary ?? '') || '';
        /**
         * Explicit "Save draft" while editing a **published** post: create a new draft with the
         * editor payload. The published document is not modified (live URL unchanged).
         */
        if (status === 'draft' && existing.status === 'published' && silent !== true) {
            const thumb = thumbnailUrl !== undefined ? sanitizeThumbnailUrl(thumbnailUrl) : existing.thumbnailUrl;
            const exDoc = existing;
            const forkCategory = hasTaxonomyKeys ? tax?.category : exDoc.category;
            const forkTags = hasTaxonomyKeys
                ? tax?.tags?.length
                    ? tax.tags
                    : undefined
                : exDoc.tags;
            const forkLang = hasTaxonomyKeys
                ? tax?.language ?? exDoc.language ?? 'en'
                : exDoc.language ?? 'en';
            const baseSlug = slugify(titleStr);
            let newPost = null;
            let lastErr;
            for (let attempt = 0; attempt < 12; attempt++) {
                const cand = slugWithCollisionSuffix(baseSlug, attempt);
                try {
                    newPost = (await BlogPostModel.create({
                        authorId: user._id,
                        title: titleStr,
                        slug: cand,
                        summary: summaryStr || undefined,
                        content: contentCheck.normalizedJson,
                        thumbnailUrl: thumb ?? undefined,
                        status: 'draft',
                        ...(forkCategory ? { category: forkCategory } : {}),
                        ...(forkTags?.length ? { tags: forkTags } : {}),
                        language: forkLang,
                    }));
                    break;
                }
                catch (err) {
                    lastErr = err;
                    const e = err;
                    if (e.code === 11000)
                        continue;
                    throw err;
                }
            }
            if (!newPost) {
                const e = lastErr;
                if (e?.code === 11000) {
                    res.status(409).json({
                        success: false,
                        message: 'Could not allocate a unique URL slug. Try a slightly different title.',
                    });
                    return;
                }
                throw lastErr;
            }
            res.status(201).json({
                success: true,
                forkedFromPublished: true,
                post: {
                    _id: newPost._id,
                    title: newPost.title,
                    slug: newPost.slug,
                    summary: newPost.summary,
                    content: newPost.content,
                    thumbnailUrl: newPost.thumbnailUrl,
                    status: newPost.status,
                    createdAt: newPost.createdAt,
                    updatedAt: newPost.updatedAt,
                    ...mapTaxonomyFromDoc(newPost),
                },
            });
            return;
        }
        let nextSlug = existing.slug;
        if (typeof title === 'string' && title.trim() && titleStr !== existing.title) {
            const base = slugify(titleStr);
            for (let attempt = 0; attempt < 12; attempt++) {
                const cand = slugWithCollisionSuffix(base, attempt);
                const clash = await BlogPostModel.findOne({
                    authorId: user._id,
                    slug: cand,
                    _id: { $ne: existing._id },
                })
                    .select('_id')
                    .lean();
                if (!clash) {
                    nextSlug = cand;
                    break;
                }
            }
        }
        existing.title = titleStr;
        existing.slug = nextSlug;
        existing.summary = summaryStr || undefined;
        existing.content = contentCheck.normalizedJson;
        if (thumbnailUrl !== undefined) {
            existing.thumbnailUrl = sanitizeThumbnailUrl(thumbnailUrl) ?? undefined;
        }
        if (status === 'draft' || status === 'published') {
            existing.status = status;
        }
        if (tax) {
            existing.category = tax.category;
            existing.tags = tax.tags?.length ? tax.tags : undefined;
            existing.language = tax.language ?? 'en';
        }
        // Only record "edited" when the post was already published before this save (not first publish).
        if (silent !== true && wasPublishedBefore) {
            existing.lastEditedById = user._id;
            existing.lastEditedAt = new Date();
        }
        await existing.save();
        res.status(200).json({
            success: true,
            post: {
                _id: existing._id,
                title: existing.title,
                slug: existing.slug,
                summary: existing.summary,
                content: existing.content,
                thumbnailUrl: existing.thumbnailUrl,
                status: existing.status,
                createdAt: existing.createdAt,
                updatedAt: existing.updatedAt,
                ...mapTaxonomyFromDoc(existing),
            },
        });
    }
    catch (err) {
        const e = err;
        if (e.code === 11000) {
            res.status(409).json({ success: false, message: 'Slug conflict' });
            return;
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update post' });
    }
}
/** PUT /api/blog/post/:postId/restore — owner-only: undelete within retention window; becomes published. */
export async function restoreMyPost(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const postId = paramString(req.params.postId);
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            res.status(400).json({ success: false, message: 'Invalid post id' });
            return;
        }
        const doc = await BlogPostModel.findOne({
            _id: postId,
            authorId: user._id,
            deletedAt: { $exists: true, $ne: null },
        });
        if (!doc) {
            res.status(404).json({ success: false, message: 'Post not found or not in trash' });
            return;
        }
        const del = doc.deletedAt;
        if (!del || del.getTime() < Date.now() - SOFT_DELETE_RETENTION_MS) {
            res.status(410).json({ success: false, message: 'This post is no longer in the recoverable trash window' });
            return;
        }
        let nextSlug = doc.slug;
        const clash = await BlogPostModel.findOne({
            authorId: user._id,
            slug: doc.slug,
            ...NOT_DELETED,
            _id: { $ne: doc._id },
        })
            .select('_id')
            .lean();
        if (clash) {
            const base = slugify(doc.title);
            for (let attempt = 0; attempt < 12; attempt++) {
                const cand = slugWithCollisionSuffix(base, attempt);
                const c2 = await BlogPostModel.findOne({ authorId: user._id, slug: cand, ...NOT_DELETED })
                    .select('_id')
                    .lean();
                if (!c2) {
                    nextSlug = cand;
                    break;
                }
            }
        }
        doc.deletedAt = undefined;
        doc.deletedById = undefined;
        doc.slug = nextSlug;
        doc.status = 'published';
        await doc.save();
        res.status(200).json({
            success: true,
            post: {
                _id: doc._id,
                title: doc.title,
                slug: doc.slug,
                summary: doc.summary,
                content: doc.content,
                thumbnailUrl: doc.thumbnailUrl,
                status: doc.status,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to restore post' });
    }
}
/** DELETE /api/blog/post/:postId/permanent — owner-only: hard-delete a soft-deleted post. */
export async function purgeMyPostPermanently(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const postId = paramString(req.params.postId);
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            res.status(400).json({ success: false, message: 'Invalid post id' });
            return;
        }
        const removed = await BlogPostModel.findOneAndDelete({
            _id: postId,
            authorId: user._id,
            deletedAt: { $exists: true, $ne: null },
        });
        if (!removed) {
            res.status(404).json({ success: false, message: 'Post not found or not in trash' });
            return;
        }
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to permanently delete post' });
    }
}
/** DELETE /api/blog/post/:postId — owner-only. */
export async function deleteMyPost(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const postId = paramString(req.params.postId);
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            res.status(400).json({ success: false, message: 'Invalid post id' });
            return;
        }
        const updated = await BlogPostModel.findOneAndUpdate({ _id: postId, authorId: user._id, ...NOT_DELETED }, {
            deletedAt: new Date(),
            deletedById: user._id,
        }, { new: true });
        if (!updated) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }
        res.status(200).json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
}
/** GET /api/blog/taxonomy — public: curated categories/tags plus published post counts. */
export async function getBlogTaxonomy(_req, res) {
    try {
        await ensureBlogTaxonomySeeds();
        const publishedMatch = { status: 'published', ...NOT_DELETED };
        const [curatedCats, curatedTags, catAgg, tagAgg] = await Promise.all([
            BlogCategoryModel.find().sort({ sortOrder: 1, name: 1 }).lean(),
            BlogTagModel.find().sort({ sortOrder: 1, name: 1 }).lean(),
            BlogPostModel.aggregate([
                {
                    $match: {
                        ...publishedMatch,
                        category: { $type: 'string', $nin: ['', null] },
                    },
                },
                { $group: { _id: { $toLower: '$category' }, postCount: { $sum: 1 } } },
            ]),
            BlogPostModel.aggregate([
                {
                    $match: {
                        ...publishedMatch,
                        tags: { $exists: true, $type: 'array', $ne: [] },
                    },
                },
                { $unwind: '$tags' },
                { $match: { tags: { $type: 'string', $nin: ['', null] } } },
                { $group: { _id: { $toLower: '$tags' }, postCount: { $sum: 1 } } },
            ]),
        ]);
        const countMap = (rows) => new Map(rows.map((r) => [String(r._id).toLowerCase(), r.postCount]));
        const catCounts = countMap(catAgg);
        const tagCounts = countMap(tagAgg);
        const curatedSlugLower = new Set(curatedCats.map((c) => c.slug.toLowerCase()));
        const categoriesFromCurated = curatedCats.map((c) => ({
            slug: c.slug,
            name: c.name,
            postCount: catCounts.get(c.slug.toLowerCase()) ?? 0,
        }));
        const extraCats = catAgg
            .filter((a) => !curatedSlugLower.has(String(a._id).toLowerCase()))
            .map((a) => ({
            slug: String(a._id),
            name: String(a._id),
            postCount: a.postCount,
        }));
        const categories = [...categoriesFromCurated, ...extraCats].sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
        const curatedTagLower = new Set(curatedTags.map((t) => t.slug.toLowerCase()));
        const tagsFromCurated = curatedTags.map((t) => ({
            slug: t.slug,
            name: t.name,
            postCount: tagCounts.get(t.slug.toLowerCase()) ?? 0,
        }));
        const extraTags = tagAgg
            .filter((a) => !curatedTagLower.has(String(a._id).toLowerCase()))
            .map((a) => ({
            slug: String(a._id),
            name: String(a._id),
            postCount: a.postCount,
        }));
        const tags = [...tagsFromCurated, ...extraTags]
            .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name))
            .slice(0, 80);
        res.status(200).json({ success: true, categories, tags });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load taxonomy' });
    }
}
//# sourceMappingURL=blog.controller.js.map