import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { HelpIconKey } from './help.icons.js';

export interface IHelpHubConfig extends Document {
  singleton: 'default';
  title: string;
  description: string;
  supportLinkLabel: string;
  supportLinkHref: string;
  headerIcon: HelpIconKey;
  emptyTitle: string;
  emptyDescription: string;
  updatedAt: Date;
}

export const DEFAULT_HELP_HUB_CONFIG = {
  title: 'Frequently asked questions',
  description:
    "These are the most commonly asked questions about Syntax Stories. Can't find what you're looking for?",
  supportLinkLabel: 'Chat to our friendly team!',
  supportLinkHref: '/contact',
  headerIcon: 'circle-help' as HelpIconKey,
  emptyTitle: 'No help articles yet',
  emptyDescription:
    'Check back soon — we are preparing answers to common questions. Need help now? Reach out to our team.',
};

const HelpHubConfigSchema = new Schema<IHelpHubConfig>(
  {
    singleton: { type: String, default: 'default', unique: true, immutable: true },
    title: { type: String, default: DEFAULT_HELP_HUB_CONFIG.title, trim: true, maxlength: 200 },
    description: {
      type: String,
      default: DEFAULT_HELP_HUB_CONFIG.description,
      trim: true,
      maxlength: 2000,
    },
    supportLinkLabel: {
      type: String,
      default: DEFAULT_HELP_HUB_CONFIG.supportLinkLabel,
      trim: true,
      maxlength: 120,
    },
    supportLinkHref: {
      type: String,
      default: DEFAULT_HELP_HUB_CONFIG.supportLinkHref,
      trim: true,
      maxlength: 500,
    },
    headerIcon: { type: String, default: DEFAULT_HELP_HUB_CONFIG.headerIcon, trim: true, maxlength: 80 },
    emptyTitle: {
      type: String,
      default: DEFAULT_HELP_HUB_CONFIG.emptyTitle,
      trim: true,
      maxlength: 200,
    },
    emptyDescription: {
      type: String,
      default: DEFAULT_HELP_HUB_CONFIG.emptyDescription,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const HelpHubConfigModel: Model<IHelpHubConfig> =
  mongoose.models?.helphubconfigs ??
  mongoose.model<IHelpHubConfig>('helphubconfigs', HelpHubConfigSchema);
