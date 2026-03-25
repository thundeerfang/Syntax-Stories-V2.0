import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  },
  { timestamps: true }
);

// Atomic dedupe (field-level `index: true` already covers single-field indexes)
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

export const FollowModel: Model<IFollow> =
  mongoose.models?.follows ?? mongoose.model<IFollow>('follows', FollowSchema);
