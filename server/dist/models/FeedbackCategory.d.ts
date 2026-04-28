import mongoose, { Document, Model } from 'mongoose';
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
export declare const FeedbackCategoryModel: Model<IFeedbackCategory>;
//# sourceMappingURL=FeedbackCategory.d.ts.map