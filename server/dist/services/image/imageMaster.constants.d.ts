/**
 * Central limits for `imageMasterHandler` profiles (bytes, decode, output).
 * Tighten per surface — feedback attachments stay small for abuse + storage cost.
 */
export type ImageMasterProfile = 'feedback' | 'avatar' | 'general';
export declare const IMAGE_MASTER_PROFILES: Record<ImageMasterProfile, {
    maxInputBytes: number;
    maxEdgePx: number;
    outputFormat: 'webp' | 'jpeg';
    webpQuality: number;
    jpegQuality: number;
    maxMegapixels: number;
}>;
//# sourceMappingURL=imageMaster.constants.d.ts.map