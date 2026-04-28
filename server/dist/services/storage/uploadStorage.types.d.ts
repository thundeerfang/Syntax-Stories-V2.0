/**
 * Local paths for user-uploaded assets. Swap for S3/R2 by implementing a higher-level
 * `StoredObject` URL resolver later; multer still writes temp/disk paths today.
 */
export interface UploadDirectoryLayout {
    readonly root: string;
    readonly avatars: string;
    readonly covers: string;
    readonly media: string;
    readonly logos: string;
    readonly schoolLogos: string;
    readonly orgLogos: string;
    readonly feedback: string;
}
export interface UploadStorage {
    readonly dirs: UploadDirectoryLayout;
    /** Create all upload dirs if missing (idempotent). */
    ensureDirectories(): void;
}
//# sourceMappingURL=uploadStorage.types.d.ts.map