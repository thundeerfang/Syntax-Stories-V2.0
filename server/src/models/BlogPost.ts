import mongoose, { Schema, Document, Model } from 'mongoose';

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
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, trim: true, maxlength: 320 },
    summary: { type: String, trim: true, maxlength: 500, default: '' },
    content: { type: String, required: true, default: '' },
    thumbnailUrl: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  },
  { timestamps: true }
);

// Unique slug per author (same author cannot have two posts with same slug)
BlogPostSchema.index({ authorId: 1, slug: 1 }, { unique: true });
BlogPostSchema.index({ status: 1, createdAt: -1 });

export const BlogPostModel: Model<IBlogPost> =
  mongoose.models?.blogposts ?? mongoose.model<IBlogPost>('blogposts', BlogPostSchema);
