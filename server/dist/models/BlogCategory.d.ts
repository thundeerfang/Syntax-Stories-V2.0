import { Document, Model } from 'mongoose';
/** Curated category row (slug used on posts). Post counts come from aggregation, not this field. */
export interface IBlogCategory extends Document {
    slug: string;
    name: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const BlogCategoryModel: Model<IBlogCategory>;
//# sourceMappingURL=BlogCategory.d.ts.map