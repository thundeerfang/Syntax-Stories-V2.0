import mongoose, { Schema, Document, Model } from 'mongoose';
import { formatDateTimeIst } from '../utils/ist.js';

export interface IFeedbackCategory extends Document {
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
  /** Seeded defaults; future admin can add non-system rows. */
  isSystemSeed: boolean;
  createdByUserId?: mongoose.Types.ObjectId;
  updatedByUserId?: mongoose.Types.ObjectId;
  /** Display until admin UI stores real names (e.g. "system", "admin"). */
  createdByLabel: string;
  updatedByLabel: string;
  createdAtIst: string;
  updatedAtIst: string;
}

const FeedbackCategorySchema = new Schema<IFeedbackCategory>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 64 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    isSystemSeed: { type: Boolean, default: false },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'users', default: undefined },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'users', default: undefined },
    createdByLabel: { type: String, trim: true, maxlength: 120, default: 'system' },
    updatedByLabel: { type: String, trim: true, maxlength: 120, default: 'system' },
    createdAtIst: { type: String, required: true, trim: true, maxlength: 80 },
    updatedAtIst: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: true, collection: 'feedbackcategories' }
);

FeedbackCategorySchema.index({ active: 1, sortOrder: 1 });

FeedbackCategorySchema.pre('save', function preSaveIst(next) {
  const ist = formatDateTimeIst();
  if (this.isNew && !this.createdAtIst) this.createdAtIst = ist;
  this.updatedAtIst = ist;
  next();
});

export const FeedbackCategoryModel: Model<IFeedbackCategory> =
  mongoose.models?.FeedbackCategory ??
  mongoose.model<IFeedbackCategory>('FeedbackCategory', FeedbackCategorySchema);
