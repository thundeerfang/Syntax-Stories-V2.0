import sharp from 'sharp';
import { env } from '../../config/env.js';
import { imageBufferMatchesClaimedMime, isAllowedImageMime, } from '../../config/uploadValidation.js';
import { scanBufferWithClamAV } from '../security/clamScanBuffer.js';
import { IMAGE_MASTER_PROFILES } from './imageMaster.constants.js';
export class ImageMasterError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'ImageMasterError';
    }
}
/**
 * Single pipeline: optional ClamAV → Sharp decode (fail closed) → strip metadata →
 * resize within profile edge cap → compress WebP/JPEG. Use for any user-supplied raster.
 */
export async function processUploadedImageBuffer(input, claimedMime, profile) {
    const cfg = IMAGE_MASTER_PROFILES[profile];
    const mime = (claimedMime || '').toLowerCase().trim();
    if (!input?.length) {
        throw new ImageMasterError('Empty file.', 'invalid_image');
    }
    if (input.length > cfg.maxInputBytes) {
        throw new ImageMasterError(`Image too large (max ${Math.round(cfg.maxInputBytes / (1024 * 1024))} MB).`, 'too_large');
    }
    if (!isAllowedImageMime(mime)) {
        throw new ImageMasterError('Unsupported image type.', 'invalid_image');
    }
    if (!imageBufferMatchesClaimedMime(input, mime)) {
        throw new ImageMasterError('File content does not match declared image type.', 'invalid_image');
    }
    if (env.CLAMAV_REQUIRED && !env.CLAMAV_HOST?.trim()) {
        throw new ImageMasterError('Virus scanning is required but CLAMAV_HOST is not set.', 'clamav_config');
    }
    let scan;
    try {
        scan = await scanBufferWithClamAV(input);
    }
    catch (e) {
        const msg = e?.message ?? 'scanner_error';
        throw new ImageMasterError(env.CLAMAV_HOST?.trim()
            ? `Virus scanner unavailable (${msg}).`
            : `Scanner error (${msg}).`, 'internal');
    }
    if (!scan.ok) {
        throw new ImageMasterError(scan.detail || 'Rejected by virus scanner.', 'virus');
    }
    let pipeline = sharp(input, {
        failOn: 'error',
        limitInputPixels: cfg.maxMegapixels,
        animated: false,
    }).rotate();
    let meta;
    try {
        meta = await pipeline.metadata();
    }
    catch {
        throw new ImageMasterError('Could not read image data.', 'invalid_image');
    }
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) {
        throw new ImageMasterError('Invalid image dimensions.', 'invalid_image');
    }
    if (w > cfg.maxEdgePx || h > cfg.maxEdgePx) {
        pipeline = pipeline.resize({
            width: Math.min(w, cfg.maxEdgePx),
            height: Math.min(h, cfg.maxEdgePx),
            fit: 'inside',
            withoutEnlargement: true,
        });
    }
    let out;
    let outMime;
    try {
        if (cfg.outputFormat === 'webp') {
            out = await pipeline.webp({ quality: cfg.webpQuality, effort: 5, smartSubsample: true }).toBuffer();
            outMime = 'image/webp';
        }
        else {
            out = await pipeline.jpeg({ quality: cfg.jpegQuality, mozjpeg: true }).toBuffer();
            outMime = 'image/jpeg';
        }
    }
    catch {
        throw new ImageMasterError('Image processing failed.', 'internal');
    }
    const finalMeta = await sharp(out).metadata();
    const fw = finalMeta.width ?? w;
    const fh = finalMeta.height ?? h;
    return {
        buffer: out,
        mime: outMime,
        width: fw,
        height: fh,
        bytesIn: input.length,
        bytesOut: out.length,
        clamDetail: scan.detail,
    };
}
//# sourceMappingURL=imageMasterHandler.js.map