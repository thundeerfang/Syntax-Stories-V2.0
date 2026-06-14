"use client";

import { useId } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { ImageUploadCropDialog } from "@/components/upload/ImageUploadCropDialog";
import { uploadAvatar } from "@/api/upload";
import { uploadResponseAlt } from "@/lib/media/uploadImageMeta";
import { PROFILE_RASTER_IMAGE_MAX_MB } from "@/variable";

export interface UploadProfilePicDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  onSuccess: (result: {
    url: string;
    blurDataUrl?: string;
    alt?: string;
    title?: string;
  }) => void;
}

export function UploadProfilePicDialog({
  open,
  onClose,
  token,
  onSuccess,
}: Readonly<UploadProfilePicDialogProps>) {
  const titleId = useId();

  return (
    <ImageUploadCropDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="Upload profile photo"
      titleIcon={<Camera className="size-4 shrink-0 text-primary" aria-hidden />}
      subtitle={`JPEG, PNG, GIF or WebP. Max ${PROFILE_RASTER_IMAGE_MAX_MB}MB.`}
      subtitleClassName="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
      maxSizeBytes={PROFILE_RASTER_IMAGE_MAX_MB * 1024 * 1024}
      aspect={1}
      confirmLabel="Save & upload"
      chooseAnotherLabel="Choose another"
      panelClassName="max-w-sm sm:max-w-md"
      onConfirm={async (file) => {
        const data = await uploadAvatar(token, file);
        if (!data.url) throw new Error(data.message ?? "Upload failed");
        onSuccess({
          url: data.url,
          blurDataUrl: data.blurDataUrl,
          alt: uploadResponseAlt(data),
          title: data.title,
        });
        toast.success("Profile photo updated.");
      }}
    />
  );
}
