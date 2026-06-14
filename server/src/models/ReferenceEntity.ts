import mongoose, { Schema, Document, Model } from "mongoose";
export type ReferenceEntityKind = "company" | "school" | "organization";
export interface IReferenceEntity extends Document {
  kind: ReferenceEntityKind;
  name: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
}
const ReferenceEntitySchema = new Schema<IReferenceEntity>(
  {
    kind: {
      type: String,
      required: true,
      enum: ["company", "school", "organization"],
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
  },
  { timestamps: true },
);
ReferenceEntitySchema.index({ kind: 1, domain: 1 }, { unique: true });
ReferenceEntitySchema.index({ kind: 1, name: 1 });
export const ReferenceEntityModel: Model<IReferenceEntity> =
  mongoose.models?.referenceentities ??
  mongoose.model<IReferenceEntity>("referenceentities", ReferenceEntitySchema);
