import {
  detectImageMimeFromBytes as detectFromShared,
  imageBytesMatchMime as bytesMatchShared,
  isAllowedImageMime as isAllowedImageMimeShared,
  isAllowedImageUploadMime as isAllowedImageUploadMimeShared,
  rasterBytesMatchUpload as rasterMatchShared,
} from "@syntax-stories/shared";

export {
  ALLOWED_IMAGE_MIMES,
  IMAGE_UPLOAD_REJECT_MESSAGE,
} from "@syntax-stories/shared";

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 120000000;
export const MAX_IMAGE_EDGE_PX = 8192;
export const MAX_DOCUMENT_PAGES = 300;
export const MAX_DOCUMENT_WORDS = 1000000;

export const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function isAllowedImageMime(mime: string): boolean {
  return isAllowedImageMimeShared(mime);
}

export function isAllowedImageUploadMime(
  mime: string,
  originalname: string,
): boolean {
  return isAllowedImageUploadMimeShared(mime, originalname);
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

function toUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export function imageBufferMatchesClaimedMime(
  buffer: Buffer,
  mimetype: string,
): boolean {
  return bytesMatchShared(toUint8Array(buffer), mimetype);
}

export function detectImageMimeFromBuffer(buffer: Buffer): string | null {
  return detectFromShared(toUint8Array(buffer));
}

export function rasterBufferMatchesUpload(
  buffer: Buffer,
  declaredMime: string,
): boolean {
  return rasterMatchShared(toUint8Array(buffer), declaredMime);
}
