import mongoose, { Schema, Document, Model } from "mongoose";
export interface IBookmarkGroup extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  emoji?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const BookmarkGroupSchema = new Schema<IBookmarkGroup>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    emoji: { type: String, trim: true, maxlength: 8, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);
BookmarkGroupSchema.index({ userId: 1, name: 1 }, { unique: true });
BookmarkGroupSchema.index({ userId: 1, isDefault: 1 });
export const BookmarkGroupModel: Model<IBookmarkGroup> =
  mongoose.models?.bookmarkgroups ??
  mongoose.model<IBookmarkGroup>("bookmarkgroups", BookmarkGroupSchema);
