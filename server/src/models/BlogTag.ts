import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Optional curated tag (slug). Authors may also use tags not listed here; counts for all tags
 * come from published posts aggregation.
 */
export interface IBlogTag extends Document {
  slug: string;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogTagSchema = new Schema<IBlogTag>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 48, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const BlogTagModel: Model<IBlogTag> =
  mongoose.models?.blogtags ?? mongoose.model<IBlogTag>('blogtags', BlogTagSchema);
