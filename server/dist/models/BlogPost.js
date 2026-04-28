import mongoose, { Schema } from 'mongoose';
const BlogPostSchema = new Schema({
    authorId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, trim: true, maxlength: 320 },
    summary: { type: String, trim: true, maxlength: 12000, default: '' },
    content: { type: String, required: true, default: '' },
    thumbnailUrl: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    lastEditedAt: { type: Date, default: null },
    lastEditedById: { type: Schema.Types.ObjectId, ref: 'users', default: null },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: Schema.Types.ObjectId, ref: 'users', default: null },
}, { timestamps: true });
// Unique slug per author (same author cannot have two posts with same slug)
BlogPostSchema.index({ authorId: 1, slug: 1 }, { unique: true });
BlogPostSchema.index({ status: 1, createdAt: -1 });
export const BlogPostModel = mongoose.models?.blogposts ?? mongoose.model('blogposts', BlogPostSchema);
//# sourceMappingURL=BlogPost.js.map