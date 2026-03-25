import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import sharp from 'sharp';
import { verifyToken } from '../middlewares/auth';
import { MAX_FILE_SIZE_BYTES, checkImageResolution } from '../config/uploadValidation';
import { jpegBlurDataUrlFromFile } from '../utils/imageBlurPlaceholder';

async function tryBlurDataUrl(imagePath: string): Promise<string | undefined> {
  try {
    return await jpegBlurDataUrlFromFile(imagePath);
  } catch (e) {
    console.warn('blur placeholder generation failed', e);
    return undefined;
  }
}

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
const MEDIA_DIR = path.join(UPLOADS_DIR, 'media');
const LOGOS_DIR = path.join(UPLOADS_DIR, 'logos');
const SCHOOL_LOGOS_DIR = path.join(UPLOADS_DIR, 'school-logos');
const ORG_LOGOS_DIR = path.join(UPLOADS_DIR, 'org-logos');

[UPLOADS_DIR, AVATARS_DIR, COVERS_DIR, MEDIA_DIR, LOGOS_DIR, SCHOOL_LOGOS_DIR, ORG_LOGOS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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

function getPublicUrl(req: Request, pathSegment: string): string {
  const host = req.get('host') ?? 'localhost';
  const protocol = req.protocol ?? 'http';
  const base = `${protocol}://${host}`;
  return pathSegment.startsWith('http') ? pathSegment : `${base}/${pathSegment.replace(/^\/+/, '')}`;
}

router.post('/avatar', verifyToken, uploadAvatar.single('avatar'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }
  try {
    let image = sharp(req.file.path);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !checkImageResolution(meta.width, meta.height)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    const { cropX, cropY, cropWidth, cropHeight } = req.body as Record<string, string | undefined>;
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.jpg';
    const outputPath = path.join(AVATARS_DIR, outputFilename);

    if (cropX && cropY && cropWidth && cropHeight && meta.width && meta.height) {
      const left = Math.max(0, Math.round(parseFloat(cropX)));
      const top = Math.max(0, Math.round(parseFloat(cropY)));
      const width = Math.min(meta.width - left, Math.round(parseFloat(cropWidth)));
      const height = Math.min(meta.height - top, Math.round(parseFloat(cropHeight)));
      if (width > 0 && height > 0) {
        image = image.extract({ left, top, width, height });
      }
    }

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
  try {
    let image = sharp(req.file.path);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !checkImageResolution(meta.width, meta.height)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    const { cropX, cropY, cropWidth, cropHeight } = req.body as Record<string, string | undefined>;
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.jpg';
    const outputPath = path.join(COVERS_DIR, outputFilename);

    if (cropX && cropY && cropWidth && cropHeight && meta.width && meta.height) {
      const left = Math.max(0, Math.round(parseFloat(cropX)));
      const top = Math.max(0, Math.round(parseFloat(cropY)));
      const width = Math.min(meta.width - left, Math.round(parseFloat(cropWidth)));
      const height = Math.min(meta.height - top, Math.round(parseFloat(cropHeight)));
      if (width > 0 && height > 0) {
        image = image.extract({ left, top, width, height });
      }
    }

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
  try {
    let image = sharp(req.file.path);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !checkImageResolution(meta.width, meta.height)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }
    const { cropX, cropY, cropWidth, cropHeight } = req.body as Record<string, string | undefined>;
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-thumb.jpg';
    const outputPath = path.join(MEDIA_DIR, outputFilename);

    if (cropX != null && cropY != null && cropWidth != null && cropHeight != null && meta.width && meta.height) {
      const left = Math.max(0, Math.round(parseFloat(String(cropX))));
      const top = Math.max(0, Math.round(parseFloat(String(cropY))));
      const width = Math.min(meta.width - left, Math.round(parseFloat(String(cropWidth))));
      const height = Math.min(meta.height - top, Math.round(parseFloat(String(cropHeight))));
      if (width > 0 && height > 0) {
        image = image.extract({ left, top, width, height });
      }
    }

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

const LOGO_SIZE = 128;

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

    const image = sharp(inputPath);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !checkImageResolution(meta.width, meta.height)) {
      try { fs.unlinkSync(inputPath); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }

    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.png';
    const outputPath = path.join(LOGOS_DIR, outputFilename);

    await image
      .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(outputPath);

    try { fs.unlinkSync(inputPath); } catch {}

    const pathSegment = `uploads/logos/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
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

    const image = sharp(inputPath);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !checkImageResolution(meta.width, meta.height)) {
      try { fs.unlinkSync(inputPath); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }

    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.png';
    const outputPath = path.join(SCHOOL_LOGOS_DIR, outputFilename);

    await image
      .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(outputPath);

    try { fs.unlinkSync(inputPath); } catch {}

    const pathSegment = `uploads/school-logos/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
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

    const image = sharp(inputPath);
    const meta = await image.metadata();
    if (meta.width != null && meta.height != null && !checkImageResolution(meta.width, meta.height)) {
      try { fs.unlinkSync(inputPath); } catch {}
      res.status(400).json({ success: false, message: 'Image resolution exceeds 120 megapixels limit.' });
      return;
    }

    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.png';
    const outputPath = path.join(ORG_LOGOS_DIR, outputFilename);

    await image
      .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(outputPath);

    try { fs.unlinkSync(inputPath); } catch {}

    const pathSegment = `uploads/org-logos/${outputFilename}`;
    const url = getPublicUrl(req, pathSegment);
    const blurDataUrl = await tryBlurDataUrl(outputPath);
    res.status(201).json({ success: true, url, ...(blurDataUrl ? { blurDataUrl } : {}) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process organization logo' });
  }
});

export default router;
