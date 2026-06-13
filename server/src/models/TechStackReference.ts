import mongoose, { Schema, Document, Model } from 'mongoose';

export const TECH_STACK_REFERENCE_CATEGORIES = [
  'Frontend',
  'Backend',
  'Mobile',
  'Database',
  'DevOps',
  'Cloud',
  'Library',
  'Tool',
  'Language',
  'Design',
] as const;

export type TechStackReferenceCategory = (typeof TECH_STACK_REFERENCE_CATEGORIES)[number];

export interface ITechStackReference extends Document {
  name: string;
  slug: string;
  category: TechStackReferenceCategory;
  /** Optional override when catalog slug ≠ skillicons.dev slug (e.g. ts, nextjs). */
  iconSlug?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TechStackReferenceSchema = new Schema<ITechStackReference>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 64 },
    category: {
      type: String,
      required: true,
      enum: TECH_STACK_REFERENCE_CATEGORIES,
    },
    iconSlug: { type: String, trim: true, lowercase: true, maxlength: 64 },
  },
  { timestamps: true }
);

TechStackReferenceSchema.index({ slug: 1, name: 1 }, { unique: true });
TechStackReferenceSchema.index({ name: 'text', slug: 'text' });

export const TechStackReferenceModel: Model<ITechStackReference> =
  mongoose.models?.techstackreferences ??
  mongoose.model<ITechStackReference>('techstackreferences', TechStackReferenceSchema);
