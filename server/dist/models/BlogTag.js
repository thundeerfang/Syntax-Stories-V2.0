import mongoose, { Schema } from 'mongoose';
const BlogTagSchema = new Schema({
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 48, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
export const BlogTagModel = mongoose.models?.blogtags ?? mongoose.model('blogtags', BlogTagSchema);
//# sourceMappingURL=BlogTag.js.map