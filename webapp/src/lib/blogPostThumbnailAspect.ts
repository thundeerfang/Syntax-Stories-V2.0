/**
 * Thumbnail crop aspect for the write UI (`ImageUploadCropDialog`) and inline previews (16∶10).
 * `BlogCard` shows the uploaded image in a fixed-height cover strip with `object-cover`, so framing is approximate across breakpoints.
 */
export const BLOG_POST_THUMBNAIL_ASPECT = 16 / 10;

/** Tailwind class for the same ratio (keep numeric ratio in sync with {@link BLOG_POST_THUMBNAIL_ASPECT}). */
export const BLOG_POST_THUMBNAIL_ASPECT_CLASS = 'aspect-[16/10]';
