import type { Response } from 'express';
import sharp from 'sharp';
import { ImageMasterError } from './imageMasterHandler.js';

export function imageMasterErrorStatus(code: ImageMasterError['code']): number {
  if (code === 'virus') return 422;
  if (code === 'clamav_config') return 503;
  return 400;
}

export function sendImageMasterError(res: Response, err: ImageMasterError): void {
  res.status(imageMasterErrorStatus(err.code)).json({ success: false, message: err.message });
}

export type ImageCropCoords = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Multer fields may be strings or numbers; never stringify arbitrary objects. */
export function parseCropCoords(body: Record<string, unknown>): ImageCropCoords | null {
  const cropX = formCropCoord(body.cropX);
  const cropY = formCropCoord(body.cropY);
  const cropWidth = formCropCoord(body.cropWidth);
  const cropHeight = formCropCoord(body.cropHeight);
  if (!cropX || !cropY || !cropWidth || !cropHeight) return null;
  const left = Math.max(0, Math.round(Number.parseFloat(cropX)));
  const top = Math.max(0, Math.round(Number.parseFloat(cropY)));
  const width = Math.round(Number.parseFloat(cropWidth));
  const height = Math.round(Number.parseFloat(cropHeight));
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

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

export type ImageDeliverySpec = {
  width: number;
  height: number;
  fit: 'cover' | 'inside' | 'contain';
  format: 'jpeg' | 'png';
  jpegQuality?: number;
  pngQuality?: number;
  background?: { r: number; g: number; b: number; alpha: number };
};

export async function applyImageDelivery(
  buffer: Buffer,
  crop: ImageCropCoords | null,
  spec: ImageDeliverySpec
): Promise<{ buffer: Buffer; width: number; height: number; ext: string }> {
  let image = sharp(buffer);
  const meta = await image.metadata();
  const imgW = meta.width ?? 0;
  const imgH = meta.height ?? 0;

  if (crop && imgW > 0 && imgH > 0) {
    const left = Math.min(crop.left, imgW - 1);
    const top = Math.min(crop.top, imgH - 1);
    const width = Math.min(crop.width, imgW - left);
    const height = Math.min(crop.height, imgH - top);
    if (width > 0 && height > 0) {
      image = image.extract({ left, top, width, height });
    }
  }

  image = image.resize(spec.width, spec.height, {
    fit: spec.fit,
    withoutEnlargement: spec.fit === 'inside' ? false : undefined,
    background: spec.background,
  });

  let out: Buffer;
  let ext: string;
  if (spec.format === 'png') {
    out = await image.png({ quality: spec.pngQuality ?? 90 }).toBuffer();
    ext = '.png';
  } else {
    out = await image.jpeg({ quality: spec.jpegQuality ?? 82, mozjpeg: true }).toBuffer();
    ext = '.jpg';
  }

  const finalMeta = await sharp(out).metadata();
  return {
    buffer: out,
    width: finalMeta.width ?? spec.width,
    height: finalMeta.height ?? spec.height,
    ext,
  };
}
