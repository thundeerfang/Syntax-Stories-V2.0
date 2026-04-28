import type { Area } from 'react-easy-crop';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function pickOutputMime(originalType: string): { mime: string; ext: string; quality?: number } {
  if (originalType === 'image/png') return { mime: 'image/png', ext: 'png' };
  if (originalType === 'image/webp') return { mime: 'image/webp', ext: 'webp', quality: 0.9 };
  return { mime: 'image/jpeg', ext: 'jpg', quality: 0.92 };
}

/**
 * Renders `pixelCrop` from an image source into a new raster file (browser canvas).
 * Used after `react-easy-crop` reports `croppedAreaPixels`.
 */
export async function exportCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  originalFile: File
): Promise<File> {
  const img = await loadImage(imageSrc);
  const w = Math.max(1, Math.round(pixelCrop.width));
  const h = Math.max(1, Math.round(pixelCrop.height));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');

  ctx.drawImage(
    img,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    w,
    h
  );

  const { mime, ext, quality } = pickOutputMime(originalFile.type || 'image/jpeg');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Could not encode image'));
      },
      mime,
      quality
    );
  });

  const base = (originalFile.name || 'image').replace(/\.[^/.]+$/, '');
  const safeBase = base.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'image';
  return new File([blob], `${safeBase}-cropped.${ext}`, { type: mime });
}
