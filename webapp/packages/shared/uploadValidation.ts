/**
 * Image upload rules — server multer, webapp dropzone, mobile pickers.
 * Server Sharp/ClamAV processing stays server-only; MIME/size rules live here.
 */

export const IMAGE_UPLOAD_MAX_BYTES = {
  feedback: 5 * 1024 * 1024,
  avatar: 5 * 1024 * 1024,
  cover: 10 * 1024 * 1024,
  media: 5 * 1024 * 1024,
  orgLogo: 5 * 1024 * 1024,
} as const;

export type ImageUploadProfile = keyof typeof IMAGE_UPLOAD_MAX_BYTES;

export const SQUAD_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const SQUAD_BANNER_MAX_BYTES = 10 * 1024 * 1024;
export const PROFILE_RASTER_IMAGE_MAX_BYTES = IMAGE_UPLOAD_MAX_BYTES.media;
export const BLOG_THUMB_MAX_BYTES = IMAGE_UPLOAD_MAX_BYTES.cover;

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_RASTER_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const ALLOWED_LOGO_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_FEEDBACK_MIMES = ALLOWED_RASTER_MIMES;

export const IMAGE_UPLOAD_REJECT_MESSAGE =
  "Please upload a JPEG, PNG, GIF, WebP, or iPhone photo (HEIC).";

export const LOGO_UPLOAD_REJECT_MESSAGE =
  "Please upload a JPEG, PNG, WebP, or iPhone photo (HEIC) for logos.";

export const RASTER_UPLOAD_REJECT_MESSAGE =
  "Please use a supported image type (JPEG, PNG, GIF, WebP).";

export const FEEDBACK_IMAGE_REJECT_MESSAGE =
  "Use a JPEG, PNG, GIF, or WebP image.";

export const RASTER_ACCEPT_EXTENSIONS: Readonly<
  Record<string, readonly string[]>
> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
};

export const LOGO_ACCEPT_EXTENSIONS: Readonly<
  Record<string, readonly string[]>
> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
};

export function rasterAcceptAttribute(): string {
  return "image/jpeg,image/jpg,image/png,image/gif,image/webp";
}

const HEIC_FTYP_BRANDS = [
  "heic",
  "heix",
  "hevc",
  "hevx",
  "mif1",
  "msf1",
] as const;

function isHeicOrHeifBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const ftyp = String.fromCharCode(
    bytes[4]!,
    bytes[5]!,
    bytes[6]!,
    bytes[7]!,
  );
  if (ftyp !== "ftyp") return false;
  const brand = String.fromCharCode(
    bytes[8]!,
    bytes[9]!,
    bytes[10]!,
    bytes[11]!,
  ).toLowerCase();
  return HEIC_FTYP_BRANDS.some((b) => brand.startsWith(b));
}

export function detectImageMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  const gifSig = String.fromCharCode(
    bytes[0]!,
    bytes[1]!,
    bytes[2]!,
    bytes[3]!,
    bytes[4]!,
    bytes[5]!,
  );
  if (gifSig === "GIF87a" || gifSig === "GIF89a") return "image/gif";
  const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  const webp = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  if (isHeicOrHeifBytes(bytes)) return "image/heic";
  return null;
}

export function imageBytesMatchMime(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 12) return false;
  const m = mime.toLowerCase().trim();
  if (m === "image/jpeg" || m === "image/jpg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (m === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (m === "image/gif") {
    const sig = String.fromCharCode(
      bytes[0]!,
      bytes[1]!,
      bytes[2]!,
      bytes[3]!,
      bytes[4]!,
      bytes[5]!,
    );
    return sig === "GIF87a" || sig === "GIF89a";
  }
  if (m === "image/webp") {
    const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
    const webp = String.fromCharCode(
      bytes[8]!,
      bytes[9]!,
      bytes[10]!,
      bytes[11]!,
    );
    return riff === "RIFF" && webp === "WEBP";
  }
  if (m === "image/heic" || m === "image/heif") {
    return isHeicOrHeifBytes(bytes);
  }
  return false;
}

export function rasterBytesMatchUpload(
  bytes: Uint8Array,
  declaredMime: string,
): boolean {
  const declared = declaredMime.toLowerCase().trim();
  if (imageBytesMatchMime(bytes, declared)) return true;
  const detected = detectImageMimeFromBytes(bytes);
  return detected != null && imageBytesMatchMime(bytes, detected);
}

