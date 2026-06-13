import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminActionType extends Document {
  /** Stable slug, e.g. `read`, `list`, `create` — used in permission keys. */
  slug: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  deletedAt?: Date | null;
  deletedById?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdminActionTypeSchema = new Schema<IAdminActionType>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true, maxlength: 80 },
    displayName: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 500 },
    sortOrder: { type: Number, default: 0, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: Schema.Types.ObjectId, ref: 'users', default: null },
  },
  { timestamps: true }
);

AdminActionTypeSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
AdminActionTypeSchema.index({ deletedAt: 1, sortOrder: 1 });

export const AdminActionTypeModel: Model<IAdminActionType> =
  mongoose.models?.admin_action_types ??
  mongoose.model<IAdminActionType>('admin_action_types', AdminActionTypeSchema);
