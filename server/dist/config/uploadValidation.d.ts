/**
 * Global file upload validation (server + webapp alignment).
 *
 * Supported:
 * - Images: JPEG, PNG, GIF (first frame), WebP. Max 120 megapixels.
 * - Documents: Adobe PDF (.pdf), Microsoft Word (.doc/.docx).
 *
 * Limits:
 * - File size: 100 MB max.
 * - Documents: 300 pages max, 1 million words max (enforced when processing).
 * - Images: 120 megapixels max resolution.
 * - Note: Document upload from mobile devices may be restricted by client.
 */
export declare const MAX_FILE_SIZE_BYTES: number;
export declare const MAX_IMAGE_PIXELS = 120000000;
/** Reject extremely wide/tall rasters before Sharp work (complements megapixel cap). */
export declare const MAX_IMAGE_EDGE_PX = 8192;
export declare const MAX_DOCUMENT_PAGES = 300;
export declare const MAX_DOCUMENT_WORDS = 1000000;
export declare const ALLOWED_IMAGE_MIMES: readonly ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
export declare const ALLOWED_DOCUMENT_MIMES: readonly ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
export declare function isAllowedImageMime(mime: string): boolean;
export declare function isAllowedDocumentMime(mime: string): boolean;
export declare function checkImageResolution(width: number, height: number): boolean;
/** Megapixel cap + per-edge limit (used after Sharp metadata read). */
export declare function imageDimensionsAllowed(width: number, height: number): boolean;
/**
 * Verify file header matches claimed image MIME (defense-in-depth beyond multer mimetype).
 * GIF allows ASCII "GIF87a" / "GIF89a" at offset 0.
 */
export declare function imageBufferMatchesClaimedMime(buffer: Buffer, mimetype: string): boolean;
//# sourceMappingURL=uploadValidation.d.ts.map