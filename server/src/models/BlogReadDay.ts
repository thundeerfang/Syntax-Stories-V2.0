import mongoose, { Document, Schema } from "mongoose";
export interface IBlogReadDay extends Document {
  readerId: mongoose.Types.ObjectId;
  dayBucket: string;
  updatedAt: Date;
}
const BlogReadDaySchema = new Schema<IBlogReadDay>(
  {
    readerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    dayBucket: { type: String, required: true, maxlength: 10 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);
BlogReadDaySchema.index({ readerId: 1, dayBucket: 1 }, { unique: true });
export const BlogReadDayModel = mongoose.model<IBlogReadDay>(
  "BlogReadDay",
  BlogReadDaySchema,
);
