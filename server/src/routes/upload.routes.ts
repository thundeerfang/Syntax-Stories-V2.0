import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import sharp from 'sharp';
import { verifyToken } from '../middlewares/auth';

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');

[UPLOADS_DIR, AVATARS_DIR, COVERS_DIR].forEach((dir) => {
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
    const { cropX, cropY, cropWidth, cropHeight } = req.body as Record<string, string | undefined>;
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.jpg';
    const outputPath = path.join(AVATARS_DIR, outputFilename);

    let image = sharp(inputPath);
    const meta = await image.metadata();

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
    res.status(201).json({ success: true, url });
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
    const { cropX, cropY, cropWidth, cropHeight } = req.body as Record<string, string | undefined>;
    const inputPath = req.file.path;
    const outputFilename = req.file.filename.replace(/\.[^.]+$/, '') + '-processed.jpg';
    const outputPath = path.join(COVERS_DIR, outputFilename);

    let image = sharp(inputPath);
    const meta = await image.metadata();

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
    res.status(201).json({ success: true, url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process image' });
  }
});

export default router;
