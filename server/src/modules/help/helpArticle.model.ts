import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type HelpArticleStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export type HelpBodyFormat = 'markdown' | 'mdx' | 'richtext';

export interface IHelpArticle extends Document {
  slug: string;
  slugHistory: string[];
  title: string;
  summary: string;
  body: string;
  bodyFormat: HelpBodyFormat;
  category: string;
  tags: string[];
  draftTitle?: string;
  draftSummary?: string;
  draftBody?: string;
  status: HelpArticleStatus;
  isPublished: boolean;
  draftVersion: number;
  publishedVersion: number;
  publishAt?: Date | null;
  lockedBy?: Types.ObjectId | null;
  lockedAt?: Date | null;
  publishedAt?: Date | null;
  authorId: Types.ObjectId;
  seo?: { metaTitle?: string; metaDescription?: string };
  contentSchemaVersion: number;
  /** Soft-delete: when set, article is in trash and excluded from public/editor lists. */
  deletedAt?: Date | null;
  deletedById?: Types.ObjectId | null;
  /** Canonical slug before move to trash (restore target). */
  slugBeforeDelete?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const HelpArticleSchema = new Schema<IHelpArticle>(
  {
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 200 },
    slugHistory: { type: [String], default: [] },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    summary: { type: String, default: '', trim: true, maxlength: 2000 },
    body: { type: String, default: '' },
    bodyFormat: {
      type: String,
      enum: ['markdown', 'mdx', 'richtext'],
      default: 'markdown',
    },
    category: { type: String, default: 'general', trim: true, maxlength: 80 },
    tags: { type: [String], default: [] },
    draftTitle: { type: String, trim: true, maxlength: 300 },
    draftSummary: { type: String, trim: true, maxlength: 2000 },
    draftBody: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'scheduled'],
      default: 'draft',
    },
    isPublished: { type: Boolean, default: false },
    draftVersion: { type: Number, default: 0 },
    publishedVersion: { type: Number, default: 0 },
    publishAt: { type: Date, default: null },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    lockedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    authorId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    seo: {
      metaTitle: { type: String, trim: true, maxlength: 200 },
      metaDescription: { type: String, trim: true, maxlength: 500 },
    },
    contentSchemaVersion: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    slugBeforeDelete: { type: String, trim: true, maxlength: 200, default: null },
  },
  { timestamps: true }
);

HelpArticleSchema.index({ status: 1, publishedAt: -1 });
HelpArticleSchema.index({ category: 1, status: 1 });
HelpArticleSchema.index({ publishAt: 1 }, { sparse: true });

export const HelpArticleModel: Model<IHelpArticle> =
  mongoose.models?.helparticles ?? mongoose.model<IHelpArticle>('helparticles', HelpArticleSchema);
