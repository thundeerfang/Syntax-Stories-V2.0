import { type ImageMasterProfile } from './imageMaster.constants.js';
export declare class ImageMasterError extends Error {
    readonly code: 'too_large' | 'invalid_image' | 'virus' | 'clamav_config' | 'internal';
    constructor(message: string, code: 'too_large' | 'invalid_image' | 'virus' | 'clamav_config' | 'internal');
}
export type ProcessedImageResult = {
    buffer: Buffer;
    mime: 'image/webp' | 'image/jpeg';
    width: number;
    height: number;
    bytesIn: number;
    bytesOut: number;
    clamDetail?: string;
};
/**
 * Single pipeline: optional ClamAV → Sharp decode (fail closed) → strip metadata →
 * resize within profile edge cap → compress WebP/JPEG. Use for any user-supplied raster.
 */
export declare function processUploadedImageBuffer(input: Buffer, claimedMime: string, profile: ImageMasterProfile): Promise<ProcessedImageResult>;
//# sourceMappingURL=imageMasterHandler.d.ts.map