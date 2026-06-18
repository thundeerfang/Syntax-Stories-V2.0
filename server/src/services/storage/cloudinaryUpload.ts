import type { UploadApiResponse } from "cloudinary";
import { getCloudinaryClient } from "../../config/cloudinary.js";
import { env } from "../../config/env.js";
import { fileBaseNameFromOriginal } from "../../utils/uploadImageMeta.js";

export type CloudinaryUploadInput = {
  folderSuffix: string;
  publicIdPrefix: string;
  originalName?: string;
};

export function buildCloudinaryPublicId(
  prefix: string,
  originalName?: string,
): string {
  const base = fileBaseNameFromOriginal(originalName ?? prefix)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 9);
  const pieces = [prefix, stamp, rand, base].filter(Boolean);
  return pieces.join("-").slice(0, 180);
}

export function cloudinaryUploadFolder(folderSuffix: string): string {
  return [env.CLOUDINARY_UPLOAD_FOLDER, folderSuffix]
    .filter(Boolean)
    .join("/");
}

export async function uploadImageBufferToCloudinary(
  buffer: Buffer,
  input: CloudinaryUploadInput,
): Promise<UploadApiResponse> {
  const client = getCloudinaryClient();
  const folder = cloudinaryUploadFolder(input.folderSuffix);
  const publicId = buildCloudinaryPublicId(input.publicIdPrefix, input.originalName);

  return await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary upload returned no result."));
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}
