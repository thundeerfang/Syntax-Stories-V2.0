import mongoose, { Schema, Document, Model } from "mongoose";
export interface IBlogComment extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId | null;
  text: string;
  likedBy: mongoose.Types.ObjectId[];
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
const BlogCommentSchema = new Schema<IBlogComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "blogposts",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "blogcomments",
      default: null,
      index: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 50000 },
    likedBy: {
      type: [{ type: Schema.Types.ObjectId, ref: "users" }],
      default: [],
    },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
BlogCommentSchema.index({ postId: 1, createdAt: -1 });
BlogCommentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });
export const BlogCommentModel: Model<IBlogComment> =
  mongoose.models?.blogcomments ??
  mongoose.model<IBlogComment>("blogcomments", BlogCommentSchema);
