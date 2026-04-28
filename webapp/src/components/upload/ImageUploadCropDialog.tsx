'use client';

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { CropperKeyboardWrapper } from '@/components/ui/CropperKeyboardWrapper';
import { FormDialog } from '@/components/ui/FormDialog';
import { ImageDropzone, IMAGE_ACCEPT_RASTER } from '@/components/ui/ImageDropzone';
import { Button } from '@/components/ui';
import { Input, Label } from '@/components/retroui';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportCroppedImageFile } from '@/lib/exportCroppedImageFile';

/** Passed to `onConfirm` when `imageTitleField` is enabled; use for HTML `title` and `alt`. */
export type ImageUploadCropConfirmMeta = {
  imageTitle?: string;
};

export type ImageUploadCropDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible title id (must match `title` heading usage). */
  titleId: string;
  title: ReactNode;
  titleIcon?: ReactNode;
  subtitle?: ReactNode;
  subtitleClassName?: string;
  maxSizeBytes: number;
  /** Crop aspect ratio (profile photo uses `1`). */
  aspect?: number;
  /** Min height of the crop frame (Tailwind class). */
  cropMinHeightClass?: string;
  /**
   * Called with the cropped image file; dialog resets and closes on success.
   * When `imageTitleField` is set, second argument includes trimmed `imageTitle` (may be empty string).
   */
  onConfirm: (file: File, meta?: ImageUploadCropConfirmMeta) => void | Promise<void>;
  confirmLabel?: string;
  chooseAnotherLabel?: string;
  panelClassName?: string;
  /** When true, show an optional title field (HTML `title` and `alt` where supported). */
  imageTitleField?: boolean;
  imageTitleLabel?: string;
  imageTitlePlaceholder?: string;
  imageTitleMaxLength?: number;
};

const DEFAULT_CROP_H = 'min-h-[14rem] h-56';

/**
 * Shared image pick → crop (react-easy-crop) → export flow using `FormDialog` (no footer strip;
 * actions live in the body like profile photo upload).
 */
export function ImageUploadCropDialog({
  open,
  onClose,
  titleId,
  title,
  titleIcon,
  subtitle,
  subtitleClassName,
  maxSizeBytes,
  aspect = 1,
  cropMinHeightClass = DEFAULT_CROP_H,
  onConfirm,
  confirmLabel = 'Use image',
  chooseAnotherLabel = 'Choose another',
  panelClassName,
  imageTitleField = false,
  imageTitleLabel = 'Title (optional)',
  imageTitlePlaceholder = 'e.g. Headshot, team photo',
  imageTitleMaxLength = 120,
}: Readonly<ImageUploadCropDialogProps>) {
  const imageTitleInputId = useId();
  const [busy, setBusy] = useState(false);
  const [imageTitleInput, setImageTitleInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const resetInternal = useCallback(() => {
    setSelectedFile(null);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setBusy(false);
    setImageTitleInput('');
  }, []);

  useEffect(() => {
    if (!open) resetInternal();
  }, [open, resetInternal]);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image (JPEG, PNG, GIF, WebP).');
        return;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`Image must be under ${Math.round(maxSizeBytes / (1024 * 1024))} MB.`);
        return;
      }
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setSelectedFile(file);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    },
    [maxSizeBytes]
  );

  const onCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const chooseAnother = useCallback(() => {
    resetInternal();
  }, [resetInternal]);

  const handleConfirm = async () => {
    if (!selectedFile || !imageUrl || !croppedAreaPixels) {
      toast.error('Select and adjust the crop area first.');
      return;
    }
    setBusy(true);
    try {
      const file = await exportCroppedImageFile(imageUrl, croppedAreaPixels, selectedFile);
      const trimmedTitle = imageTitleInput.trim();
      const meta: ImageUploadCropConfirmMeta | undefined = imageTitleField
        ? { imageTitle: trimmedTitle.length > 0 ? trimmedTitle : undefined }
        : undefined;
      await Promise.resolve(onConfirm(file, meta));
      resetInternal();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const maxMb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));

  const titleFields =
    imageTitleField &&
    (
      <div className="grid gap-1.5">
        <Label htmlFor={imageTitleInputId} className="text-[10px] font-bold uppercase text-muted-foreground">
          {imageTitleLabel}
        </Label>
        <Input
          id={imageTitleInputId}
          placeholder={imageTitlePlaceholder}
          value={imageTitleInput}
          onChange={(e) => setImageTitleInput(e.target.value.slice(0, imageTitleMaxLength))}
          maxLength={imageTitleMaxLength}
          disabled={busy}
        />
        <p className="text-[9px] font-medium text-muted-foreground">
          Shown as <span className="font-semibold">title</span> and <span className="font-semibold">alt</span> for this image where supported.
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
      title={title}
      titleIcon={titleIcon}
      subtitle={subtitle ?? `JPEG, PNG, GIF or WebP · max ${maxMb} MB`}
      subtitleClassName={subtitleClassName}
      panelClassName={cn('max-w-md sm:max-w-lg', panelClassName)}
      interactionLock={busy}
    >
      <div className="flex flex-col gap-4">
        {!imageUrl && (
          <>
            {titleFields}
            <ImageDropzone
              disabled={busy}
              maxSizeBytes={maxSizeBytes}
              accept={IMAGE_ACCEPT_RASTER}
              className={cn(
                'flex min-h-[152px] w-full flex-col items-center justify-center border-2 border-dashed px-6 py-8 text-center transition-colors',
                'rounded-none border-border bg-muted/20 outline-none hover:bg-muted/30',
                'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40',
                busy && 'pointer-events-none opacity-70'
              )}
              dragActiveClassName="border-primary bg-primary/5"
              onFile={(f) => handleFile(f)}
            >
              <p className="max-w-[16rem] text-balance text-sm font-bold text-foreground">
                Drop an image here or click to browse
              </p>
              <p className="mt-2 max-w-[16rem] text-balance text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Crop to frame, then confirm
              </p>
            </ImageDropzone>
          </>
        )}

        {imageUrl && (
          <div className="flex flex-col gap-4">
            <CropperKeyboardWrapper
              imageReady={!!imageUrl}
              className={cn(
                'w-full overflow-hidden rounded-none border-2 border-border bg-muted',
                cropMinHeightClass
              )}
            >
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
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
                {chooseAnotherLabel}
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-12 min-h-12 border-2 px-4 text-[10px] font-black uppercase tracking-widest"
                disabled={busy}
                onClick={() => void handleConfirm()}
              >
                {busy ? 'Working…' : confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
