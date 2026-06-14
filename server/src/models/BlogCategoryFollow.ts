import mongoose, { Schema, Document, Model } from "mongoose";
export interface IBlogCategoryFollow extends Document {
  userId: mongoose.Types.ObjectId;
  categorySlug: string;
  createdAt: Date;
}
const BlogCategoryFollowSchema = new Schema<IBlogCategoryFollow>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    categorySlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 64,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
BlogCategoryFollowSchema.index(
  { userId: 1, categorySlug: 1 },
  { unique: true },
);
BlogCategoryFollowSchema.index({ categorySlug: 1, createdAt: -1 });
export const BlogCategoryFollowModel: Model<IBlogCategoryFollow> =
  mongoose.models?.blogcategoryfollows ??
  mongoose.model<IBlogCategoryFollow>(
    "blogcategoryfollows",
    BlogCategoryFollowSchema,
  );
