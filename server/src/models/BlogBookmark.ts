import mongoose, { Schema, Document, Model } from 'mongoose';

/** One row per (user, post): user saved this post to bookmarks. */
export interface IBlogBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  /** Saved-folder bucket; assigned on save (defaults to user’s default group). */
  groupId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const BlogBookmarkSchema = new Schema<IBlogBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'blogposts', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'bookmarkgroups', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BlogBookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });
BlogBookmarkSchema.index({ postId: 1 });
BlogBookmarkSchema.index({ userId: 1, groupId: 1 });

export const BlogBookmarkModel: Model<IBlogBookmark> =
  mongoose.models?.blogbookmarks ??
  mongoose.model<IBlogBookmark>('blogbookmarks', BlogBookmarkSchema);
