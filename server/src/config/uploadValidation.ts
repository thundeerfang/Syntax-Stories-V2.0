export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 120000000;
export const MAX_IMAGE_EDGE_PX = 8192;
export const MAX_DOCUMENT_PAGES = 300;
export const MAX_DOCUMENT_WORDS = 1000000;
export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
export const IMAGE_UPLOAD_REJECT_MESSAGE =
  "Please upload a JPEG, PNG, GIF, WebP, or iPhone photo (HEIC).";
const HEIC_FTYP_BRANDS = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "mif1",
  "msf1",
] as const;
function isHeicOrHeifBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
  return HEIC_FTYP_BRANDS.some((b) => brand.startsWith(b));
}
export const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export function isAllowedImageMime(mime: string): boolean {
  const normalized = mime.toLowerCase().trim();
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(normalized);
}
export function isAllowedImageUploadMime(
  mime: string,
  originalname: string,
): boolean {
  if (isAllowedImageMime(mime)) return true;
  if (mime.toLowerCase().trim() !== "application/octet-stream") return false;
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(originalname);
}
export function isAllowedDocumentMime(mime: string): boolean {
  return (ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(mime);
}
export function checkImageResolution(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  return width * height <= MAX_IMAGE_PIXELS;
}
export function imageDimensionsAllowed(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width > MAX_IMAGE_EDGE_PX || height > MAX_IMAGE_EDGE_PX) return false;
  return checkImageResolution(width, height);
}
export function imageBufferMatchesClaimedMime(
  buffer: Buffer,
  mimetype: string,
): boolean {
  if (!buffer || buffer.length < 12) return false;
  const m = mimetype.toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (m === "image/png") {
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
  if (m === "image/gif") {
    const sig = buffer.subarray(0, 6).toString("ascii");
    return sig === "GIF87a" || sig === "GIF89a";
  }
  if (m === "image/webp") {
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
  }
  if (m === "image/heic" || m === "image/heif") {
    return isHeicOrHeifBuffer(buffer);
  }
  return false;
}
export function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return "image/jpeg";
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
    return "image/png";
  }
  const gifSig = buffer.subarray(0, 6).toString("ascii");
  if (gifSig === "GIF87a" || gifSig === "GIF89a") return "image/gif";
  const riff = buffer.subarray(0, 4).toString("ascii");
  const webp = buffer.subarray(8, 12).toString("ascii");
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  if (isHeicOrHeifBuffer(buffer)) return "image/heic";
  return null;
}
export function rasterBufferMatchesUpload(
  buffer: Buffer,
  declaredMime: string,
): boolean {
  const declared = declaredMime.toLowerCase().trim();
  if (imageBufferMatchesClaimedMime(buffer, declared)) return true;
  const detected = detectImageMimeFromBuffer(buffer);
  return detected != null && imageBufferMatchesClaimedMime(buffer, detected);
}
