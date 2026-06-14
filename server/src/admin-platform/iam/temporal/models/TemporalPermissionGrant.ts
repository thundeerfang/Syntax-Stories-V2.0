import mongoose, { Schema, Document, Model } from "mongoose";
export interface ITemporalPermissionGrant extends Document {
  userId: mongoose.Types.ObjectId;
  grantedById: mongoose.Types.ObjectId;
  permissions: string[];
  reason?: string;
  startsAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}
const TemporalPermissionGrantSchema = new Schema<ITemporalPermissionGrant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    grantedById: { type: Schema.Types.ObjectId, ref: "users", required: true },
    permissions: { type: [String], required: true },
    reason: { type: String },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
TemporalPermissionGrantSchema.index({ userId: 1, expiresAt: 1, revokedAt: 1 });
export const TemporalPermissionGrantModel: Model<ITemporalPermissionGrant> =
  mongoose.models?.temporal_permission_grants ??
  mongoose.model<ITemporalPermissionGrant>(
    "temporal_permission_grants",
    TemporalPermissionGrantSchema,
  );
