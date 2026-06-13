import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminUserRole extends Document {
  userId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserRoleSchema = new Schema<IAdminUserRole>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'admin_roles', required: true, index: true },
  },
  { timestamps: true }
);

AdminUserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

export const AdminUserRoleModel: Model<IAdminUserRole> =
  mongoose.models?.admin_user_roles ??
  mongoose.model<IAdminUserRole>('admin_user_roles', AdminUserRoleSchema);
