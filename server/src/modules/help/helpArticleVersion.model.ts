import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { HelpBodyFormat } from './helpArticle.model.js';

export interface IHelpArticleVersion extends Document {
  articleId: Types.ObjectId;
  version: number;
  title: string;
  summary: string;
  body: string;
  bodyFormat: HelpBodyFormat;
  publishedAt: Date;
  publishedBy?: Types.ObjectId | null;
  createdAt: Date;
}

const HelpArticleVersionSchema = new Schema<IHelpArticleVersion>(
  {
    articleId: { type: Schema.Types.ObjectId, ref: 'helparticles', required: true, index: true },
    version: { type: Number, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    body: { type: String, default: '' },
    bodyFormat: {
      type: String,
      enum: ['markdown', 'mdx', 'richtext'],
      default: 'markdown',
    },
    publishedAt: { type: Date, required: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'users', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

HelpArticleVersionSchema.index({ articleId: 1, version: -1 }, { unique: true });

export const HelpArticleVersionModel: Model<IHelpArticleVersion> =
  mongoose.models?.helparticleversions ??
  mongoose.model<IHelpArticleVersion>('helparticleversions', HelpArticleVersionSchema);
