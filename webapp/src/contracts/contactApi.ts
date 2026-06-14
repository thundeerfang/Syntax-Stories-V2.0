/**
 * Contact form JSON API — `POST /api/contact`.
 * Keep in sync with `server/src/routes/contact.routes.ts`.
 */

import type { FeedbackClientMeta } from "./feedbackApi";

export type SubmitContactParams = {
  fullName?: string;
  email?: string;
  company?: string;
  topic: string;
  message: string;
  altcha?: string;
  clientMeta?: FeedbackClientMeta;
};

export type SubmitContactResponse = {
  success: boolean;
  id?: string;
  message?: string;
};
