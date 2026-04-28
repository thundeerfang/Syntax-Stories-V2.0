'use client';

import { useCallback, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog } from '@/components/ui/Dialog';
import { CropperKeyboardWrapper } from '@/components/ui/CropperKeyboardWrapper';
import { ImageDropzone } from '@/components/ui/ImageDropzone';
import { Input, Label } from '@/components/retroui';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadMedia, type CropArea } from '@/api/upload';

export interface UploadMediaDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: (item: {
    url: string;
    title?: string;
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
  const [title, setTitle] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [progress, setProgress] = useState(0);

  const resetState = () => {
    setSelectedFile(null);
    setImageUrl(null);
    setTitle('');
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
      const fallbackTitle = 'Media image';
      const stagedTitle = title.trim() || fallbackTitle;
      const blobUrl = imageUrl ?? URL.createObjectURL(selectedFile);
      onSuccess({
        url: blobUrl,
        title: stagedTitle,
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
        const fallbackTitle = 'Media image';
        onSuccess({
          url: data.url,
          title: title.trim() || fallbackTitle,
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
    <Dialog
      open={open}
      onClose={handleClose}
      titleId="upload-media-title"
      showCloseButton={false}
      panelClassName={cn(
        'pointer-events-auto w-full max-w-lg max-h-[90vh] overflow-y-auto',
        'border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]'
      )}
      contentClassName="relative p-6 sm:p-8"
      backdropClassName="fixed inset-0 z-[101] bg-black/40"
    >
      <div className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <h2
              id="upload-media-title"
              className="text-sm font-black uppercase tracking-widest flex flex-wrap items-center gap-2"
            >
              <ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />
              <span>Upload media</span>
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Crop to thumbnail. JPEG, PNG, GIF or WebP. Max {MAX_MB}MB. Title is used as the image description.
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

        <div className="grid gap-1.5">
          <Label htmlFor="media-title">Title (optional)</Label>
          <Input
            id="media-title"
            placeholder="e.g. Certificate, project screenshot"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>

        {!imageUrl && (
          <ImageDropzone
            disabled={uploading}
            maxSizeBytes={MAX_MB * 1024 * 1024}
            className={cn(
              'flex min-h-[152px] w-full flex-col items-center justify-center border-2 border-dashed rounded-lg px-6 py-8 text-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              'border-border bg-muted/20 hover:bg-muted/30',
              uploading && 'pointer-events-none opacity-70'
            )}
            dragActiveClassName="border-primary bg-primary/5"
            onFile={(f) => handleFile(f)}
          >
            <p className="text-sm font-bold text-foreground text-balance max-w-[16rem]">Drop an image here or click to browse</p>
            <p className="text-[10px] text-muted-foreground mt-2 text-balance max-w-[16rem]">You will crop before upload</p>
          </ImageDropzone>
        )}

        {imageUrl && (
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
                {uploading ? 'Uploading…' : 'Save & add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
