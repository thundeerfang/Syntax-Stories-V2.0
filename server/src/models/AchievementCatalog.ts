import mongoose, { Schema, Document, Model } from 'mongoose';
import type {
  AchievementCategory,
  AchievementCelebrateAs,
  AchievementMetric,
  AchievementModule,
} from '../achievements/achievement.types.js';

export interface IAchievementCatalog extends Document {
  key: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementCategory;
  module: AchievementModule;
  points: number;
  metric: AchievementMetric;
  target: number;
  unlocksAfter?: string | null;
  celebrateAs: AchievementCelebrateAs;
  sortOrder: number;
  active: boolean;
}

const ACHIEVEMENT_METRICS = [
  'respect.given.total',
  'respect.received.total',
  'read.brief.total',
  'stack.tools.count',
  'followers.count',
  'read.streak.longest',
  'profile.has_avatar',
  'profile.has_location',
  'profile.has_work',
  'profile.has_education',
  'profile.has_cv',
  'profile.has_bio',
  'profile.has_cover',
  'profile.has_github',
  'profile.setup.count',
  'social.following.count',
  'blog.categories.followed.count',
  'squads.joined.count',
  'feedback.submitted.count',
  'posts.authored.count',
] as const;

const AchievementCatalogSchema = new Schema<IAchievementCatalog>(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 64 },
    slug: { type: String, required: true, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 280 },
    category: {
      type: String,
      required: true,
      enum: ['engagement', 'profile', 'reading', 'social', 'meta'],
    },
    module: {
      type: String,
      required: true,
      enum: ['profile', 'blog', 'reading', 'social', 'engagement', 'meta'],
    },
    points: { type: Number, required: true, min: 0, max: 10_000 },
    metric: { type: String, required: true, enum: ACHIEVEMENT_METRICS },
    target: { type: Number, required: true, min: 1, max: 1_000_000 },
    unlocksAfter: { type: String, trim: true, maxlength: 64, default: null },
    celebrateAs: { type: String, required: true, enum: ['dialog'], default: 'dialog' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'achievementcatalog' }
);

AchievementCatalogSchema.index({ active: 1, sortOrder: 1 });
AchievementCatalogSchema.index({ module: 1, active: 1 });

export const AchievementCatalogModel: Model<IAchievementCatalog> =
  mongoose.models?.AchievementCatalog ??
  mongoose.model<IAchievementCatalog>('AchievementCatalog', AchievementCatalogSchema);
