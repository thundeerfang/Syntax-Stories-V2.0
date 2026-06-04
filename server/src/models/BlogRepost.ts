import mongoose, { Schema, Document, Model } from 'mongoose';

/** One row per (user, post): user has Reposted this published post. */
export interface IBlogRepost extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BlogRepostSchema = new Schema<IBlogRepost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'blogposts', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BlogRepostSchema.index({ userId: 1, postId: 1 }, { unique: true });
BlogRepostSchema.index({ postId: 1 });

export const BlogRepostModel: Model<IBlogRepost> =
  mongoose.models?.blogreposts ?? mongoose.model<IBlogRepost>('blogreposts', BlogRepostSchema);
