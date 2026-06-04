import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReferralStatus = 'pending' | 'verified' | 'rewarded' | 'expired' | 'rejected';

export interface IReferralConversion extends Document {
  referrerId: mongoose.Types.ObjectId;
  refereeId: mongoose.Types.ObjectId;
  status: ReferralStatus;
  source: string;
  qualifiedAt?: Date;
  rewardedAt?: Date;
  rewardAmount?: number;
  convertedAt?: Date;
  deviceHash?: string;
  ipHash?: string;
  rejectReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ReferralConversionSchema = new Schema<IReferralConversion>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    refereeId: { type: Schema.Types.ObjectId, ref: 'users', required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'verified', 'rewarded', 'expired', 'rejected'],
      default: 'pending',
      index: true,
    },
    source: { type: String, required: true, trim: true, maxlength: 32 },
    qualifiedAt: { type: Date },
    rewardedAt: { type: Date },
    rewardAmount: { type: Number, min: 0 },
    convertedAt: { type: Date },
    deviceHash: { type: String, trim: true, maxlength: 64 },
    ipHash: { type: String, trim: true, maxlength: 64 },
    rejectReason: { type: String, trim: true, maxlength: 128 },
  },
  { timestamps: true, collection: 'referralconversions' }
);

ReferralConversionSchema.index({ referrerId: 1, createdAt: -1 });
ReferralConversionSchema.index({ referrerId: 1, status: 1 });

export const ReferralConversionModel: Model<IReferralConversion> =
  mongoose.models?.ReferralConversion ??
  mongoose.model<IReferralConversion>('ReferralConversion', ReferralConversionSchema);
