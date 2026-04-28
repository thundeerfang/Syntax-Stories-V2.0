import mongoose, { Document, Model } from 'mongoose';
export interface IFollow extends Document {
    follower: mongoose.Types.ObjectId;
    following: mongoose.Types.ObjectId;
    createdAt: Date;
}
export declare const FollowModel: Model<IFollow>;
//# sourceMappingURL=Follow.d.ts.map