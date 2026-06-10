/**
 * Global file upload validation (server + webapp alignment).
 *
 * Supported:
 * - Images: JPEG, PNG, GIF (first frame), WebP, HEIC/HEIF (iPhone). Max 120 megapixels.
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
  'image/heic',
  'image/heif',
] as const;

/** Shown when multer rejects an upload before processing. */
export const IMAGE_UPLOAD_REJECT_MESSAGE =
  'Please upload a JPEG, PNG, GIF, WebP, or iPhone photo (HEIC).';

const HEIC_FTYP_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'] as const;

function isHeicOrHeifBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString('ascii') !== 'ftyp') return false;
  const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
  return HEIC_FTYP_BRANDS.some((b) => brand.startsWith(b));
}

export const ALLOWED_DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const;

export function isAllowedImageMime(mime: string): boolean {
  const normalized = mime.toLowerCase().trim();
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(normalized);
}

/** Mobile clients may omit multipart Content-Type (`application/octet-stream`). */
export function isAllowedImageUploadMime(mime: string, originalname: string): boolean {
  if (isAllowedImageMime(mime)) return true;
  if (mime.toLowerCase().trim() !== 'application/octet-stream') return false;
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(originalname);
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
  if (m === 'image/heic' || m === 'image/heif') {
    return isHeicOrHeifBuffer(buffer);
  }
  return false;
}

/** Sniff raster MIME from file header when the client sends the wrong type. */
export function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  const gifSig = buffer.subarray(0, 6).toString('ascii');
  if (gifSig === 'GIF87a' || gifSig === 'GIF89a') return 'image/gif';
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  if (isHeicOrHeifBuffer(buffer)) return 'image/heic';
  return null;
}

/** Magic-byte check; accepts sniffed MIME when declared type is wrong or missing. */
export function rasterBufferMatchesUpload(buffer: Buffer, declaredMime: string): boolean {
  const declared = declaredMime.toLowerCase().trim();
  if (imageBufferMatchesClaimedMime(buffer, declared)) return true;
  const detected = detectImageMimeFromBuffer(buffer);
  return detected != null && imageBufferMatchesClaimedMime(buffer, detected);
}
