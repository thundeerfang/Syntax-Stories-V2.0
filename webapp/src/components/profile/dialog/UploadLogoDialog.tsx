'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Building2 } from 'lucide-react';
import { FormDialog } from '@/components/ui/FormDialog';
import { ImageDropzone } from '@/components/ui/ImageDropzone';
import type { Accept } from 'react-dropzone';
import { Button } from '@/components/ui';
import { Input, Label } from '@/components/retroui';
import { CropperKeyboardWrapper } from '@/components/ui/CropperKeyboardWrapper';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportCroppedImageFile } from '@/lib/exportCroppedImageFile';
import { uploadSettingsLogo } from '@/api/upload';

export type SettingsLogoUploadKind = 'company-logo' | 'school-logo' | 'org-logo';

export interface UploadLogoDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  kind: SettingsLogoUploadKind;
  /** Called after a successful upload with public URL and optional title (HTML title & alt). */
  onSuccess: (result: { url: string; imageTitle?: string }) => void;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']);

const MAX_BYTES = 2 * 1024 * 1024;

const LOGO_ACCEPT: Accept = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
};

const TITLES: Record<SettingsLogoUploadKind, string> = {
  'company-logo': 'Upload company logo',
  'school-logo': 'Upload school logo',
  'org-logo': 'Upload issuer logo',
};

const CROP_H = 'min-h-[12rem] h-48';

export function UploadLogoDialog({
  open,
  onClose,
  token,
  kind,
  onSuccess,
}: Readonly<UploadLogoDialogProps>) {
  const titleId = useId();
  const imageTitleInputId = useId();
  const [busy, setBusy] = useState(false);
  const [imageTitleInput, setImageTitleInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSvg, setIsSvg] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const resetInternal = useCallback(() => {
    setSelectedFile(null);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setIsSvg(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setBusy(false);
    setImageTitleInput('');
  }, []);

  useEffect(() => {
    if (!open) resetInternal();
  }, [open, resetInternal]);

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error('Logo must be JPEG, PNG, WebP, or SVG.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Logo must be under 2 MB.');
      return;
    }
    const svg = file.type.includes('svg');
    setSelectedFile(file);
    setIsSvg(svg);
    if (svg) {
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setCroppedAreaPixels(null);
      return;
    }
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  const onCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const chooseAnother = useCallback(() => {
    resetInternal();
  }, [resetInternal]);

  const trimmedTitle = () => {
    const t = imageTitleInput.trim();
    return t.length > 0 ? t : undefined;
  };

  const finishUpload = async (file: File) => {
    const data = await uploadSettingsLogo(token, file, kind, undefined);
    if (!data.url) throw new Error('Upload failed');
    onSuccess({ url: data.url, imageTitle: trimmedTitle() });
    toast.success('Logo uploaded.');
    resetInternal();
    onClose();
  };

  const handleRasterConfirm = async () => {
    if (!selectedFile || !imageUrl || !croppedAreaPixels) {
      toast.error('Select and adjust the crop area first.');
      return;
    }
    setBusy(true);
    try {
      const file = await exportCroppedImageFile(imageUrl, croppedAreaPixels, selectedFile);
      await finishUpload(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const handleSvgConfirm = async () => {
    if (!selectedFile || !isSvg) {
      toast.error('Select an SVG file first.');
      return;
    }
    setBusy(true);
    try {
      await finishUpload(selectedFile);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const dialogTitle = TITLES[kind];

  const titleFields = (
    <div className="grid gap-1.5">
      <Label htmlFor={imageTitleInputId} className="text-[10px] font-bold uppercase text-muted-foreground">
        Title (optional)
      </Label>
      <Input
        id={imageTitleInputId}
        placeholder="e.g. Acme Corp wordmark"
        value={imageTitleInput}
        onChange={(e) => setImageTitleInput(e.target.value.slice(0, 120))}
        maxLength={120}
        disabled={busy}
      />
      <p className="text-[9px] font-medium text-muted-foreground">
        Shown as <span className="font-semibold">title</span> and <span className="font-semibold">alt</span> for this logo where supported.
      </p>
    </div>
  );

  return (
    <FormDialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      titleId={titleId}
      title={dialogTitle}
      titleIcon={<Building2 className="size-4 shrink-0 text-primary" aria-hidden />}
      subtitle="Raster: square crop, then upload. SVG uploads as-is (no crop). JPEG, PNG, WebP, or SVG · max 2 MB."
      subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
      panelClassName="max-w-md sm:max-w-lg"
      interactionLock={busy}
    >
      <div className="flex flex-col gap-4">
        {!selectedFile && (
          <>
            {titleFields}
            <ImageDropzone
              disabled={busy}
              maxSizeBytes={MAX_BYTES}
              accept={LOGO_ACCEPT}
              className={cn(
                'flex min-h-[152px] w-full flex-col items-center justify-center border-2 border-dashed px-6 py-8 text-center transition-colors',
                'rounded-none border-border bg-muted/20 outline-none hover:bg-muted/30',
                'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40',
                busy && 'pointer-events-none opacity-70'
              )}
              dragActiveClassName="border-primary bg-primary/5"
              onFile={(f) => handleFile(f)}
            >
              <p className="max-w-[16rem] text-balance text-sm font-bold text-foreground">Drop a logo here or click to browse</p>
              <p className="mt-2 max-w-[16rem] text-balance text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Square crop for raster images
              </p>
            </ImageDropzone>
          </>
        )}

        {selectedFile && isSvg && (
          <div className="flex flex-col gap-4">
            <div className="rounded-none border-2 border-border bg-muted/30 px-4 py-3 text-center">
              <p className="text-xs font-bold text-foreground break-all">{selectedFile.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">SVG — no cropping</p>
            </div>
            {titleFields}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 min-h-12 border-2 px-4 text-[10px] font-black uppercase tracking-widest"
                disabled={busy}
                onClick={chooseAnother}
              >
                Choose another
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-12 min-h-12 border-2 px-4 text-[10px] font-black uppercase tracking-widest"
                disabled={busy}
                onClick={() => void handleSvgConfirm()}
              >
                {busy ? 'Working…' : 'Upload'}
              </Button>
            </div>
          </div>
        )}

        {selectedFile && !isSvg && imageUrl && (
          <div className="flex flex-col gap-4">
            <CropperKeyboardWrapper
              imageReady={!!imageUrl}
              className={cn(
                'w-full overflow-hidden rounded-none border-2 border-border bg-muted',
                CROP_H
              )}
            >
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
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
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
                disabled={busy}
                aria-label="Zoom"
              />
              <span className="w-14 text-right text-[10px] font-bold text-muted-foreground">{zoom.toFixed(1)}×</span>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              Tip: click the crop frame, then arrow keys to pan. Hold Shift for smaller steps.
            </p>
            {titleFields}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 min-h-12 border-2 px-4 text-[10px] font-black uppercase tracking-widest"
                disabled={busy}
                onClick={chooseAnother}
              >
                Choose another
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-12 min-h-12 border-2 px-4 text-[10px] font-black uppercase tracking-widest"
                disabled={busy}
                onClick={() => void handleRasterConfirm()}
              >
                {busy ? 'Working…' : 'Save & upload'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
