import type { Area } from "react-easy-crop";
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
function pickOutputMime(originalType: string): {
  mime: string;
  ext: string;
  quality?: number;
} {
  if (originalType === "image/png") return { mime: "image/png", ext: "png" };
  if (originalType === "image/webp")
    return { mime: "image/webp", ext: "webp", quality: 0.9 };
  return { mime: "image/jpeg", ext: "jpg", quality: 0.92 };
}
function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}
function rotateSize(
  width: number,
  height: number,
  rotation: number,
): {
  width: number;
  height: number;
} {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}
function clamp255(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}
export type ImageEditAdjustments = {
  brightness: number;
  contrast: number;
  sharpness: number;
  shadows: number;
  highlights: number;
};
export const NEUTRAL_IMAGE_ADJUSTMENTS: ImageEditAdjustments = {
  brightness: 0,
  contrast: 0,
  sharpness: 0,
  shadows: 0,
  highlights: 0,
};
export type ExportCroppedImageOptions = {
  rotation?: number;
  adjustments?: Partial<ImageEditAdjustments>;
};
function mergeAdjustments(
  partial?: Partial<ImageEditAdjustments>,
): ImageEditAdjustments {
  return { ...NEUTRAL_IMAGE_ADJUSTMENTS, ...partial };
}
function hasAdjustments(a: ImageEditAdjustments): boolean {
  return (
    a.brightness !== 0 ||
    a.contrast !== 0 ||
    a.sharpness !== 0 ||
    a.shadows !== 0 ||
    a.highlights !== 0
  );
}
export function imageAdjustmentsPreviewFilter(
  adj: ImageEditAdjustments,
): string | undefined {
  if (!hasAdjustments(adj)) return undefined;
  const b = 100 + adj.brightness + adj.shadows * 0.22 - adj.highlights * 0.18;
  const c = 100 + adj.contrast + adj.sharpness * 0.2;
  const brightnessPct = Math.min(200, Math.max(0, b));
  const contrastPct = Math.min(200, Math.max(1, c));
  const sharpExtra =
    adj.sharpness > 0
      ? ` saturate(${100 + Math.min(20, adj.sharpness * 0.15)}%)`
      : "";
  return `brightness(${brightnessPct}%) contrast(${contrastPct}%)${sharpExtra}`;
}
function drawCroppedToCanvas(
  img: HTMLImageElement,
  pixelCrop: Area,
  rotation: number,
  target: HTMLCanvasElement,
): CanvasRenderingContext2D {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const w = Math.max(1, Math.round(pixelCrop.width));
  const h = Math.max(1, Math.round(pixelCrop.height));
  target.width = w;
  target.height = h;
  const ctx = target.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");
  if (!rotation) {
    ctx.drawImage(
      img,
      Math.round(pixelCrop.x),
      Math.round(pixelCrop.y),
      Math.round(pixelCrop.width),
      Math.round(pixelCrop.height),
      0,
      0,
      w,
      h,
    );
    return ctx;
  }
  const bbox = rotateSize(iw, ih, rotation);
  const inner = document.createElement("canvas");
  inner.width = Math.max(1, Math.ceil(bbox.width));
  inner.height = Math.max(1, Math.ceil(bbox.height));
  const ictx = inner.getContext("2d");
  if (!ictx) throw new Error("Canvas 2D not available");
  ictx.translate(inner.width / 2, inner.height / 2);
  ictx.rotate(getRadianAngle(rotation));
  ictx.translate(-iw / 2, -ih / 2);
  ictx.drawImage(img, 0, 0);
  ctx.drawImage(
    inner,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    w,
    h,
  );
  return ctx;
}
function applyBrightnessContrast(
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
  brightnessPct: number,
  contrastPct: number,
): CanvasRenderingContext2D {
  target.width = source.width;
  target.height = source.height;
  const ctx = target.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");
  const b = Math.min(200, Math.max(0, 100 + brightnessPct));
  const c = Math.min(200, Math.max(1, 100 + contrastPct));
  ctx.filter = `brightness(${b}%) contrast(${c}%)`;
  ctx.drawImage(source, 0, 0);
  ctx.filter = "none";
  return ctx;
}
function applyShadowsHighlights(
  data: ImageData,
  shadows: number,
  highlights: number,
): void {
  if (!shadows && !highlights) return;
  const d = data.data;
  const sh = shadows / 100;
  const hi = highlights / 100;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    let delta = 0;
    if (sh !== 0 && L < 0.5) {
      delta += sh * ((0.5 - L) / 0.5) * 55;
    }
    if (hi !== 0 && L > 0.5) {
      delta -= hi * ((L - 0.5) / 0.5) * 55;
    }
    if (delta !== 0) {
      d[i] = clamp255(r + delta);
      d[i + 1] = clamp255(g + delta);
      d[i + 2] = clamp255(b + delta);
    }
  }
}
function applySharpen(data: ImageData, amount: number): void {
  if (amount <= 0) return;
  const w = data.width;
  const h = data.height;
  const src = new Uint8ClampedArray(data.data);
  const dst = data.data;
  const k = (amount / 100) * 0.75;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        const i = (y * w + x) * 4 + c;
        const center = src[i];
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            sum += src[((y + dy) * w + (x + dx)) * 4 + c];
          }
        }
        const avg = sum / 8;
        dst[i] = clamp255(center + k * (center - avg));
      }
    }
  }
}
function applyAdjustmentsPipeline(
  sourceCanvas: HTMLCanvasElement,
  adj: ImageEditAdjustments,
): HTMLCanvasElement {
  if (!hasAdjustments(adj)) return sourceCanvas;
  let work = sourceCanvas;
  let bcCanvas: HTMLCanvasElement | null = null;
  if (adj.brightness !== 0 || adj.contrast !== 0) {
    bcCanvas = document.createElement("canvas");
    applyBrightnessContrast(work, bcCanvas, adj.brightness, adj.contrast);
    work = bcCanvas;
  }
  if (adj.shadows === 0 && adj.highlights === 0 && adj.sharpness === 0) {
    return work;
  }
  const ctx = work.getContext("2d");
  if (!ctx) return work;
  const imageData = ctx.getImageData(0, 0, work.width, work.height);
  applyShadowsHighlights(imageData, adj.shadows, adj.highlights);
  applySharpen(imageData, adj.sharpness);
  const out = document.createElement("canvas");
  out.width = work.width;
  out.height = work.height;
  const octx = out.getContext("2d");
  if (!octx) return work;
  octx.putImageData(imageData, 0, 0);
  return out;
}
export async function exportCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  originalFile: File,
  options?: ExportCroppedImageOptions,
): Promise<File> {
  const img = await loadImage(imageSrc);
  const rotation = options?.rotation ?? 0;
  const adj = mergeAdjustments(options?.adjustments);
  const cropped = document.createElement("canvas");
  drawCroppedToCanvas(img, pixelCrop, rotation, cropped);
  const finalCanvas = applyAdjustmentsPipeline(cropped, adj);
  const { mime, ext, quality } = pickOutputMime(
    originalFile.type || "image/jpeg",
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Could not encode image"));
      },
      mime,
      quality,
    );
  });
  const base = (originalFile.name || "image").replace(/\.[^/.]+$/, "");
  const safeBase = base.replace(/[^\w.-]+/g, "_").slice(0, 80) || "image";
  return new File([blob], `${safeBase}-cropped.${ext}`, { type: mime });
}
