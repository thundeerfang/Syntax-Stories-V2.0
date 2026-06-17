import {
  IMAGE_UPLOAD_MAX_BYTES,
  type ImageUploadProfile,
} from "@syntax-stories/shared";

export type ImageMasterProfile = ImageUploadProfile;

export const IMAGE_MASTER_PROFILES: Record<
  ImageMasterProfile,
  {
    maxInputBytes: number;
    maxEdgePx: number;
    outputFormat: "webp" | "jpeg" | "png";
    webpQuality: number;
    jpegQuality: number;
    maxMegapixels: number;
  }
> = {
  feedback: {
    maxInputBytes: IMAGE_UPLOAD_MAX_BYTES.feedback,
    maxEdgePx: 4096,
    outputFormat: "webp",
    webpQuality: 82,
    jpegQuality: 82,
    maxMegapixels: 16000000,
  },
  avatar: {
    maxInputBytes: IMAGE_UPLOAD_MAX_BYTES.avatar,
    maxEdgePx: 4096,
    outputFormat: "jpeg",
    webpQuality: 85,
    jpegQuality: 85,
    maxMegapixels: 25000000,
  },
  cover: {
    maxInputBytes: IMAGE_UPLOAD_MAX_BYTES.cover,
    maxEdgePx: 8192,
    outputFormat: "jpeg",
    webpQuality: 85,
    jpegQuality: 85,
    maxMegapixels: 120000000,
  },
  media: {
    maxInputBytes: IMAGE_UPLOAD_MAX_BYTES.media,
    maxEdgePx: 8192,
    outputFormat: "jpeg",
    webpQuality: 85,
    jpegQuality: 85,
    maxMegapixels: 120000000,
  },
  orgLogo: {
    maxInputBytes: IMAGE_UPLOAD_MAX_BYTES.orgLogo,
    maxEdgePx: 4096,
    outputFormat: "png",
    webpQuality: 90,
    jpegQuality: 90,
    maxMegapixels: 25000000,
  },
} as const;
