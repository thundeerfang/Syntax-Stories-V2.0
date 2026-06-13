export const FEEDBACK_MIN_DESC_WORDS = 20;
export const FEEDBACK_MAX_SUBJECT = 200;
export const FEEDBACK_MAX_DESC = 5000;
export const FEEDBACK_WEEKLY_MAX = 5;

export function countFeedbackWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function validateFeedbackSubject(subject: string): string | null {
  const sub = subject.trim();
  if (!sub) return 'Subject is required.';
  if (sub.length > FEEDBACK_MAX_SUBJECT) {
    return `Subject must be at most ${FEEDBACK_MAX_SUBJECT} characters.`;
  }
  return null;
}

export function validateFeedbackMessage(message: string): string | null {
  const desc = message.trim();
  if (!desc) return 'Message is required.';
  if (desc.length > FEEDBACK_MAX_DESC) {
    return `Message must be at most ${FEEDBACK_MAX_DESC} characters.`;
  }
  const words = countFeedbackWords(desc);
  if (words < FEEDBACK_MIN_DESC_WORDS) {
    return `Message must be at least ${FEEDBACK_MIN_DESC_WORDS} words (${words} so far).`;
  }
  return null;
}

export function isFeedbackFormSubmittable(params: {
  isAuthed: boolean;
  categoryId: string;
  categoriesLoading: boolean;
  subject: string;
  description: string;
  hasAttachment: boolean;
  weeklyRemaining: number | null;
  sessionPending: boolean;
  capturing: boolean;
  submitting: boolean;
}): boolean {
  if (!params.isAuthed) return false;
  if (params.submitting || params.sessionPending || params.capturing) return false;
  if (params.categoriesLoading || !params.categoryId.trim()) return false;
  if (!params.hasAttachment) return false;
  if (params.weeklyRemaining != null && params.weeklyRemaining <= 0) return false;
  if (validateFeedbackSubject(params.subject)) return false;
  if (validateFeedbackMessage(params.description)) return false;
  return true;
}
