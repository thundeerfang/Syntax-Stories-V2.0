import mongoose, { Schema, Document, Model } from "mongoose";
import {
  SQUAD_CATEGORY_VALUES,
  type SquadCategory,
  isSquadCategory,
} from "@syntax-stories/shared";
export { SQUAD_CATEGORY_VALUES, type SquadCategory, isSquadCategory };
export type SquadVisibility = "public" | "private";
export type SquadPostPolicy = "all_members" | "staff_only";
export type SquadInvitePermission = "all_members" | "staff_only";
export interface ISquad extends Document {
  slug: string;
  name: string;
  description: string;
  iconUrl?: string;
  coverBannerUrl?: string;
  visibility: SquadVisibility;
  category?: SquadCategory;
  postPolicy: SquadPostPolicy;
  requirePostApproval: boolean;
  invitePermission: SquadInvitePermission;
  createdById: mongoose.Types.ObjectId;
  memberCount: number;
  inviteToken?: string;
  createdAt: Date;
  updatedAt: Date;
}
const SquadSchema = new Schema<ISquad>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 40,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    iconUrl: { type: String, trim: true, maxlength: 2000 },
    coverBannerUrl: { type: String, trim: true, maxlength: 2000 },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    category: {
      type: String,
      enum: [...SQUAD_CATEGORY_VALUES],
      required: false,
      index: true,
    },
    postPolicy: {
      type: String,
      enum: ["all_members", "staff_only"],
      default: "all_members",
      index: true,
    },
    requirePostApproval: { type: Boolean, default: false, index: true },
    invitePermission: {
      type: String,
      enum: ["all_members", "staff_only"],
      default: "all_members",
      index: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    memberCount: { type: Number, default: 1, min: 0 },
    inviteToken: { type: String, trim: true, maxlength: 64, select: false },
  },
  { timestamps: true },
);
SquadSchema.index({ visibility: 1, createdAt: -1 });
SquadSchema.index({ visibility: 1, category: 1, createdAt: -1 });
export const SquadModel: Model<ISquad> =
  mongoose.models?.squads ?? mongoose.model<ISquad>("squads", SquadSchema);
