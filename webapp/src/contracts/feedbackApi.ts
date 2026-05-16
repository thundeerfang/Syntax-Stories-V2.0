/**
 * Feedback JSON API — `/api/feedback/*`.
 * Keep in sync with `server/src/routes/feedback.routes.ts`.
 */

export const FEEDBACK_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type FeedbackClientMeta = {
  pageUrl?: string;
  referrer?: string;
  language?: string;
  languages?: string;
  platform?: string;
  userAgent?: string;
  screen?: string;
  timezone?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: string;
};

export type FeedbackCategoryDto = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  active: boolean;
  isSystemSeed: boolean;
  createdByLabel: string;
  updatedByLabel: string;
  createdAtIst: string;
  updatedAtIst: string;
};

export type SubmitFeedbackResponse = {
  success: boolean;
  message?: string;
  emailSent?: boolean;
};

export type SubmitFeedbackMultipartParams = {
  categoryId: string;
  subject: string;
  description: string;
  clientMeta?: FeedbackClientMeta;
  firstName?: string;
  lastName?: string;
  email?: string;
  altcha?: string;
  attachment?: File | null;
  attachmentTitle?: string | null;
};
