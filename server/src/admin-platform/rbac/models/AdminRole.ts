import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminRole extends Document {
  name: string;
  /** Higher = more privileged; assignment cannot exceed actor's max role level (§13.6). */
  level: number;
  permissions: string[];
  description?: string;
  /** When true, role cannot be soft-deleted (e.g. Super Admin). */
  systemProtected?: boolean;
  deletedAt?: Date | null;
  deletedById?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdminRoleSchema = new Schema<IAdminRole>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    level: { type: Number, required: true, min: 0, max: 1000, index: true },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator(v: unknown) {
          return Array.isArray(v) && v.length <= 200;
        },
        message: 'At most 200 permission strings per role',
      },
    },
    description: { type: String, trim: true, maxlength: 500 },
    systemProtected: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: Schema.Types.ObjectId, ref: 'users', default: null },
  },
  { timestamps: true }
);

AdminRoleSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const AdminRoleModel: Model<IAdminRole> =
  mongoose.models?.admin_roles ?? mongoose.model<IAdminRole>('admin_roles', AdminRoleSchema);
