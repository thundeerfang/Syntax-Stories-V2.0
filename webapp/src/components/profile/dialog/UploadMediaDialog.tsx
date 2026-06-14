"use client";

import { useId } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { ImageUploadCropDialog } from "@/components/upload/ImageUploadCropDialog";
import { uploadMedia, type CropArea } from "@/api/upload";
import { uploadResponseAlt } from "@/lib/media/uploadImageMeta";
import { PROFILE_RASTER_IMAGE_MAX_MB } from "@/variable";

export interface UploadMediaDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: (item: {
    url: string;
    title?: string;
    alt?: string;
    blurDataUrl?: string;
    isPending?: boolean;
    pendingFile?: File;
    pendingCrop?: CropArea;
  }) => void;
  mode?: "immediate" | "staged";
}

export function UploadMediaDialog({
  open,
  onClose,
  token,
  onSuccess,
  mode = "immediate",
}: Readonly<UploadMediaDialogProps>) {
  const titleId = useId();

  return (
    <ImageUploadCropDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="Upload media"
      titleIcon={
        <ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />
      }
      subtitle={`Crop to thumbnail. JPEG, PNG, GIF or WebP. Max ${PROFILE_RASTER_IMAGE_MAX_MB} MB.`}
      subtitleClassName="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
      maxSizeBytes={PROFILE_RASTER_IMAGE_MAX_MB * 1024 * 1024}
      aspect={1}
      confirmLabel={mode === "staged" ? "Save & add" : "Save & upload"}
      chooseAnotherLabel="Choose another"
      panelClassName="max-w-md sm:max-w-lg"
      onConfirm={async (file) => {
        if (mode === "staged") {
          const url = URL.createObjectURL(file);
          onSuccess({
            url,
            isPending: true,
            pendingFile: file,
          });
          toast.success("Media staged. It will upload when you save.");
          return;
        }
        const data = await uploadMedia(token, file);
        if (!data.url) throw new Error(data.message ?? "Upload failed");
        const alt = uploadResponseAlt(data);
        onSuccess({
          url: data.url,
          title: alt,
          alt,
          blurDataUrl: data.blurDataUrl,
        });
        toast.success("Media added.");
      }}
    />
  );
}
