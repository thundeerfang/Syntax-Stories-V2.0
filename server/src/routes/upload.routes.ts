import { Router, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import sharp from 'sharp';
import { verifyToken } from '../middlewares/auth/index.js';
import { MAX_FILE_SIZE_BYTES, imageBufferMatchesClaimedMime, imageDimensionsAllowed } from '../config/uploadValidation.js';
import { jpegBlurDataUrlFromFile } from '../utils/imageBlurPlaceholder.js';
import { getDefaultUploadStorage } from '../services/storage/localDiskUploadStorage.js';

async function tryBlurDataUrl(imagePath: string): Promise<string | undefined> {
  try {
    return await jpegBlurDataUrlFromFile(imagePath);
  } catch (e) {
    console.warn('blur placeholder generation failed', e);
    return undefined;
  }
}

const router = Router();

const { avatars: AVATARS_DIR, covers: COVERS_DIR, media: MEDIA_DIR, logos: LOGOS_DIR, schoolLogos: SCHOOL_LOGOS_DIR, orgLogos: ORG_LOGOS_DIR } =
  getDefaultUploadStorage().dirs;

const storageAvatar = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = /^[a-zA-Z0-9.-]+$/.test(ext) ? ext : '.jpg';
    cb(null, `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safe}`);
  },
});

const storageCover = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COVERS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = /^[a-zA-Z0-9.-]+$/.test(ext) ? ext : '.jpg';
    cb(null, `cover-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safe}`);
  },
});

const storageMedia = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = /^[a-zA-Z0-9.-]+$/.test(ext) ? ext : '.jpg';
    cb(null, `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safe}`);
  },
});

const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
  if (allowed) cb(null, true);
  else cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed'));
};

const uploadAvatar = multer({
  storage: storageAvatar,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});

const uploadCover = multer({
  storage: storageCover,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: imageFilter,
});

const uploadMedia = multer({
  storage: storageMedia,
  limits: { fileSize: Math.min(5 * 1024 * 1024, MAX_FILE_SIZE_BYTES) },
  fileFilter: imageFilter,
});

const storageLogo = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const safe = /^[a-zA-Z0-9.-]+$/.test(ext) ? ext : '.png';
    cb(null, `logo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safe}`);
  },
});

const logoFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /^image\/(jpeg|jpg|png|webp|svg\+xml)$/i.test(file.mimetype);
  if (allowed) cb(null, true);
  else cb(new Error('Only images (JPEG, PNG, WebP, SVG) are allowed for logos'));
};

const uploadLogo = multer({
  storage: storageLogo,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: logoFilter,
});

const storageSchoolLogo = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SCHOOL_LOGOS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const safe = /^[a-zA-Z0-9.-]+$/.test(ext) ? ext : '.png';
    cb(null, `school-logo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safe}`);
  },
});

const uploadSchoolLogo = multer({
  storage: storageSchoolLogo,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: logoFilter,
});

const storageOrgLogo = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ORG_LOGOS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const safe = /^[a-zA-Z0-9.-]+$/.test(ext) ? ext : '.png';
    cb(null, `org-logo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${safe}`);
  },
});

const uploadOrgLogo = multer({
  storage: storageOrgLogo,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: logoFilter,
});

/** Reject polyglot uploads where `mimetype` does not match file header (non-SVG raster images). */
function assertRasterMagicBytesOrCleanup(filePath: string, mimetype: string): boolean {
  const m = mimetype.toLowerCase();
  if (m.includes('svg')) return true;
  let fd: number;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch {
    return false;
  }
  try {
    const buf = Buffer.alloc(32);
    fs.readSync(fd, buf, 0, 32, 0);
    return imageBufferMatchesClaimedMime(buf, mimetype);
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      /* ignore */
    }
  }
}

function getPublicUrl(req: Request, pathSegment: string): string {
  const host = req.get('host') ?? 'localhost';
  const protocol = req.protocol ?? 'http';
  const base = `${protocol}://${host}`;
  return pathSegment.startsWith('http') ? pathSegment : `${base}/${pathSegment.replace(/^\/+/, '')}`;
}

/** Multer fields may be strings or numbers; never stringify arbitrary objects. */
function formCropCoord(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function applyOptionalRasterCrop(
  image: sharp.Sharp,
  body: Record<string, string | undefined>,
  meta: sharp.Metadata
): sharp.Sharp {
  const { cropX, cropY, cropWidth, cropHeight } = body;
  if (!cropX || !cropY || !cropWidth || !cropHeight || !meta.width || !meta.height) {
    return image;
  }
  const left = Math.max(0, Math.round(Number.parseFloat(cropX)));
  const top = Math.max(0, Math.round(Number.parseFloat(cropY)));
  const width = Math.min(meta.width - left, Math.round(Number.parseFloat(cropWidth)));
  const height = Math.min(meta.height - top, Math.round(Number.parseFloat(cropHeight)));
  if (width > 0 && height > 0) {
    return image.extract({ left, top, width, height });
  }
  return image;
}

const LOGO_SIZE = 128;

/** Crop (optional via multipart fields), then resize to logo square. Deletes input file on success. */
async function finalizeRasterLogo(
  req: Request,
  inputPath: string,
  outDir: string,
  file: Express.Multer.File
): Promise<{ outputPath: string; outputFilename: string }> {
  let image = sharp(inputPath);
  const meta = await image.metadata();
  if (meta.width != null && meta.height != null && !imageDimensionsAllowed(meta.width, meta.height)) {
    try {
      fs.unlinkSync(inputPath);
    } catch {
      /* ignore */
    }
    throw new Error('RESOLUTION');
  }
  const rawBody = req.body as Record<string, unknown>;
  const cropBody: Record<string, string | undefined> = {
    cropX: formCropCoord(rawBody.cropX),
    cropY: formCropCoord(rawBody.cropY),
    cropWidth: formCropCoord(rawBody.cropWidth),
    cropHeight: formCropCoord(rawBody.cropHeight),
  };
  image = applyOptionalRasterCrop(image, cropBody, meta);
  const outputFilename = file.filename.replace(/\.[^.]+$/, '') + '-processed.png';
  const outputPath = path.join(outDir, outputFilename);
  await image
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 90 })
    .toFile(outputPath);
  try {
    fs.unlinkSync(inputPath);
  } catch {
    /* ignore */
  }
  return { outputPath, outputFilename };
}

