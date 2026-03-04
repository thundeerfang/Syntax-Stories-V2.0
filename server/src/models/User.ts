import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  profileImg?: string;
  gender?: string;
  job?: string;
  bio?: string;
  linkedin?: string;
  instagram?: string;
  github?: string;
  isGoogleAccount: boolean;
  isGitAccount: boolean;
  isFacebookAccount: boolean;
  isXAccount: boolean;
  isAppleAccount: boolean;
  googleId?: string;
  gitId?: string;
  facebookId?: string;
  appleId?: string;
  xId?: string;
  /** OAuth provider access tokens (stored for optional API use; never expose to client) */
  googleToken?: string;
  githubToken?: string;
  facebookToken?: string;
  xToken?: string;
  appleToken?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  subscription?: mongoose.Types.ObjectId;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    profileImg: {
      type: String,
      default: 'https://res.cloudinary.com/dr2bxpjjz/image/upload/v1737041910/uploads/waumti9zvnnmgayfxbmv.png',
    },
    gender: { type: String },
    job: { type: String },
    bio: {
      type: String,
      default: 'Welcome to Syntax Stories 🧑🏻‍💻, you can add your bio you want..🚀',
    },
    linkedin: { type: String },
    instagram: { type: String },
    github: { type: String },
    isGoogleAccount: { type: Boolean, default: false },
    isGitAccount: { type: Boolean, default: false },
    isFacebookAccount: { type: Boolean, default: false },
    isXAccount: { type: Boolean, default: false },
    isAppleAccount: { type: Boolean, default: false },
    googleId: { type: String, sparse: true },
    gitId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    appleId: { type: String, sparse: true },
    xId: { type: String, sparse: true },
    googleToken: { type: String, select: false },
    githubToken: { type: String, select: false },
    facebookToken: { type: String, select: false },
    xToken: { type: String, select: false },
    appleToken: { type: String, select: false },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    subscription: { type: Schema.Types.ObjectId, ref: 'subscriptions', default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const UserModel: Model<IUser> =
  mongoose.models?.users ?? mongoose.model<IUser>('users', UserSchema);
