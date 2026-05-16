import mongoose, { Schema, Document, Model } from 'mongoose';

/** Curated category row (slug used on posts). Post counts come from aggregation, not this field. */
export interface IBlogCategory extends Document {
  slug: string;
  name: string;
  /** Short blurb for Explore / category landing (optional). */
  description?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 64, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const BlogCategoryModel: Model<IBlogCategory> =
  mongoose.models?.blogcategories ?? mongoose.model<IBlogCategory>('blogcategories', BlogCategorySchema);
