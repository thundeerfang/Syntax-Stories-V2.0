import {
  IMAGE_UPLOAD_MAX_BYTES,
  validateImageFileClient,
  type ImageFileValidationResult,
} from "@syntax-stories/shared";

export type FeedbackAttachmentValidation = ImageFileValidationResult;

export async function validateFeedbackAttachmentFile(
  file: File,
): Promise<FeedbackAttachmentValidation> {
  return validateImageFileClient(file, {
    profile: "feedback",
    maxBytes: IMAGE_UPLOAD_MAX_BYTES.feedback,
  });
}
