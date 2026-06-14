import mongoose, { Schema, Document, Model } from "mongoose";
export type BlogPostStatus = "draft" | "published" | "suspended";
export interface IBlogPost extends Document {
  authorId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
  category?: string;
  categories?: string[];
  tags?: string[];
  language?: string;
  status: BlogPostStatus;
  suspendedAt?: Date;
  suspendedById?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  lastEditedAt?: Date;
  lastEditedById?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  deletedById?: mongoose.Types.ObjectId;
  respectCount: number;
  repostCount: number;
  bookmarkCount: number;
  commentCount: number;
  viewCount: number;
  squadId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const BlogPostSchema = new Schema<IBlogPost>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, trim: true, maxlength: 320 },
    summary: { type: String, trim: true, maxlength: 12000, default: "" },
    content: { type: String, required: true, default: "" },
    thumbnailUrl: { type: String, trim: true, maxlength: 2000 },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 48,
      default: undefined,
      index: true,
    },
    categories: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 48 }],
      default: undefined,
      validate: {
        validator(v: string[] | undefined) {
          return v == null || v.length <= 3;
        },
        message: "At most 3 categories",
      },
    },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: undefined,
      validate: {
        validator(v: string[] | undefined) {
          return v == null || v.length <= 20;
        },
        message: "At most 20 tags",
      },
    },
    language: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 12,
      default: "en",
    },
    status: {
      type: String,
      enum: ["draft", "published", "suspended"],
      default: "draft",
      index: true,
    },
    suspendedAt: { type: Date, default: null },
    suspendedById: { type: Schema.Types.ObjectId, ref: "users", default: null },
    publishedAt: { type: Date, default: null, index: true },
    lastEditedAt: { type: Date, default: null },
    lastEditedById: {
      type: Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: Schema.Types.ObjectId, ref: "users", default: null },
    respectCount: { type: Number, default: 0, min: 0, index: true },
    repostCount: { type: Number, default: 0, min: 0, index: true },
    bookmarkCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
    squadId: {
      type: Schema.Types.ObjectId,
      ref: "squads",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);
BlogPostSchema.index({ authorId: 1, slug: 1 }, { unique: true });
BlogPostSchema.index({ status: 1, createdAt: -1 });
BlogPostSchema.index({ squadId: 1, status: 1, publishedAt: -1 });
BlogPostSchema.index(
  { title: "text", summary: "text" },
  {
    weights: { title: 10, summary: 3 },
    name: "blog_search_text",
  },
);
export const BlogPostModel: Model<IBlogPost> =
  mongoose.models?.blogposts ??
  mongoose.model<IBlogPost>("blogposts", BlogPostSchema);
