import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminResource extends Document {
  /** Stable slug, e.g. `user`, `billing` — used in permission keys. */
  slug: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  deletedAt?: Date | null;
  deletedById?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdminResourceSchema = new Schema<IAdminResource>(
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

AdminResourceSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
AdminResourceSchema.index({ deletedAt: 1, sortOrder: 1 });

export const AdminResourceModel: Model<IAdminResource> =
  mongoose.models?.admin_resources ?? mongoose.model<IAdminResource>('admin_resources', AdminResourceSchema);
