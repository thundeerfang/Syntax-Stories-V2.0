export const IMAGE_MASTER_PROFILES = {
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
};
//# sourceMappingURL=imageMaster.constants.js.map