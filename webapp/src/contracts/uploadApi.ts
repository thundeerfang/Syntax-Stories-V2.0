/**
 * Upload JSON API — `/api/upload/*` (multipart).
 * Keep in sync with `server/src/routes/upload.routes.ts`.
 */

export interface UploadResponse {
  success: boolean;
  url?: string;
  /** Auto-set by server from uploader username + original file name. */
  title?: string;
  /** Same as `title`; used for HTML `alt`. */
  alt?: string;
  blurDataUrl?: string;
  message?: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
