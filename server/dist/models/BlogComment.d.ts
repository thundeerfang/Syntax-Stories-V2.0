import mongoose, { Document, Model } from 'mongoose';
export interface IBlogComment extends Document {
    postId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const BlogCommentModel: Model<IBlogComment>;
//# sourceMappingURL=BlogComment.d.ts.map