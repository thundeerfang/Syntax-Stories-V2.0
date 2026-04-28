import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlogComment extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogCommentSchema = new Schema<IBlogComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'blogposts', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

BlogCommentSchema.index({ postId: 1, createdAt: -1 });

export const BlogCommentModel: Model<IBlogComment> =
  mongoose.models?.blogcomments ?? mongoose.model<IBlogComment>('blogcomments', BlogCommentSchema);
