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
