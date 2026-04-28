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

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_IMAGE_PIXELS = 120_000_000; // 120 megapixels
/** Reject extremely wide/tall rasters before Sharp work (complements megapixel cap). */
export const MAX_IMAGE_EDGE_PX = 8192;
export const MAX_DOCUMENT_PAGES = 300;
export const MAX_DOCUMENT_WORDS = 1_000_000;

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const;

export function isAllowedImageMime(mime: string): boolean {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime);
}

export function isAllowedDocumentMime(mime: string): boolean {
  return (ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(mime);
}

export function checkImageResolution(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  return width * height <= MAX_IMAGE_PIXELS;
}

/** Megapixel cap + per-edge limit (used after Sharp metadata read). */
export function imageDimensionsAllowed(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width > MAX_IMAGE_EDGE_PX || height > MAX_IMAGE_EDGE_PX) return false;
  return checkImageResolution(width, height);
}

/**
 * Verify file header matches claimed image MIME (defense-in-depth beyond multer mimetype).
 * GIF allows ASCII "GIF87a" / "GIF89a" at offset 0.
 */
export function imageBufferMatchesClaimedMime(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length < 12) return false;
  const m = mimetype.toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (m === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (m === 'image/gif') {
    const sig = buffer.subarray(0, 6).toString('ascii');
    return sig === 'GIF87a' || sig === 'GIF89a';
  }
  if (m === 'image/webp') {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    return riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}
