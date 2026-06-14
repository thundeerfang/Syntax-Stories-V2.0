import mongoose, { Schema, Document, Model } from "mongoose";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_CELEBRATE_AS,
  ACHIEVEMENT_METRICS,
  ACHIEVEMENT_MODULES,
  type AchievementCategory,
  type AchievementCelebrateAs,
  type AchievementMetric,
  type AchievementModule,
} from "../achievements/achievement.types.js";
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
const AchievementCatalogSchema = new Schema<IAchievementCatalog>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 64,
    },
    slug: { type: String, required: true, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 280 },
    category: {
      type: String,
      required: true,
      enum: [...ACHIEVEMENT_CATEGORIES],
    },
    module: {
      type: String,
      required: true,
      enum: [...ACHIEVEMENT_MODULES],
    },
    points: { type: Number, required: true, min: 0, max: 10000 },
    metric: { type: String, required: true, enum: [...ACHIEVEMENT_METRICS] },
    target: { type: Number, required: true, min: 1, max: 1000000 },
    unlocksAfter: { type: String, trim: true, maxlength: 64, default: null },
    celebrateAs: {
      type: String,
      required: true,
      enum: [...ACHIEVEMENT_CELEBRATE_AS],
      default: "dialog",
    },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "achievementcatalog" },
);
AchievementCatalogSchema.index({ active: 1, sortOrder: 1 });
AchievementCatalogSchema.index({ module: 1, active: 1 });
export const AchievementCatalogModel: Model<IAchievementCatalog> =
  mongoose.models?.AchievementCatalog ??
  mongoose.model<IAchievementCatalog>(
    "AchievementCatalog",
    AchievementCatalogSchema,
  );
