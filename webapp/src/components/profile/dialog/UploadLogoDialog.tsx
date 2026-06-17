"use client";
import { useId } from "react";
import {
  IMAGE_UPLOAD_MAX_BYTES,
  LOGO_ACCEPT_EXTENSIONS,
} from "@syntax-stories/shared";
import { Building2 } from "lucide-react";
import { ImageUploadCropDialog } from "@/components/upload/ImageUploadCropDialog";
import { toast } from "sonner";
import { uploadSettingsLogo } from "@/api/upload";
import { uploadResponseAlt } from "@/lib/media/uploadImageMeta";
export type SettingsLogoUploadKind = "org-logo";
export interface UploadLogoDialogProps {
  open: boolean;
  onClose: () => void;
  token: string;
  kind: SettingsLogoUploadKind;
  onSuccess: (result: { url: string; imageTitle?: string }) => void;
}
const TITLES: Record<SettingsLogoUploadKind, string> = {
  "org-logo": "Upload issuer logo",
};
export function UploadLogoDialog({
  open,
  onClose,
  token,
  kind,
  onSuccess,
}: Readonly<UploadLogoDialogProps>) {
  const titleId = useId();
  return (
    <ImageUploadCropDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={TITLES[kind]}
      titleIcon={
        <Building2 className="size-4 shrink-0 text-primary" aria-hidden />
      }
      subtitle="Square crop, then upload. JPEG, PNG, WebP, or iPhone photo (HEIC) · max 5 MB."
      subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
      maxSizeBytes={IMAGE_UPLOAD_MAX_BYTES.orgLogo}
      aspect={1}
      cropMinHeightClass="min-h-[12rem] h-48"
      accept={LOGO_ACCEPT_EXTENSIONS}
      validationProfile="logo"
      secondaryDropzoneHint="Square crop · iPhone photos supported"
      confirmLabel="Save & upload"
      chooseAnotherLabel="Choose another"
      panelClassName="max-w-md sm:max-w-lg"
      onConfirm={async (file) => {
        const data = await uploadSettingsLogo(token, file, kind, undefined);
        if (!data.url) throw new Error(data.message ?? "Upload failed");
        onSuccess({ url: data.url, imageTitle: uploadResponseAlt(data) });
        toast.success("Logo uploaded.");
      }}
    />
  );
}
