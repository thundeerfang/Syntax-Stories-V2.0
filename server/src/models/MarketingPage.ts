import mongoose, { Schema, Document, Model } from 'mongoose';

export type MarketingPageSlug = 'about';

export interface MarketingHero {
  badge: string;
  title: string;
  titleHighlight: string;
  description: string;
}

export interface MarketingJourneyItem {
  year: string;
  event: string;
  sortOrder: number;
}

export interface MarketingTechItem {
  name: string;
  icon: string;
  sortOrder: number;
}

export interface MarketingFeatureItem {
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface MarketingTeamMember {
  name: string;
  role: string;
  imageUrl: string;
  githubUrl?: string;
  xUrl?: string;
  sortOrder: number;
}

export interface MarketingCta {
  title: string;
  description: string;
  buttonLabel: string;
}

export interface IMarketingPage extends Document {
  slug: MarketingPageSlug;
  hero: MarketingHero;
  journey: MarketingJourneyItem[];
  techStack: MarketingTechItem[];
  features: MarketingFeatureItem[];
  team: MarketingTeamMember[];
  cta: MarketingCta;
  footerNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const journeySchema = new Schema<MarketingJourneyItem>(
  {
    year: { type: String, required: true, trim: true, maxlength: 32 },
    event: { type: String, required: true, trim: true, maxlength: 500 },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const techSchema = new Schema<MarketingTechItem>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    icon: { type: String, required: true, trim: true, maxlength: 40 },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const featureSchema = new Schema<MarketingFeatureItem>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    icon: { type: String, required: true, trim: true, maxlength: 40 },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const teamSchema = new Schema<MarketingTeamMember>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, required: true, trim: true, maxlength: 160 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
    githubUrl: { type: String, trim: true, maxlength: 500 },
    xUrl: { type: String, trim: true, maxlength: 500 },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const MarketingPageSchema = new Schema<IMarketingPage>(
  {
    slug: { type: String, required: true, unique: true, enum: ['about'], index: true },
    hero: {
      badge: { type: String, required: true, trim: true, maxlength: 64 },
      title: { type: String, required: true, trim: true, maxlength: 200 },
      titleHighlight: { type: String, required: true, trim: true, maxlength: 80 },
      description: { type: String, required: true, trim: true, maxlength: 1000 },
    },
    journey: { type: [journeySchema], default: [] },
    techStack: { type: [techSchema], default: [] },
    features: { type: [featureSchema], default: [] },
    team: { type: [teamSchema], default: [] },
    cta: {
      title: { type: String, required: true, trim: true, maxlength: 200 },
      description: { type: String, required: true, trim: true, maxlength: 500 },
      buttonLabel: { type: String, required: true, trim: true, maxlength: 64 },
    },
    footerNote: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

export const MarketingPageModel: Model<IMarketingPage> =
  mongoose.models?.marketing_pages ??
  mongoose.model<IMarketingPage>('marketing_pages', MarketingPageSchema);
