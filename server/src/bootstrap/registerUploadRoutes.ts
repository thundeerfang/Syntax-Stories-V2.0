import express, { type Express } from 'express';
import uploadRoutes from '../routes/upload.routes.js';
import { getDefaultUploadStorage } from '../services/storage/localDiskUploadStorage.js';

/** Public URLs for processed images (`/uploads/...`). */
export function registerStaticUploads(app: Express): void {
  app.use('/uploads', express.static(getDefaultUploadStorage().dirs.root));
}

/** Authenticated multipart upload endpoints. Mount after `/api` if the main API router has no `/upload` catch-all. */
export function registerUploadApiRoutes(app: Express): void {
  app.use('/api/upload', uploadRoutes);
}
