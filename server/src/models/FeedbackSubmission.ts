import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedbackAttachmentMeta {
  mime: string;
  width: number;
  height: number;
  bytesIn: number;
  bytesOut: number;
  originalName?: string;
}

export interface IFeedbackSubmission extends Document {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  description: string;
  categoryId: mongoose.Types.ObjectId;
  categorySlug: string;
  categoryLabel: string;
  userId?: mongoose.Types.ObjectId;
  username?: string;
  /** Public URL path e.g. `/uploads/feedback/…` */
  attachmentUrl?: string;
  /** Optional label for the attachment (title + alt in UI / email). */
  attachmentTitle?: string;
  attachmentMeta?: IFeedbackAttachmentMeta;
  clientMeta?: Record<string, unknown>;
  serverMeta: {
    submittedAtIst: string;
    ip?: string;
    forwardedFor?: string;
    userAgent?: string;
    istTimeZone: string;
  };
  emailDelivered: boolean;
  emailError?: string;
}

const FeedbackSubmissionSchema = new Schema<IFeedbackSubmission>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'FeedbackCategory', required: true, index: true },
    categorySlug: { type: String, required: true, trim: true, lowercase: true, maxlength: 64 },
    categoryLabel: { type: String, required: true, trim: true, maxlength: 120 },
    userId: { type: Schema.Types.ObjectId, ref: 'users', index: true, default: undefined },
    username: { type: String, trim: true, maxlength: 64 },
    clientMeta: { type: Schema.Types.Mixed, default: undefined },
    attachmentUrl: { type: String, trim: true, maxlength: 500 },
    attachmentTitle: { type: String, trim: true, maxlength: 120 },
    attachmentMeta: {
      type: new Schema(
        {
          mime: { type: String, trim: true, maxlength: 40 },
          width: { type: Number },
          height: { type: Number },
          bytesIn: { type: Number },
          bytesOut: { type: Number },
          originalName: { type: String, trim: true, maxlength: 255 },
        },
        { _id: false }
      ),
      default: undefined,
    },
    serverMeta: {
      type: new Schema(
        {
          submittedAtIst: { type: String, required: true },
          ip: { type: String, trim: true, maxlength: 200 },
          forwardedFor: { type: String, trim: true, maxlength: 500 },
          userAgent: { type: String, trim: true, maxlength: 1024 },
          istTimeZone: { type: String, required: true },
        },
        { _id: false }
      ),
      required: true,
    },
    emailDelivered: { type: Boolean, default: false },
    emailError: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, collection: 'feedbacksubmissions' }
);

FeedbackSubmissionSchema.index({ createdAt: -1 });

export const FeedbackSubmissionModel: Model<IFeedbackSubmission> =
  mongoose.models?.FeedbackSubmission ??
  mongoose.model<IFeedbackSubmission>('FeedbackSubmission', FeedbackSubmissionSchema);
