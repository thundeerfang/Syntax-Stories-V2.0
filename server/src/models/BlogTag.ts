import mongoose, { Schema, Document, Model } from "mongoose";
export interface IBlogTag extends Document {
  slug: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
const BlogTagSchema = new Schema<IBlogTag>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 48,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 600, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const BlogTagModel: Model<IBlogTag> =
  mongoose.models?.blogtags ??
  mongoose.model<IBlogTag>("blogtags", BlogTagSchema);
