import mongoose, { Schema, Document, Model } from 'mongoose';

/** A published blog post surfaced in a squad feed via “Share to squad”. */
export interface ISquadSharedPost extends Document {
  squadId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  sharedById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SquadSharedPostSchema = new Schema<ISquadSharedPost>(
  {
    squadId: { type: Schema.Types.ObjectId, ref: 'squads', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'blogposts', required: true, index: true },
    sharedById: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  },
  { timestamps: true }
);

SquadSharedPostSchema.index({ squadId: 1, postId: 1 }, { unique: true });
SquadSharedPostSchema.index({ squadId: 1, createdAt: -1 });

export const SquadSharedPostModel: Model<ISquadSharedPost> =
  mongoose.models?.squadsharedposts ??
  mongoose.model<ISquadSharedPost>('squadsharedposts', SquadSharedPostSchema);
