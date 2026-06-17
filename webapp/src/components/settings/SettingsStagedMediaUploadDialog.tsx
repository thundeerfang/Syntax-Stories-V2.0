"use client";

import { useId } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { ImageUploadCropDialog } from "@/components/upload";
import { buildUploadImageMeta } from "@/lib/media/uploadImageMeta";
import type { MediaItem } from "@/lib/profile/profileMediaForm";

import { IMAGE_UPLOAD_MAX_BYTES } from "@syntax-stories/shared";

export type SettingsStagedMediaUploadDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  titleId: string;
  subtitle: string;
  username?: string | null;
  onStaged: (item: MediaItem) => void;
}>;

export function SettingsStagedMediaUploadDialog({
  open,
  onClose,
  titleId,
  subtitle,
  username,
  onStaged,
}: SettingsStagedMediaUploadDialogProps) {
  const fallbackTitleId = useId();

  return (
    <ImageUploadCropDialog
      open={open}
      onClose={onClose}
      titleId={titleId || fallbackTitleId}
      title="Upload media"
      titleIcon={
        <ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />
      }
      subtitle={subtitle}
      subtitleClassName="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
      maxSizeBytes={IMAGE_UPLOAD_MAX_BYTES.media}
      aspect={1}
      confirmLabel="Save & add"
      chooseAnotherLabel="Choose another"
      onConfirm={async (file) => {
        const url = URL.createObjectURL(file);
        const title = buildUploadImageMeta(
          file.name,
          username ?? "user",
        ).title;
        onStaged({
          url,
          title,
          isPending: true,
          pendingFile: file,
        });
        toast.success("Media staged. It will upload when you save.");
      }}
    />
  );
}
