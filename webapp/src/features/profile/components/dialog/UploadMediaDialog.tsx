'use client';

import { useCallback, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { FormDialog } from '@/components/ui/dialog';
import { CropperKeyboardWrapper } from '@/components/ui/media';
import { ImageDropzone } from '@/components/ui/form';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/core/utils';
import { uploadMedia, type CropArea } from '@/api/upload';
import { uploadResponseAlt } from '@/lib/media/uploadImageMeta';

export interface UploadMediaDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: (item: {
    url: string;
    title?: string;
    alt?: string;
    blurDataUrl?: string;
    /** When true, this item is only staged locally and must be uploaded by the caller later. */
    isPending?: boolean;
    /** Original file and crop, for callers that want to defer upload until final Save. */
    pendingFile?: File;
    pendingCrop?: CropArea;
  }) => void;
  /**
   * Upload mode:
   * - 'immediate' (default): upload to media API here and return a final URL
   * - 'staged': do not call the API; return a blob URL + pendingFile/crop so caller can upload later
   */
  mode?: 'immediate' | 'staged';
}

const MAX_MB = 5;

export function UploadMediaDialog({
  open,
  onClose,
  token,
  onSuccess,
  mode = 'immediate',
}: Readonly<UploadMediaDialogProps>) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [progress, setProgress] = useState(0);

  const resetState = () => {
    setSelectedFile(null);
    setImageUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setProgress(0);
    setUploading(false);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image (JPEG, PNG, GIF, WebP).');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_MB}MB.`);
      return;
    }
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const onCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !croppedAreaPixels) {
      toast.error('Adjust the crop area, then save.');
      return;
    }

    const cropArea: CropArea = {
      x: croppedAreaPixels.x,
      y: croppedAreaPixels.y,
      width: croppedAreaPixels.width,
      height: croppedAreaPixels.height,
    };

    // Staged mode: do not hit the upload API yet; hand back a blob URL + pending data.
    if (mode === 'staged') {
      const blobUrl = imageUrl ?? URL.createObjectURL(selectedFile);
      onSuccess({
        url: blobUrl,
        isPending: true,
        pendingFile: selectedFile,
        pendingCrop: cropArea,
      });
      toast.success('Media staged. It will upload when you save.');
      if (imageUrl && blobUrl !== imageUrl) URL.revokeObjectURL(imageUrl);
      resetState();
      onClose();
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const data = await uploadMedia(token, selectedFile, cropArea, (p) => setProgress(p));
      if (data.url) {
        const alt = uploadResponseAlt(data);
        onSuccess({
          url: data.url,
          title: alt,
          alt,
          blurDataUrl: data.blurDataUrl,
        });
        toast.success('Media added.');
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

  const uploadProgressWidth = `${Math.round(progress * 100)}%`;

  return (
    <FormDialog
      open={open}
      onClose={() => {
        if (!uploading) handleClose();
      }}
      titleId="upload-media-title"
      title="Upload media"
      titleIcon={<ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />}
      subtitle={`Crop to thumbnail. JPEG, PNG, GIF or WebP. Max ${MAX_MB} MB. Title and alt are set automatically when uploaded.`}
      subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
      panelClassName="max-w-md sm:max-w-lg"
      interactionLock={uploading}
    >
      <div className="flex flex-col gap-4">
        {!imageUrl && (
          <ImageDropzone
            disabled={uploading}
            maxSizeBytes={MAX_MB * 1024 * 1024}
            className={cn(
              'flex min-h-[152px] w-full flex-col items-center justify-center border-2 border-dashed px-6 py-8 text-center transition-colors',
              ' border-border bg-muted/20 outline-none hover:bg-muted/30',
              'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40',
              uploading && 'pointer-events-none opacity-70'
            )}
            dragActiveClassName="border-primary bg-primary/5"
            onFile={(f) => handleFile(f)}
          >
            <p className="max-w-[16rem] text-balance text-sm font-bold text-foreground">
              Drop an image here or click to browse
            </p>
            <p className="mt-2 max-w-[16rem] text-balance text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              You will crop before upload
            </p>
          </ImageDropzone>
        )}

        {imageUrl && (
          <div className="flex flex-col gap-4">
            <CropperKeyboardWrapper
              imageReady={!!imageUrl}
              className="h-56 w-full overflow-hidden border-2 border-border bg-muted"
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
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
                disabled={uploading}
                aria-label="Zoom"
              />
              <span className="w-14 text-right text-[10px] font-bold text-muted-foreground">
                {zoom.toFixed(1)}×
              </span>
            </div>

            {uploading && (
              <div className="h-2 w-full overflow-hidden bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: uploadProgressWidth }}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 min-h-12 border-2 px-4 text-[10px] font-black uppercase tracking-widest"
                disabled={uploading}
                onClick={() => {
                  if (imageUrl) URL.revokeObjectURL(imageUrl);
                  resetState();
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-12 min-h-12 border-2 px-4 text-[10px] font-black uppercase tracking-widest"
                disabled={uploading}
                onClick={() => void handleUpload()}
              >
                {uploading ? 'Uploading…' : 'Save & add'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
