import mongoose, { Document, Model } from 'mongoose';
export interface ISession extends Document {
    userId: mongoose.Types.ObjectId;
    refreshTokenHash: string;
    deviceName: string;
    userAgent?: string;
    ip?: string;
    lastActiveAt: Date;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
}
export declare const SessionModel: Model<ISession>;
//# sourceMappingURL=Session.d.ts.map