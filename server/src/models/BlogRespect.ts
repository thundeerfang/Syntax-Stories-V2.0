import mongoose, { Schema, Document, Model } from 'mongoose';

/** One row per (user, post): reader U currently Respects published post P. */
export interface IBlogRespect extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BlogRespectSchema = new Schema<IBlogRespect>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'blogposts', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BlogRespectSchema.index({ userId: 1, postId: 1 }, { unique: true });
BlogRespectSchema.index({ postId: 1 });

export const BlogRespectModel: Model<IBlogRespect> =
  mongoose.models?.blogrespects ?? mongoose.model<IBlogRespect>('blogrespects', BlogRespectSchema);
