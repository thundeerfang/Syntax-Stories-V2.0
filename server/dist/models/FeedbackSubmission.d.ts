import mongoose, { Document, Model } from 'mongoose';
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
export declare const FeedbackSubmissionModel: Model<IFeedbackSubmission>;
//# sourceMappingURL=FeedbackSubmission.d.ts.map