router.post('/avatar', verifyToken, uploadAvatar.single('avatar'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  if (!assertRasterMagicBytesOrCleanup(req.file.path, req.file.mimetype)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      /* ignore */
    }
    res.status(400).json({ success: false, message: 'File content does not match declared image type.' });
    return;
  }
  try {
    let image = sharp(req.file.path);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !imageDimensionsAllowed(meta.width, meta.height)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.jpg';
    const outputPath = path.join(AVATARS_DIR, outputFilename);

    image = applyOptionalRasterCrop(image, req.body as Record<string, string | undefined>, meta);

    await image
      .resize(256, 256, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    // best-effort cleanup of original
    try { fs.unlinkSync(inputPath); } catch {}

    const pathSegment = `uploads/avatars/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process image' });
  }
});

router.post('/cover', verifyToken, uploadCover.single('cover'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  if (!assertRasterMagicBytesOrCleanup(req.file.path, req.file.mimetype)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      /* ignore */
    }
    res.status(400).json({ success: false, message: 'File content does not match declared image type.' });
    return;
  }
  try {
    let image = sharp(req.file.path);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !imageDimensionsAllowed(meta.width, meta.height)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.jpg';
    const outputPath = path.join(COVERS_DIR, outputFilename);

    image = applyOptionalRasterCrop(image, req.body as Record<string, string | undefined>, meta);

    await image
      .resize(1600, 400, { fit: 'cover' })
      .jpeg({ quality: 82 })
      .toFile(outputPath);

    try { fs.unlinkSync(inputPath); } catch {}

    const pathSegment = `uploads/covers/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process image' });
  }
});

const MEDIA_THUMB_SIZE = 400;

router.post('/media', verifyToken, uploadMedia.single('media'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  if (!assertRasterMagicBytesOrCleanup(req.file.path, req.file.mimetype)) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      /* ignore */
    }
    res.status(400).json({ success: false, message: 'File content does not match declared image type.' });
    return;
  }
  try {
    let image = sharp(req.file.path);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !imageDimensionsAllowed(meta.width, meta.height)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    const rawBody = req.body as Record<string, unknown>;
    const cropBody: Record<string, string | undefined> = {
      cropX: formCropCoord(rawBody.cropX),
      cropY: formCropCoord(rawBody.cropY),
      cropWidth: formCropCoord(rawBody.cropWidth),
      cropHeight: formCropCoord(rawBody.cropHeight),
    };
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-thumb.jpg';
    const outputPath = path.join(MEDIA_DIR, outputFilename);

    image = applyOptionalRasterCrop(image, cropBody, meta);

    await image
      .resize(MEDIA_THUMB_SIZE, MEDIA_THUMB_SIZE, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    try { fs.unlinkSync(inputPath); } catch {}

    const pathSegment = `uploads/media/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process image' });
  }
});

router.post('/company-logo', verifyToken, uploadLogo.single('logo'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  try {
    const inputPath = req.file.path;
    const isSvg = /svg/i.test(req.file.mimetype);

    if (isSvg) {
      const pathSegment = `uploads/logos/${req.file.filename}`;
      const url = getPublicUrl(req, pathSegment);
      res.status(201).json({ success: true, url });
      return;
    }

    const { outputPath, outputFilename } = await finalizeRasterLogo(req, inputPath, LOGOS_DIR, req.file);
    const pathSegment = `uploads/logos/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message === 'RESOLUTION') {
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to process logo' });
  }
});

router.post('/school-logo', verifyToken, uploadSchoolLogo.single('logo'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  try {
    const inputPath = req.file.path;
    const isSvg = /svg/i.test(req.file.mimetype);

    if (isSvg) {
      const pathSegment = `uploads/school-logos/${req.file.filename}`;
      const url = getPublicUrl(req, pathSegment);
      res.status(201).json({ success: true, url });
      return;
    }

    const { outputPath, outputFilename } = await finalizeRasterLogo(req, inputPath, SCHOOL_LOGOS_DIR, req.file);
    const pathSegment = `uploads/school-logos/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message === 'RESOLUTION') {
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to process school logo' });
  }
});

router.post('/org-logo', verifyToken, uploadOrgLogo.single('logo'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  try {
    const inputPath = req.file.path;
    const isSvg = /svg/i.test(req.file.mimetype);

    if (isSvg) {
      const pathSegment = `uploads/org-logos/${req.file.filename}`;
      const url = getPublicUrl(req, pathSegment);
      res.status(201).json({ success: true, url });
      return;
    }

    const { outputPath, outputFilename } = await finalizeRasterLogo(req, inputPath, ORG_LOGOS_DIR, req.file);
    const pathSegment = `uploads/org-logos/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message === 'RESOLUTION') {
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to process organization logo' });
  }
});

export default router;
