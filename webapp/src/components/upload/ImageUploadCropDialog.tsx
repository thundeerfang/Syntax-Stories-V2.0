'use client';

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import type { Accept } from 'react-dropzone';
import Cropper, { type Area } from 'react-easy-crop';
import { CropperKeyboardWrapper } from '@/components/ui/media';
import { FormDialog } from '@/components/ui/dialog';
import { ImageDropzone, IMAGE_ACCEPT_RASTER } from '@/components/ui/form';
import { Button } from '@/components/ui';
import { Input, Label } from '@/components/retroui';
import { RotateCcw, RotateCw, Undo2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/core/utils';
import { FullWidthSegmentedControl } from '@/components/ui/layout';
import {
  exportCroppedImageFile,
  imageAdjustmentsPreviewFilter,
  NEUTRAL_IMAGE_ADJUSTMENTS,
  type ImageEditAdjustments,
} from '@/lib/media/exportCroppedImageFile';

type EditorTab = 'crop' | 'rotate' | 'adjust';

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
  /** Dropzone accept map; defaults to raster-only (`IMAGE_ACCEPT_RASTER`). */
  accept?: Accept;
  /**
   * When this returns true for the picked file, skip crop / rotate / adjust and upload the original file
   * (e.g. SVG vector logos).
   */
  passthroughWhen?: (file: File) => boolean;
  /** Second line under the dropzone (default: crop hint). */
  secondaryDropzoneHint?: string;
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

/** Same native range styling as Adjust tab sliders (no custom track/thumb CSS). */
const ADJ_RANGE_INPUT_CLASS = 'h-2 w-full accent-primary disabled:opacity-50';

function AdjSlider({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: Readonly<{
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}>) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="w-8 text-right font-mono text-[9px] font-bold text-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={ADJ_RANGE_INPUT_CLASS}
      />
    </div>
  );
}

