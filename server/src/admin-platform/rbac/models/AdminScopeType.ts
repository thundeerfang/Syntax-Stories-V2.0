import mongoose, { Schema, Document, Model } from "mongoose";
export interface IAdminScopeType extends Document {
  slug: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  deletedAt?: Date | null;
  deletedById?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const AdminScopeTypeSchema = new Schema<IAdminScopeType>(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
    },
    displayName: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 500 },
    sortOrder: { type: Number, default: 0, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: Schema.Types.ObjectId, ref: "users", default: null },
  },
  { timestamps: true },
);
AdminScopeTypeSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
AdminScopeTypeSchema.index({ deletedAt: 1, sortOrder: 1 });
export const AdminScopeTypeModel: Model<IAdminScopeType> =
  mongoose.models?.admin_scope_types ??
  mongoose.model<IAdminScopeType>("admin_scope_types", AdminScopeTypeSchema);
