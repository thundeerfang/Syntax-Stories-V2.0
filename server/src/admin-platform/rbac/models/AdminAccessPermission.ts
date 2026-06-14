import mongoose, { Schema, Document, Model } from "mongoose";
export interface IAdminAccessPermission extends Document {
  key: string;
  resource: string;
  action: string;
  type: string;
  description?: string;
  sortOrder: number;
  deletedAt?: Date | null;
  deletedById?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
const AdminAccessPermissionSchema = new Schema<IAdminAccessPermission>(
  {
    key: { type: String, required: true, trim: true, maxlength: 120 },
    resource: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      default: "management",
    },
    description: { type: String, trim: true, maxlength: 500 },
    sortOrder: { type: Number, default: 0, index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: Schema.Types.ObjectId, ref: "users", default: null },
  },
  { timestamps: true },
);
AdminAccessPermissionSchema.index(
  { key: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
AdminAccessPermissionSchema.index({ deletedAt: 1, resource: 1, action: 1 });
export const AdminAccessPermissionModel: Model<IAdminAccessPermission> =
  mongoose.models?.admin_access_permissions ??
  mongoose.model<IAdminAccessPermission>(
    "admin_access_permissions",
    AdminAccessPermissionSchema,
  );
