'use client';

import { useDropzone, type Accept } from 'react-dropzone';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/** Raster images accepted by `/api/upload` image routes. */
export const IMAGE_ACCEPT_RASTER: Accept = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

export type ImageDropzoneProps = {
  disabled?: boolean;
  maxSizeBytes: number;
  accept?: Accept;
  onFile: (file: File) => void;
  className?: string;
  dragActiveClassName?: string;
  children: React.ReactNode;
};

export function ImageDropzone({
  disabled,
  maxSizeBytes,
  accept = IMAGE_ACCEPT_RASTER,
  onFile,
  className,
  dragActiveClassName,
  children,
}: Readonly<ImageDropzoneProps>) {
  const maxMb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxSize: maxSizeBytes,
    multiple: false,
    disabled,
    onDropAccepted: (accepted) => {
      const f = accepted[0];
      if (f) onFile(f);
    },
    onDropRejected: (rejections) => {
      const code = rejections[0]?.errors[0]?.code;
      if (code === 'file-too-large') {
        toast.error(`Image must be under ${maxMb}MB.`);
      } else if (code === 'file-invalid-type') {
        toast.error('Please use a supported image type (JPEG, PNG, GIF, WebP).');
      } else {
        toast.error('Could not use this file.');
      }
    },
  });

  return (
    <div {...getRootProps()} className={cn(className, isDragActive && dragActiveClassName)}>
      <input {...getInputProps()} />
      {children}
    </div>
  );
}
