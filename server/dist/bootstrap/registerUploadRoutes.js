import express from 'express';
import uploadRoutes from '../routes/upload.routes.js';
import { getDefaultUploadStorage } from '../services/storage/localDiskUploadStorage.js';
/** Public URLs for processed images (`/uploads/...`). */
export function registerStaticUploads(app) {
    app.use('/uploads', express.static(getDefaultUploadStorage().dirs.root));
}
/** Authenticated multipart upload endpoints. Mount after `/api` if the main API router has no `/upload` catch-all. */
export function registerUploadApiRoutes(app) {
    app.use('/api/upload', uploadRoutes);
}
//# sourceMappingURL=registerUploadRoutes.js.map