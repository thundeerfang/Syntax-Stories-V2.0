import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContactLead extends Document {
  fullName: string;
  email: string;
  company?: string;
  topic: string;
  message: string;
  userId?: mongoose.Types.ObjectId;
  username?: string;
  clientMeta?: Record<string, unknown>;
  serverMeta: {
    submittedAtIst: string;
    ip?: string;
    forwardedFor?: string;
    userAgent?: string;
    istTimeZone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContactLeadSchema = new Schema<IContactLead>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    company: { type: String, trim: true, maxlength: 120 },
    topic: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    userId: { type: Schema.Types.ObjectId, ref: 'users', index: true, default: undefined },
    username: { type: String, trim: true, maxlength: 64 },
    clientMeta: { type: Schema.Types.Mixed, default: undefined },
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
  },
  { timestamps: true, collection: 'contactleads' }
);

ContactLeadSchema.index({ createdAt: -1 });

export const ContactLeadModel: Model<IContactLead> =
  mongoose.models?.ContactLead ?? mongoose.model<IContactLead>('ContactLead', ContactLeadSchema);
