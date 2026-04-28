import mongoose, { Document, Model } from 'mongoose';
export type BlogPostStatus = 'draft' | 'published';
/**
 * Blog post or draft. `content` is **`JSON.stringify(Block[])`**: an array of blocks with `id`, `type`,
 * `sectionId?`, `payload`. Types include `paragraph` (markdown: bold/italic/underline/links/lists,
 * `[@username](mention:24hexMongoUserId)`, plain `@user`), `heading`, `partition`, `image`,
 * `videoEmbed`, `githubRepo`, `unsplashImage`, etc.
 *
 * **`content` validation:** `POST /api/blog` and `PUT /api/blog/draft` run server-side checks
 * (max size, allowed `type` values, payload limits, strip legacy `gif` blocks) before persisting.
 */
export interface IBlogPost extends Document {
    authorId: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    summary?: string;
    /** JSON string of Block[] (full editor state per block, no server-side stripping) */
    content: string;
    thumbnailUrl?: string;
    status: BlogPostStatus;
    /** Set when a published (or draft) post is saved after create; used for “edited” UI. */
    lastEditedAt?: Date;
    lastEditedById?: mongoose.Types.ObjectId;
    /** Soft-delete: set instead of removing the document. */
    deletedAt?: Date;
    deletedById?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const BlogPostModel: Model<IBlogPost>;
//# sourceMappingURL=BlogPost.d.ts.map