import mongoose, { Schema } from 'mongoose';
const BlogCategorySchema = new Schema({
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 64, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
export const BlogCategoryModel = mongoose.models?.blogcategories ?? mongoose.model('blogcategories', BlogCategorySchema);
//# sourceMappingURL=BlogCategory.js.map