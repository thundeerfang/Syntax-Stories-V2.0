import { Router, Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { verifyToken, type AuthUser } from "../middlewares/auth/index.js";
import { UserModel } from "../models/User.js";
import { buildUploadImageMeta } from "../utils/uploadImageMeta.js";
import { jpegBlurDataUrlFromFile } from "../utils/imageBlurPlaceholder.js";
import { getDefaultUploadStorage } from "../services/storage/localDiskUploadStorage.js";
import {
  applyImageDelivery,
  createImageMasterMulter,
  ImageMasterError,
  parseCropCoords,
  processUploadedImageBuffer,
  runImageMasterUpload,
  sendImageMasterError,
  type ImageDeliverySpec,
  type ImageMasterProfile,
} from "../services/image/index.js";
import {
  activateStorageBlock,
  isEnospcError,
} from "../services/platform/storageGuard.service.js";
async function tryBlurDataUrl(imagePath: string): Promise<string | undefined> {
  try {
    return await jpegBlurDataUrlFromFile(imagePath);
  } catch (e) {
    console.warn("blur placeholder generation failed", e);
    return undefined;
  }
}
const router = Router();
const {
  avatars: AVATARS_DIR,
  covers: COVERS_DIR,
  media: MEDIA_DIR,
  orgLogos: ORG_LOGOS_DIR,
} = getDefaultUploadStorage().dirs;
const LOGO_UPLOAD_REJECT_MESSAGE =
  "Please upload a JPEG, PNG, WebP, or iPhone photo (HEIC) for logos.";
const uploadAvatarMw = createImageMasterMulter("avatar");
const uploadCoverMw = createImageMasterMulter("cover");
const uploadMediaMw = createImageMasterMulter("media");
const uploadOrgLogoMw = createImageMasterMulter("orgLogo", {
  rejectGif: true,
  rejectMessage: LOGO_UPLOAD_REJECT_MESSAGE,
});
function getPublicUrl(req: Request, pathSegment: string): string {
  const host = req.get("host") ?? "localhost";
  const protocol = req.protocol ?? "http";
  const base = `${protocol}://${host}`;
  return pathSegment.startsWith("http")
    ? pathSegment
    : `${base}/${pathSegment.replace(/^\/+/, "")}`;
}
async function resolveUploaderUsername(req: Request): Promise<string> {
  const userId = (
    req as Request & {
      user?: AuthUser;
    }
  ).user?._id;
  if (!userId) return "user";
  const user = await UserModel.findById(userId).select("username").lean();
  return user?.username?.trim() || "user";
}
function uploadImageJson(
  url: string,
  originalName: string,
  username: string,
  blurDataUrl?: string,
): Record<string, unknown> {
  const { title, alt } = buildUploadImageMeta(originalName, username);
  return {
    success: true,
    url,
    title,
    alt,
    ...(blurDataUrl ? { blurDataUrl } : {}),
  };
}
function outputBasename(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
type UploadRouteConfig = {
  profile: ImageMasterProfile;
  field: string;
  prefix: string;
  outDir: string;
  urlSegment: string;
  delivery: ImageDeliverySpec;
};
async function handleImageMasterUpload(
  req: Request,
  res: Response,
  cfg: UploadRouteConfig,
): Promise<void> {
  const file = req.file;
  if (!file?.buffer?.length) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }
  try {
    const processed = await processUploadedImageBuffer(
      file.buffer,
      file.mimetype,
      cfg.profile,
    );
    const crop = parseCropCoords(req.body as Record<string, unknown>);
    const delivered = await applyImageDelivery(
      processed.buffer,
      crop,
      cfg.delivery,
    );
    const outputFilename = `${outputBasename(cfg.prefix)}-processed${delivered.ext}`;
    const outputPath = path.join(cfg.outDir, outputFilename);
    await fs.writeFile(outputPath, delivered.buffer);
    const pathSegment = `${cfg.urlSegment}/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    const username = await resolveUploaderUsername(req);
    res
      .status(201)
      .json(uploadImageJson(url, file.originalname, username, blurDataUrl));
  } catch (err) {
    if (err instanceof ImageMasterError) {
      sendImageMasterError(res, err);
      return;
    }
    if (isEnospcError(err)) {
      void activateStorageBlock("disk_full");
      res.status(503).json({
        success: false,
        code: "STORAGE_FULL",
        reason: "disk_full",
        message:
          "Syntax Stories cannot accept new uploads right now. Please try again later.",
      });
      return;
    }
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to process image" });
  }
}
router.post(
  "/avatar",
  verifyToken,
  runImageMasterUpload(uploadAvatarMw, "avatar", "avatar"),
  (req, res) =>
    void handleImageMasterUpload(req, res, {
      profile: "avatar",
      field: "avatar",
      prefix: "avatar",
      outDir: AVATARS_DIR,
      urlSegment: "uploads/avatars",
      delivery: {
        width: 256,
        height: 256,
        fit: "cover",
        format: "jpeg",
        jpegQuality: 80,
      },
    }),
);
router.post(
  "/cover",
  verifyToken,
  runImageMasterUpload(uploadCoverMw, "cover", "cover"),
  (req, res) =>
    void handleImageMasterUpload(req, res, {
      profile: "cover",
      field: "cover",
      prefix: "cover",
      outDir: COVERS_DIR,
      urlSegment: "uploads/covers",
      delivery: {
        width: 1600,
        height: 1600,
        fit: "inside",
        format: "jpeg",
        jpegQuality: 82,
      },
    }),
);
router.post(
  "/media",
  verifyToken,
  runImageMasterUpload(uploadMediaMw, "media", "media"),
  (req, res) =>
    void handleImageMasterUpload(req, res, {
      profile: "media",
      field: "media",
      prefix: "media",
      outDir: MEDIA_DIR,
      urlSegment: "uploads/media",
      delivery: {
        width: 400,
        height: 400,
        fit: "cover",
        format: "jpeg",
        jpegQuality: 80,
      },
    }),
);
router.post(
  "/org-logo",
  verifyToken,
  runImageMasterUpload(uploadOrgLogoMw, "logo", "orgLogo"),
  (req, res) =>
    void handleImageMasterUpload(req, res, {
      profile: "orgLogo",
      field: "logo",
      prefix: "org-logo",
      outDir: ORG_LOGOS_DIR,
      urlSegment: "uploads/org-logos",
      delivery: {
        width: 128,
        height: 128,
        fit: "contain",
        format: "png",
        pngQuality: 90,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }),
);
export default router;
