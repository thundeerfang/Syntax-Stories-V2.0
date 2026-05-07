import mongoose, { Schema, Document, Model } from 'mongoose';

export type AdminAccountKind = 'staff' | 'admin' | 'super_admin';

/**
 * Dashboard operator account: credentials and RBAC role live here (not on `users`).
 * `userId` is the platform user used for JWT sessions and profile identity.
 */
export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  kind: AdminAccountKind;
  roleId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 200 },
    kind: {
      type: String,
      enum: ['staff', 'admin', 'super_admin'],
      required: true,
      index: true,
    },
    roleId: { type: Schema.Types.ObjectId, ref: 'admin_roles', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, unique: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const AdminUserModel: Model<IAdminUser> =
  mongoose.models?.admin_users ?? mongoose.model<IAdminUser>('admin_users', AdminUserSchema);
