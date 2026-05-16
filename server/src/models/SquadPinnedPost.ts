import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISquadPinnedPost extends Document {
  squadId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  pinnedById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SquadPinnedPostSchema = new Schema<ISquadPinnedPost>(
  {
    squadId: { type: Schema.Types.ObjectId, ref: 'squads', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'blogposts', required: true, index: true },
    pinnedById: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  },
  { timestamps: true },
);

SquadPinnedPostSchema.index({ squadId: 1, postId: 1 }, { unique: true });
SquadPinnedPostSchema.index({ squadId: 1, createdAt: -1 });

export const SquadPinnedPostModel: Model<ISquadPinnedPost> =
  mongoose.models?.squadpinnedposts ??
  mongoose.model<ISquadPinnedPost>('squadpinnedposts', SquadPinnedPostSchema);
