import mongoose from 'mongoose';
import { BlogCommentModel } from '../models/BlogComment.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { UserModel, normalizeProfileImg } from '../models/User.js';
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
async function resolvePublishedPost(usernameParam, slug) {
    const user = await UserModel.findOne({
        username: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i'),
    })
        .select('_id')
        .lean();
    if (!user)
        return null;
    const post = await BlogPostModel.findOne({
        authorId: user._id,
        slug,
        status: 'published',
    })
        .select('_id')
        .lean();
    if (!post)
        return null;
    return { postId: post._id };
}
/** GET /api/blog/p/:username/:slug/comments */
export async function listBlogComments(req, res) {
    try {
        const usernameParam = paramString(req.params.username);
        const slug = paramString(req.params.slug);
        if (!usernameParam || !slug) {
            res.status(400).json({ success: false, message: 'Invalid path' });
            return;
        }
        const resolved = await resolvePublishedPost(usernameParam, slug);
        if (!resolved) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }
        const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
        const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 80;
        const rows = await BlogCommentModel.find({ postId: resolved.postId })
            .sort({ createdAt: 1 })
            .limit(limit)
            .populate({ path: 'userId', select: 'username fullName profileImg', model: 'users' })
            .lean();
        const comments = rows.map((c) => {
            const u = c.userId;
            let author = { username: '', fullName: '', profileImg: '' };
            if (u && typeof u === 'object' && !Array.isArray(u)) {
                const o = u;
                author = {
                    username: typeof o.username === 'string' ? o.username : '',
                    fullName: typeof o.fullName === 'string' ? o.fullName : '',
                    profileImg: normalizeProfileImg(o.profileImg),
                };
            }
            return {
                _id: String(c._id),
                text: c.text,
                createdAt: c.createdAt,
                author,
            };
        });
        res.status(200).json({ success: true, comments });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load comments' });
    }
}
/** POST /api/blog/p/:username/:slug/comments */
export async function addBlogComment(req, res) {
    try {
        const user = req.user;
        if (!user?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const usernameParam = paramString(req.params.username);
        const slug = paramString(req.params.slug);
        if (!usernameParam || !slug) {
            res.status(400).json({ success: false, message: 'Invalid path' });
            return;
        }
        const resolved = await resolvePublishedPost(usernameParam, slug);
        if (!resolved) {
            res.status(404).json({ success: false, message: 'Post not found' });
            return;
        }
        const body = req.body;
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text || text.length > 2000) {
            res.status(400).json({ success: false, message: 'Comment must be 1–2000 characters' });
            return;
        }
        const doc = await BlogCommentModel.create({
            postId: resolved.postId,
            userId: new mongoose.Types.ObjectId(user._id),
            text,
        });
        const populated = await BlogCommentModel.findById(doc._id)
            .populate({ path: 'userId', select: 'username fullName profileImg', model: 'users' })
            .lean();
        if (!populated) {
            res.status(500).json({ success: false, message: 'Failed to create comment' });
            return;
        }
        const u = populated.userId;
        let author = { username: '', fullName: '', profileImg: '' };
        if (u && typeof u === 'object' && !Array.isArray(u)) {
            const o = u;
            author = {
                username: typeof o.username === 'string' ? o.username : '',
                fullName: typeof o.fullName === 'string' ? o.fullName : '',
                profileImg: normalizeProfileImg(o.profileImg),
            };
        }
        res.status(201).json({
            success: true,
            comment: {
                _id: String(populated._id),
                text: populated.text,
                createdAt: populated.createdAt,
                author,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to post comment' });
    }
}
//# sourceMappingURL=blogComment.controller.js.map