/**
 * Shared image pick → crop (react-easy-crop) → export flow using `FormDialog` with footer actions.
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
  accept,
  passthroughWhen,
  secondaryDropzoneHint = 'Crop to frame, then confirm',
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
  const [rotation, setRotation] = useState(0);
  const [adjustments, setAdjustments] = useState<ImageEditAdjustments>({ ...NEUTRAL_IMAGE_ADJUSTMENTS });
  const [editorTab, setEditorTab] = useState<EditorTab>('crop');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [passthrough, setPassthrough] = useState(false);

  const previewFilter = useMemo(() => imageAdjustmentsPreviewFilter(adjustments), [adjustments]);

  const dropAccept = accept ?? IMAGE_ACCEPT_RASTER;

  const resetInternal = useCallback(() => {
    setSelectedFile(null);
    setPassthrough(false);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAdjustments({ ...NEUTRAL_IMAGE_ADJUSTMENTS });
    setEditorTab('crop');
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
        toast.error('Please select an image file.');
        return;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`Image must be under ${Math.round(maxSizeBytes / (1024 * 1024))} MB.`);
        return;
      }
      const usePassthrough = passthroughWhen?.(file) ?? false;
      setPassthrough(usePassthrough);
      setSelectedFile(file);
      if (usePassthrough) {
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
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
      setRotation(0);
      setAdjustments({ ...NEUTRAL_IMAGE_ADJUSTMENTS });
      setEditorTab('crop');
      setCroppedAreaPixels(null);
    },
    [maxSizeBytes, passthroughWhen]
  );

  const onCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const chooseAnother = useCallback(() => {
    resetInternal();
  }, [resetInternal]);

  const handleConfirm = async () => {
    if (!selectedFile) {
      toast.error('Select a file first.');
      return;
    }
    if (passthrough) {
      setBusy(true);
      try {
        const trimmedTitle = imageTitleInput.trim();
        const meta: ImageUploadCropConfirmMeta | undefined = imageTitleField
          ? { imageTitle: trimmedTitle.length > 0 ? trimmedTitle : undefined }
          : undefined;
        await Promise.resolve(onConfirm(selectedFile, meta));
        resetInternal();
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!imageUrl || !croppedAreaPixels) {
      toast.error('Select and adjust the crop area first.');
      return;
    }
    setBusy(true);
    try {
      const file = await exportCroppedImageFile(imageUrl, croppedAreaPixels, selectedFile, {
        rotation,
        adjustments,
      });
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

  const actionFooter =
    selectedFile != null ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
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
    ) : null;

  const renderTitleFields = (className?: string) =>
    imageTitleField ? (
      <div className={cn('grid gap-1.5', className)}>
        <Label htmlFor={imageTitleInputId} className="text-[10px] font-bold uppercase text-muted-foreground">
          {imageTitleLabel}
        </Label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-primary"
            aria-hidden
          >
            <UploadCloud className="size-4 shrink-0" strokeWidth={2.25} />
          </span>
          <Input
            id={imageTitleInputId}
            placeholder={imageTitlePlaceholder}
            value={imageTitleInput}
            onChange={(e) => setImageTitleInput(e.target.value.slice(0, imageTitleMaxLength))}
            maxLength={imageTitleMaxLength}
            disabled={busy}
            className="h-9 py-1.5 pl-10 text-sm leading-tight"
          />
        </div>
      </div>
    ) : null;

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
      panelClassName={cn('max-w-md sm:max-w-xl', panelClassName)}
      footer={actionFooter}
      footerClassName="justify-end"
      interactionLock={busy}
    >
      <div className="flex flex-col gap-4">
        {!selectedFile && (
          <>
            {renderTitleFields()}
            <ImageDropzone
              disabled={busy}
              maxSizeBytes={maxSizeBytes}
              accept={dropAccept}
              className={cn(
                'flex min-h-[152px] w-full flex-col items-center justify-center border-2 border-dashed px-6 py-8 text-center transition-colors',
                ' border-border bg-muted/20 outline-none hover:bg-muted/30',
                'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40',
                busy && 'pointer-events-none opacity-70'
              )}
              dragActiveClassName="border-primary bg-primary/5"
              onFile={(f) => handleFile(f)}
            >
              <UploadCloud
                className="mb-4 size-12 shrink-0 text-primary"
                strokeWidth={2.25}
                aria-hidden
              />
              <p className="max-w-[16rem] text-balance text-sm font-bold text-foreground">
                Drop an image here or click to browse
              </p>
              <p className="mt-2 max-w-[16rem] text-balance text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {secondaryDropzoneHint}
              </p>
            </ImageDropzone>
          </>
        )}

        {selectedFile && passthrough && imageUrl && (
          <div className="flex flex-col gap-4">
            <div className="flex max-h-48 items-center justify-center border-2 border-border bg-muted/30 p-4">
              <img src={imageUrl} alt="" className="max-h-40 max-w-full object-contain" />
            </div>
            <p className="text-center text-xs font-bold text-foreground break-all">{selectedFile.name}</p>
            <p className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Vector — no cropping
            </p>
            {renderTitleFields('pt-4')}
          </div>
        )}

        {selectedFile && !passthrough && imageUrl && (
          <div className="flex flex-col gap-2">
            <CropperKeyboardWrapper
              imageReady={!!imageUrl}
              className={cn(
                'w-full overflow-hidden  border-2 border-border bg-muted',
                cropMinHeightClass
              )}
            >
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                cropShape="rect"
                showGrid={editorTab === 'crop'}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                style={{
                  mediaStyle: {
                    filter: previewFilter ?? 'none',
                    transition: 'filter 120ms ease-out',
                  },
                }}
              />
            </CropperKeyboardWrapper>

            <FullWidthSegmentedControl
              label="Editor"
              value={editorTab}
              disabled={busy}
              options={[
                { value: 'crop', label: 'Crop' },
                { value: 'rotate', label: 'Rotate' },
                { value: 'adjust', label: 'Adjust' },
              ]}
              onValueChange={(v) => {
                if (v === 'crop' || v === 'rotate' || v === 'adjust') setEditorTab(v);
              }}
            />

            <div role="tabpanel">
              {editorTab === 'crop' && (
                <div className="flex w-full items-center gap-3 border-2 border-border bg-muted/20 p-3 shadow">
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-primary">
                    Zoom
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className={cn(ADJ_RANGE_INPUT_CLASS, 'min-w-0 flex-1')}
                    disabled={busy}
                    aria-label="Zoom"
                  />
                  <span className="w-14 shrink-0 text-right font-mono text-xs font-black text-foreground">
                    {zoom.toFixed(1)}×
                  </span>
                </div>
              )}

              {editorTab === 'rotate' && (
                <div className="flex w-full min-w-0 flex-nowrap items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="w-11 shrink-0 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Angle
                    </span>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={rotation}
                      disabled={busy}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className={cn(ADJ_RANGE_INPUT_CLASS, 'min-w-0 flex-1')}
                      aria-label="Rotation in degrees"
                    />
                    <span className="w-11 shrink-0 text-right font-mono text-xs font-black text-foreground">{rotation}°</span>
                  </div>
                  <div className="flex shrink-0 items-stretch gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-w-[4.5rem] shrink-0 border-2 px-3 text-[10px] font-black uppercase shadow"
                      disabled={busy}
                      onClick={() => setRotation((r) => r - 90)}
                      aria-label="Rotate 90 degrees counter-clockwise"
                    >
                      <RotateCcw className="mr-1 size-4 shrink-0" aria-hidden />
                      −90°
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-w-[4.5rem] shrink-0 border-2 px-3 text-[10px] font-black uppercase shadow"
                      disabled={busy}
                      onClick={() => setRotation((r) => r + 90)}
                      aria-label="Rotate 90 degrees clockwise"
                    >
                      <RotateCw className="mr-1 size-4 shrink-0" aria-hidden />
                      +90°
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-w-[8.5rem] shrink-0 border-2 px-4 text-[10px] font-black uppercase shadow"
                      disabled={busy}
                      onClick={() => setRotation(0)}
                    >
                      <Undo2 className="mr-1.5 size-4 shrink-0" aria-hidden />
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {editorTab === 'adjust' && (
                <div className="flex flex-col gap-3 bg-muted/15 px-1 py-1">
                  <AdjSlider
                    label="Brightness"
                    min={-100}
                    max={100}
                    value={adjustments.brightness}
                    disabled={busy}
                    onChange={(brightness) => setAdjustments((a) => ({ ...a, brightness }))}
                  />
                  <AdjSlider
                    label="Contrast"
                    min={-100}
                    max={100}
                    value={adjustments.contrast}
                    disabled={busy}
                    onChange={(contrast) => setAdjustments((a) => ({ ...a, contrast }))}
                  />
                  <AdjSlider
                    label="Sharpness"
                    min={0}
                    max={100}
                    value={adjustments.sharpness}
                    disabled={busy}
                    onChange={(sharpness) => setAdjustments((a) => ({ ...a, sharpness }))}
                  />
                  <AdjSlider
                    label="Shadows"
                    min={-100}
                    max={100}
                    value={adjustments.shadows}
                    disabled={busy}
                    onChange={(shadows) => setAdjustments((a) => ({ ...a, shadows }))}
                  />
                  <AdjSlider
                    label="Highlights"
                    min={-100}
                    max={100}
                    value={adjustments.highlights}
                    disabled={busy}
                    onChange={(highlights) => setAdjustments((a) => ({ ...a, highlights }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex h-12 w-full items-center justify-center gap-2 border-2 px-4 text-[10px] font-black uppercase tracking-widest shadow"
                    disabled={busy}
                    onClick={() => setAdjustments({ ...NEUTRAL_IMAGE_ADJUSTMENTS })}
                  >
                    <Undo2 className="size-4 shrink-0" aria-hidden />
                    Reset adjustments
                  </Button>
                </div>
              )}
            </div>

            {renderTitleFields('pt-4')}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
