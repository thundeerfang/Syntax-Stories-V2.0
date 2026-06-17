"use client";
import { useDropzone, type Accept } from "react-dropzone";
import { toast } from "sonner";
import {
  RASTER_ACCEPT_EXTENSIONS,
  RASTER_UPLOAD_REJECT_MESSAGE,
} from "@syntax-stories/shared";
import { cn } from "@/lib/core/utils";

export const IMAGE_ACCEPT_RASTER: Accept = {
  ...RASTER_ACCEPT_EXTENSIONS,
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
      if (code === "file-too-large") {
        toast.error(`Image must be under ${maxMb}MB.`);
      } else if (code === "file-invalid-type") {
        toast.error(RASTER_UPLOAD_REJECT_MESSAGE);
      } else {
        toast.error("Could not use this file.");
      }
    },
  });
  return (
    <div
      {...getRootProps()}
      className={cn(className, isDragActive && dragActiveClassName)}
    >
      <input {...getInputProps({ className: "sr-only" })} />
      {children}
    </div>
  );
}
