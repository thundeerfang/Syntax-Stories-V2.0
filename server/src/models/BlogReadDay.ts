import mongoose, { Document, Schema } from 'mongoose';

/**
 * One row per UTC calendar day on which the user read at least one published blog (not their own).
 * Used for public "reading streak" stats on profiles.
 */
export interface IBlogReadDay extends Document {
  readerId: mongoose.Types.ObjectId;
  /** UTC date `YYYY-MM-DD` */
  dayBucket: string;
  updatedAt: Date;
}

const BlogReadDaySchema = new Schema<IBlogReadDay>(
  {
    readerId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    dayBucket: { type: String, required: true, maxlength: 10 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

BlogReadDaySchema.index({ readerId: 1, dayBucket: 1 }, { unique: true });

export const BlogReadDayModel = mongoose.model<IBlogReadDay>('BlogReadDay', BlogReadDaySchema);
