'use client';

import React, { useCallback, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog } from '@/components/ui/Dialog';
import { ImageDropzone } from '@/components/ui/ImageDropzone';
import { Label } from '@/components/retroui';
import { Input } from '@/components/retroui';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadMedia, type CropArea } from '@/api/upload';

export interface UploadMediaDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: (item: { url: string; title?: string; altText?: string; blurDataUrl?: string }) => void;
}

const MAX_MB = 5;

type UploadMode = 'full' | 'crop';

export function UploadMediaDialog({
  open,
  onClose,
  token,
  onSuccess,
}: UploadMediaDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('crop');
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [progress, setProgress] = useState(0);

  const resetState = () => {
    setSelectedFile(null);
    setImageUrl(null);
    setUploadMode('crop');
    setTitle('');
    setAltText('');
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
  };

  const onCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Select an image first.');
      return;
    }
    if (uploadMode === 'crop' && !croppedAreaPixels) {
      toast.error('Select a crop area or choose "Use full image".');
      return;
    }
    setUploading(true);
    setProgress(0);
    const cropArea: CropArea | undefined =
      uploadMode === 'crop' && croppedAreaPixels
        ? {
            x: croppedAreaPixels.x,
            y: croppedAreaPixels.y,
            width: croppedAreaPixels.width,
            height: croppedAreaPixels.height,
          }
        : undefined;

    try {
      const data = await uploadMedia(token, selectedFile, cropArea, (p) => setProgress(p));
      if (data.url) {
        onSuccess({
          url: data.url,
          title: title.trim() || undefined,
          altText: altText.trim() || undefined,
          blurDataUrl: data.blurDataUrl,
        });
        toast.success('Media added.');
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      titleId="upload-media-title"
      panelClassName={cn(
        'pointer-events-auto w-full max-w-lg max-h-[90vh] overflow-y-auto',
        'border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]'
      )}
      contentClassName="relative p-6 pt-10"
      backdropClassName="fixed inset-0 z-[101] bg-black/40"
    >
      <h2 id="upload-media-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
        <ImagePlus className="size-4 text-primary" /> Upload media
      </h2>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
        Add an image (thumbnail). JPEG, PNG, GIF or WebP. Max {MAX_MB}MB.
      </p>

      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="media-title">Title (optional)</Label>
          <Input
            id="media-title"
            placeholder="e.g. Certificate, Project screenshot"
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
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              'border-border bg-muted/20 hover:bg-muted/30',
              uploading && 'pointer-events-none opacity-70'
            )}
            dragActiveClassName="border-primary bg-primary/5"
            onFile={(f) => handleFile(f)}
          >
            <p className="text-sm font-bold text-foreground">Drop an image here or click to browse</p>
            <p className="text-[10px] text-muted-foreground mt-1">Image will be compressed to a thumbnail</p>
          </ImageDropzone>
        )}

        {imageUrl && (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUploadMode('full')}
                className={cn(
                  'flex-1 px-3 py-2 border-2 text-[10px] font-bold uppercase rounded',
                  uploadMode === 'full' ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-muted/20 hover:bg-muted/30'
                )}
              >
                Use full image
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('crop')}
                className={cn(
                  'flex-1 px-3 py-2 border-2 text-[10px] font-bold uppercase rounded',
                  uploadMode === 'crop' ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-muted/20 hover:bg-muted/30'
                )}
              >
                Crop image
              </button>
            </div>

            {uploadMode === 'crop' && (
              <div className="space-y-4">
                <div className="relative w-full h-56 rounded-lg overflow-hidden bg-muted border border-border">
                  <Cropper
                    image={imageUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
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
              </div>
            )}

            {uploadMode === 'full' && (
              <div className="rounded-lg overflow-hidden border-2 border-border bg-muted/20 max-h-48">
                <img src={imageUrl} alt="Preview" className="w-full h-auto object-contain max-h-48" />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="media-alt">Alt text (optional)</Label>
              <Input
                id="media-alt"
                placeholder="Describe the image for accessibility"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                maxLength={200}
              />
            </div>

            {uploading && (
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
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
                onClick={handleUpload}
                className="px-4 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_var(--border)] hover:brightness-110 disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Save & add'}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