export function isAllowedImageMime(mime: string): boolean {
  const normalized = mime.toLowerCase().trim();
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(normalized);
}

export function isAllowedRasterMime(mime: string): boolean {
  const normalized = mime.toLowerCase().trim();
  return (ALLOWED_RASTER_MIMES as readonly string[]).includes(normalized);
}

export function isAllowedLogoMime(mime: string): boolean {
  const normalized = mime.toLowerCase().trim();
  return (ALLOWED_LOGO_MIMES as readonly string[]).includes(normalized);
}

export function isAllowedFeedbackMime(mime: string): boolean {
  return isAllowedRasterMime(mime);
}

export function isAllowedImageUploadMime(
  mime: string,
  originalname: string,
): boolean {
  if (isAllowedImageMime(mime)) return true;
  if (mime.toLowerCase().trim() !== "application/octet-stream") return false;
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(originalname);
}

export function isHeicFileName(fileName: string | undefined): boolean {
  const name = fileName?.trim().toLowerCase() ?? "";
  return name.endsWith(".heic") || name.endsWith(".heif");
}

export function isSvgUpload(bytes: Uint8Array, fileName?: string): boolean {
  const name = fileName?.trim().toLowerCase() ?? "";
  if (name.endsWith(".svg")) return true;
  if (bytes.length === 0) return false;
  const sampleLen = bytes.length < 512 ? bytes.length : 512;
  const head = String.fromCharCode(...bytes.subarray(0, sampleLen))
    .trimStart()
    .toLowerCase();
  return head.startsWith("<svg") || head.includes("<svg");
}

export type ImageClientValidationProfile = "raster" | "logo" | "feedback";

function rejectMessageForProfile(profile: ImageClientValidationProfile): string {
  if (profile === "logo") return LOGO_UPLOAD_REJECT_MESSAGE;
  if (profile === "feedback") return FEEDBACK_IMAGE_REJECT_MESSAGE;
  return RASTER_UPLOAD_REJECT_MESSAGE;
}

function isAllowedMimeForProfile(
  mime: string,
  profile: ImageClientValidationProfile,
): boolean {
  if (profile === "logo") return isAllowedLogoMime(mime);
  if (profile === "feedback") return isAllowedFeedbackMime(mime);
  return isAllowedRasterMime(mime);
}

export function validateImageBytesClient(
  bytes: Uint8Array,
  opts: {
    profile: ImageClientValidationProfile;
    fileName?: string;
    declaredMime?: string;
  },
): string | null {
  const reject = rejectMessageForProfile(opts.profile);
  if (isSvgUpload(bytes, opts.fileName)) {
    return `SVG files are not supported. ${reject}`;
  }
  const detected = detectImageMimeFromBytes(bytes);
  if (detected != null) {
    return isAllowedMimeForProfile(detected, opts.profile) ? null : reject;
  }
  if (opts.profile === "logo" || opts.profile === "raster") {
    return isHeicFileName(opts.fileName) ? null : reject;
  }
  const declared = opts.declaredMime?.toLowerCase().trim();
  if (declared && isAllowedMimeForProfile(declared, opts.profile)) {
    return rasterBytesMatchUpload(bytes, declared)
      ? null
      : "File content does not match an image type (possible spoofed extension).";
  }
  return reject;
}

export type ImageFileValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export async function validateImageFileClient(
  file: File,
  opts: {
    profile: ImageClientValidationProfile;
    maxBytes: number;
  },
): Promise<ImageFileValidationResult> {
  const mime = (file.type || "").toLowerCase().trim();
  if (!mime || !isAllowedMimeForProfile(mime, opts.profile)) {
    return { ok: false, message: rejectMessageForProfile(opts.profile) };
  }
  if (file.size <= 0) {
    return { ok: false, message: "File is empty." };
  }
  if (file.size > opts.maxBytes) {
    return {
      ok: false,
      message: `Image must be under ${Math.round(opts.maxBytes / (1024 * 1024))} MB.`,
    };
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!rasterBytesMatchUpload(head, mime)) {
    return {
      ok: false,
      message:
        "File content does not match an image type (possible spoofed extension).",
    };
  }
  return { ok: true };
}
