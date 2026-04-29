import { Document, Model } from 'mongoose';
/**
 * Optional curated tag (slug). Authors may also use tags not listed here; counts for all tags
 * come from published posts aggregation.
 */
export interface IBlogTag extends Document {
    slug: string;
    name: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const BlogTagModel: Model<IBlogTag>;
//# sourceMappingURL=BlogTag.d.ts.map