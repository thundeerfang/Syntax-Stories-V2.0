/**
 * Validates `BlogPost.content` (JSON string of Block[]): structure, size limits, allowed block types.
 * Strips legacy `gif` blocks; normalizes payloads to JSON-safe plain objects.
 */
export type BlogContentValidationResult = {
    ok: true;
    normalizedJson: string;
} | {
    ok: false;
    status: number;
    message: string;
};
/**
 * Validates blog post `content` string. Returns normalized JSON (gif blocks removed).
 */
export declare function validateBlogPostContent(raw: string): BlogContentValidationResult;
/**
 * Thumbnail must be https, or http on localhost (dev). Max length aligned with model.
 */
export declare function sanitizeThumbnailUrl(input: string | undefined | null): string | undefined;
//# sourceMappingURL=blogContentValidation.d.ts.map