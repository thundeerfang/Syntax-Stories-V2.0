export type ImageMasterProfile =
  | "feedback"
  | "avatar"
  | "cover"
  | "media"
  | "orgLogo";
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
    maxInputBytes: 5 * 1024 * 1024,
    maxEdgePx: 4096,
    outputFormat: "webp",
    webpQuality: 82,
    jpegQuality: 82,
    maxMegapixels: 16000000,
  },
  avatar: {
    maxInputBytes: 5 * 1024 * 1024,
    maxEdgePx: 4096,
    outputFormat: "jpeg",
    webpQuality: 85,
    jpegQuality: 85,
    maxMegapixels: 25000000,
  },
  cover: {
    maxInputBytes: 10 * 1024 * 1024,
    maxEdgePx: 8192,
    outputFormat: "jpeg",
    webpQuality: 85,
    jpegQuality: 85,
    maxMegapixels: 120000000,
  },
  media: {
    maxInputBytes: 5 * 1024 * 1024,
    maxEdgePx: 8192,
    outputFormat: "jpeg",
    webpQuality: 85,
    jpegQuality: 85,
    maxMegapixels: 120000000,
  },
  orgLogo: {
    maxInputBytes: 5 * 1024 * 1024,
    maxEdgePx: 4096,
    outputFormat: "png",
    webpQuality: 90,
    jpegQuality: 90,
    maxMegapixels: 25000000,
  },
} as const;
