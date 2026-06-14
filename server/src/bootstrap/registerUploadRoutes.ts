import express, { type Express } from "express";
import uploadRoutes from "../routes/upload.routes.js";
import { getDefaultUploadStorage } from "../services/storage/localDiskUploadStorage.js";
export function registerStaticUploads(app: Express): void {
  app.use("/uploads", express.static(getDefaultUploadStorage().dirs.root));
}
export function registerUploadApiRoutes(app: Express): void {
  app.use("/api/upload", uploadRoutes);
}
