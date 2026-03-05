'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Image } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadCover, type CropArea } from '@/api/upload';

export interface UploadCoverDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: (url: string) => void;
}

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
const MAX_MB = 10;

export function UploadCoverDialog({
  open,
  onClose,
  token,
  onSuccess,
}: UploadCoverDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
    setDragOver(false);
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
    if (!selectedFile || !croppedAreaPixels) {
      toast.error('Select an area to crop before uploading.');
      return;
    }
    setUploading(true);
    setProgress(0);
    const cropArea: CropArea = {
      x: croppedAreaPixels.x,
      y: croppedAreaPixels.y,
      width: croppedAreaPixels.width,
      height: croppedAreaPixels.height,
    };
    try {
      const data = await uploadCover(token, selectedFile, cropArea, (p) => setProgress(p));
      if (data.url) {
        onSuccess(data.url);
        toast.success('Cover image updated.');
        resetState();
        onClose();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file ?? null);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file ?? null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="upload-cover-title"
      panelClassName={cn(
        'pointer-events-auto w-full max-w-sm max-h-[90vh] overflow-y-auto',
        'border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]'
      )}
      contentClassName="relative p-6 pt-10"
      backdropClassName="fixed inset-0 z-50 bg-black/40"
    >
      <h2 id="upload-cover-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
        <Image className="size-4 text-primary" /> Upload cover image
      </h2>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
        JPEG, PNG, GIF or WebP. Max {MAX_MB}MB. Recommended width 1200px+.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onInputChange}
        className="hidden"
        aria-hidden
      />
      {!imageUrl && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/30',
            uploading && 'pointer-events-none opacity-70'
          )}
        >
          <p className="text-sm font-bold text-foreground">Drop an image here or click to browse</p>
          <p className="text-[10px] text-muted-foreground mt-1">Cover banner will be updated</p>
        </div>
      )}

      {imageUrl && (
        <div className="space-y-4">
          <div className="relative w-full h-56 rounded-lg overflow-hidden bg-muted border border-border">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={4}
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
            <span className="text-[10px] font-bold text-muted-foreground w-16 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>
          {uploading && (
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
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
              onClick={handleUpload}
              className="px-4 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_var(--border)] hover:brightness-110 disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : 'Save & upload'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
