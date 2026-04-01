'use client';

import { useCallback, useState } from 'react';
import { Building2, X } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog } from '@/components/ui/Dialog';
import { CropperKeyboardWrapper } from '@/components/ui/CropperKeyboardWrapper';
import { ImageDropzone } from '@/components/ui/ImageDropzone';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadSettingsLogo, type CropArea } from '@/api/upload';

export type SettingsLogoUploadKind = 'company-logo' | 'school-logo' | 'org-logo';

export interface UploadLogoDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  kind: SettingsLogoUploadKind;
  onSuccess: (url: string) => void;
}

const MAX_MB = 2;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']);

const TITLES: Record<SettingsLogoUploadKind, string> = {
  'company-logo': 'Upload company logo',
  'school-logo': 'Upload school logo',
  'org-logo': 'Upload issuer logo',
};

export function UploadLogoDialog({
  open,
  onClose,
  token,
  kind,
  onSuccess,
}: Readonly<UploadLogoDialogProps>) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSvg, setIsSvg] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [progress, setProgress] = useState(0);

  const resetState = () => {
    setSelectedFile(null);
    setImageUrl(null);
    setIsSvg(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setProgress(0);
    setUploading(false);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error('Logo must be JPEG, PNG, WebP, or SVG.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Logo must be under ${MAX_MB} MB.`);
      return;
    }
    const svg = file.type.includes('svg');
    setIsSvg(svg);
    setSelectedFile(file);
    if (svg) {
      setImageUrl(null);
      setCroppedAreaPixels(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const onCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Select a file first.');
      return;
    }
    if (!isSvg && !croppedAreaPixels) {
      toast.error('Adjust the crop area, then save.');
      return;
    }
    setUploading(true);
    setProgress(0);
    const cropArea: CropArea | undefined =
      !isSvg && croppedAreaPixels
        ? {
            x: croppedAreaPixels.x,
            y: croppedAreaPixels.y,
            width: croppedAreaPixels.width,
            height: croppedAreaPixels.height,
          }
        : undefined;

    try {
      const data = await uploadSettingsLogo(token, selectedFile, kind, cropArea, (p) => setProgress(p));
      if (data.url) {
        onSuccess(data.url);
        toast.success('Logo uploaded.');
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        resetState();
        onClose();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    resetState();
    onClose();
  };

  const title = TITLES[kind];
  const uploadProgressWidth = `${Math.round(progress * 100)}%`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      titleId="upload-logo-title"
      showCloseButton={false}
      contentClassName="relative p-6 sm:p-8"
      panelClassName={cn(
        'pointer-events-auto w-full max-w-sm max-h-[90vh] overflow-y-auto',
        'border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]'
      )}
      backdropClassName="fixed inset-0 z-[101] bg-black/40"
    >
      <div className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <h2
              id="upload-logo-title"
              className="text-sm font-black uppercase tracking-widest flex flex-wrap items-center gap-2"
            >
              <Building2 className="size-4 shrink-0 text-primary" aria-hidden />
              <span>{title}</span>
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Raster images: crop to square, then upload. SVG is stored as uploaded (no crop).
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 flex size-9 items-center justify-center rounded-sm border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0px_0px_var(--border)] transition-colors hover:text-foreground hover:border-primary"
            aria-label="Close"
          >
            <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </button>
        </header>

        {!selectedFile && (
          <ImageDropzone
            disabled={uploading}
            maxSizeBytes={MAX_MB * 1024 * 1024}
            accept={{
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png'],
              'image/webp': ['.webp'],
              'image/svg+xml': ['.svg'],
            }}
            className={cn(
              'flex min-h-[152px] w-full flex-col items-center justify-center border-2 border-dashed rounded-lg px-6 py-8 text-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              'border-border bg-muted/20 hover:bg-muted/30',
              uploading && 'pointer-events-none opacity-70'
            )}
            dragActiveClassName="border-primary bg-primary/5"
            onFile={(f) => handleFile(f)}
          >
            <p className="text-sm font-bold text-foreground text-balance max-w-[16rem]">Drop a logo here or click to browse</p>
            <p className="text-[10px] text-muted-foreground mt-2 text-balance max-w-[16rem]">JPEG, PNG, WebP, or SVG · max {MAX_MB}MB</p>
          </ImageDropzone>
        )}

        {selectedFile && isSvg && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border-2 border-border bg-muted/30 px-4 py-3 text-center">
              <p className="text-xs font-bold text-foreground break-all">{selectedFile.name}</p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">SVG uploads without cropping</p>
            </div>
            {uploading && (
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: uploadProgressWidth }} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => resetState()}
                className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border border-border text-muted-foreground hover:bg-muted/40"
              >
                Back
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleUpload()}
                className="px-4 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_var(--border)] hover:brightness-110 disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {selectedFile && !isSvg && imageUrl && (
          <div className="flex flex-col gap-4">
            <CropperKeyboardWrapper imageReady={!!imageUrl} className="w-full h-56 rounded-lg overflow-hidden bg-muted border border-border">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </CropperKeyboardWrapper>
            <div className="flex items-center justify-between gap-4">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-[10px] font-bold text-muted-foreground w-16 text-right">{zoom.toFixed(1)}x</span>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              Tip: focus the crop frame (click it), then arrow keys to pan. Hold Shift for smaller steps.
            </p>
            {uploading && (
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: uploadProgressWidth }} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => {
                  if (imageUrl) URL.revokeObjectURL(imageUrl);
                  resetState();
                }}
                className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border border-border text-muted-foreground hover:bg-muted/40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleUpload()}
                className="px-4 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_var(--border)] hover:brightness-110 disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Save & upload'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
