import mongoose, { Schema, Document, Model } from 'mongoose';

/** Denormalized counters for achievement evaluation — single-doc read per user. */
export interface IUserStats extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId?: string | null;
  postsCount: number;
  followingCount: number;
  followersCount: number;
  respectGiven: number;
  respectReceived: number;
  briefsRead: number;
  categoriesFollowedCount: number;
  squadsJoinedCount: number;
  feedbackSubmittedCount: number;
  stackToolsCount: number;
  setupCount: number;
  hasAvatar: number;
  hasBio: number;
  hasCover: number;
  hasGithub: number;
  hasLocation: number;
  hasCv: number;
  readStreakLongest: number;
  referralsConverted: number;
  referralsPending: number;
  totalAchievementPoints: number;
  xp: number;
  level: number;
  catalogVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, unique: true, index: true },
    tenantId: { type: String, trim: true, maxlength: 64, default: null, index: true },
    postsCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    followersCount: { type: Number, default: 0, min: 0 },
    respectGiven: { type: Number, default: 0, min: 0 },
    respectReceived: { type: Number, default: 0, min: 0 },
    briefsRead: { type: Number, default: 0, min: 0 },
    categoriesFollowedCount: { type: Number, default: 0, min: 0 },
    squadsJoinedCount: { type: Number, default: 0, min: 0 },
    feedbackSubmittedCount: { type: Number, default: 0, min: 0 },
    stackToolsCount: { type: Number, default: 0, min: 0 },
    setupCount: { type: Number, default: 0, min: 0 },
    hasAvatar: { type: Number, default: 0, min: 0, max: 1 },
    hasBio: { type: Number, default: 0, min: 0, max: 1 },
    hasCover: { type: Number, default: 0, min: 0, max: 1 },
    hasGithub: { type: Number, default: 0, min: 0, max: 1 },
    hasLocation: { type: Number, default: 0, min: 0, max: 1 },
    hasCv: { type: Number, default: 0, min: 0, max: 1 },
    readStreakLongest: { type: Number, default: 0, min: 0 },
    referralsConverted: { type: Number, default: 0, min: 0 },
    referralsPending: { type: Number, default: 0, min: 0 },
    totalAchievementPoints: { type: Number, default: 0, min: 0 },
    xp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    catalogVersion: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true, collection: 'userstats' }
);

export const UserStatsModel: Model<IUserStats> =
  mongoose.models?.UserStats ?? mongoose.model<IUserStats>('UserStats', UserStatsSchema);
