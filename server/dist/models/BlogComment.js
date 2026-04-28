import mongoose, { Schema } from 'mongoose';
const BlogCommentSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'blogposts', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });
BlogCommentSchema.index({ postId: 1, createdAt: -1 });
export const BlogCommentModel = mongoose.models?.blogcomments ?? mongoose.model('blogcomments', BlogCommentSchema);
//# sourceMappingURL=BlogComment.js.map