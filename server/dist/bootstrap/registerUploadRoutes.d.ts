import { type Express } from 'express';
/** Public URLs for processed images (`/uploads/...`). */
export declare function registerStaticUploads(app: Express): void;
/** Authenticated multipart upload endpoints. Mount after `/api` if the main API router has no `/upload` catch-all. */
export declare function registerUploadApiRoutes(app: Express): void;
//# sourceMappingURL=registerUploadRoutes.d.ts.map