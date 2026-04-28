/**
 * Central limits for `imageMasterHandler` profiles (bytes, decode, output).
 * Tighten per surface — feedback attachments stay small for abuse + storage cost.
 */
export type ImageMasterProfile = 'feedback' | 'avatar' | 'general';

export const IMAGE_MASTER_PROFILES: Record<
  ImageMasterProfile,
  {
    maxInputBytes: number;
    maxEdgePx: number;
    outputFormat: 'webp' | 'jpeg';
    webpQuality: number;
    jpegQuality: number;
    maxMegapixels: number;
  }
> = {
  feedback: {
    maxInputBytes: 5 * 1024 * 1024,
    maxEdgePx: 4096,
    outputFormat: 'webp',
    webpQuality: 82,
    jpegQuality: 82,
    maxMegapixels: 16_000_000,
  },
  avatar: {
    maxInputBytes: 5 * 1024 * 1024,
    maxEdgePx: 4096,
    outputFormat: 'webp',
    webpQuality: 85,
    jpegQuality: 85,
    maxMegapixels: 25_000_000,
  },
  general: {
    maxInputBytes: 12 * 1024 * 1024,
    maxEdgePx: 8192,
    outputFormat: 'webp',
    webpQuality: 85,
    jpegQuality: 85,
    maxMegapixels: 80_000_000,
  },
} as const;
