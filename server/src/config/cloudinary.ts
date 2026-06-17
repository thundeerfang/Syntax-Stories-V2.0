import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

let configured = false;

function missingConfigNames(): string[] {
  return [
    ["CLOUDINARY_CLOUD_NAME", env.CLOUDINARY_CLOUD_NAME],
    ["CLOUDINARY_API_KEY", env.CLOUDINARY_API_KEY],
    ["CLOUDINARY_API_SECRET", env.CLOUDINARY_API_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

export function getCloudinaryClient(): typeof cloudinary {
  const missing = missingConfigNames();
  if (missing.length > 0) {
    throw new Error(
      `Cloudinary is not configured. Set ${missing.join(", ")} in the environment.`,
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}
