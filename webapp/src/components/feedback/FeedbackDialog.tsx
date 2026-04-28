'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { MessageSquare, CheckCircle2, ImagePlus, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { FormDialog } from '@/components/ui/FormDialog';
import { Button } from '@/components/ui';
import { ImageUploadCropDialog } from '@/components/upload/ImageUploadCropDialog';
import { useAuthStore } from '@/store/auth';
import { AltchaField, readAltchaPayload } from '@/features/auth';
import { getAltchaChallengeUrl } from '@/api/auth';
import {
  collectFeedbackClientMeta,
  fetchFeedbackCategories,
  submitFeedbackMultipart,
  FEEDBACK_MAX_IMAGE_BYTES,
  type FeedbackCategoryDto,
} from '@/api/feedback';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { validateFeedbackAttachmentFile } from '@/lib/feedbackAttachmentClient';
import { captureScreenToFeedbackFile } from '@/lib/captureScreenToFeedbackFile';

const MAX_FN = 80;
const MAX_LN = 80;
const MAX_EMAIL = 254;
const MAX_SUBJECT = 200;
const MAX_DESC = 5000;
const MIN_DESC = 10;

/** Stable id so footer submit can target the form via `form` attribute. */
const FEEDBACK_FORM_ID = 'syntax-feedback-form';

const FEEDBACK_SUBTITLE = "What's working, what isn't, or what you'd like next.";

/** Busy overlay: mirrors success step layout (icon, copy, full-width close). */
function FeedbackSuccessSubmitSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-6 py-5 text-center">
      <div className="flex w-full max-w-md flex-1 flex-col justify-center space-y-6 py-4">
        <Skeleton className="mx-auto size-14 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-52 max-w-[90%]" />
          <Skeleton className="mx-auto h-3 w-full" />
          <Skeleton className="mx-auto h-3 w-4/5 max-w-sm" />
        </div>
        <Skeleton className="h-14 w-full rounded-none sm:h-[3.25rem]" />
      </div>
    </div>
  );
}

/** Category chips while API loads: same `h-9`, `gap-2`, varied widths like real labels. */
const CATEGORY_SKELETON_WIDTHS = ['w-[5.25rem]', 'w-28', 'w-24', 'w-[7.5rem]', 'w-20'] as const;

function splitFullNameForForm(fullName: string): { firstName: string; lastName: string } {
  const t = fullName.trim();
  if (!t) return { firstName: '', lastName: '' };
  const parts = t.split(/\s+/);
  return {
    firstName: (parts[0] ?? '').slice(0, MAX_FN),
    lastName: (parts.slice(1).join(' ') || '').slice(0, MAX_LN),
  };
}

function validateEmail(s: string): boolean {
  if (!s || s.length > MAX_EMAIL) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FeedbackDialog({ open, onClose }: Readonly<Props>) {
  const titleId = useId();
  const cropTitleId = useId();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthed = Boolean(token && user?.email);
  const sessionPending = Boolean(token) && isHydrated && !user?.email;

  const [categories, setCategories] = useState<FeedbackCategoryDto[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentImageTitle, setAttachmentImageTitle] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  /** At most one image: browser screen capture vs file upload (server: ClamAV + re-encode). */
  const [attachmentSource, setAttachmentSource] = useState<'none' | 'capture' | 'upload'>('none');
  const [capturing, setCapturing] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const altchaOn = Boolean(getAltchaChallengeUrl()) && !isAuthed;

  useEffect(() => {
    return () => {
      if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    };
  }, [attachmentPreview]);

  useEffect(() => {
    if (!open) return;
    setPhase('form');
    setEmailSent(null);
    setSubject('');
    setDescription('');
    setAttachmentFile(null);
    setAttachmentImageTitle('');
    setAttachmentSource('none');
    setAttachmentPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCropDialogOpen(false);
    setCategoryId('');
    if (user) {
      const sp = user.fullName ? splitFullNameForForm(user.fullName) : { firstName: '', lastName: '' };
      setFirstName(sp.firstName);
      setLastName(sp.lastName);
      setEmail((user.email ?? '').slice(0, MAX_EMAIL));
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
    }

    let cancelled = false;
    setCategoriesLoading(true);
    void fetchFeedbackCategories()
      .then((rows) => {
        if (cancelled) return;
        setCategories(rows);
        setCategoryId(rows[0]?.id ?? '');
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Could not load categories.');
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const clearAttachment = useCallback(() => {
    setAttachmentFile(null);
    setAttachmentImageTitle('');
    setAttachmentSource('none');
    setAttachmentPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const clearFormFields = useCallback(() => {
    setSubject('');
    setDescription('');
    setCropDialogOpen(false);
    clearAttachment();
    setCategoryId(categories[0]?.id ?? '');
    if (isAuthed && user) {
      const sp = user.fullName ? splitFullNameForForm(user.fullName) : { firstName: '', lastName: '' };
      setFirstName(sp.firstName);
      setLastName(sp.lastName);
      setEmail((user.email ?? '').slice(0, MAX_EMAIL));
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
    }
  }, [categories, clearAttachment, isAuthed, user]);

  const applyAttachment = useCallback((file: File, source: 'capture' | 'upload', title?: string) => {
    setAttachmentFile(file);
    setAttachmentSource(source);
    setAttachmentImageTitle(title ?? '');
    setAttachmentPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleCropConfirm = useCallback(
    async (file: File, meta?: { imageTitle?: string }) => {
      const v = await validateFeedbackAttachmentFile(file);
      if (!v.ok) {
        throw new Error(v.message);
      }
      applyAttachment(file, 'upload', meta?.imageTitle ?? '');
    },
    [applyAttachment]
  );

  const handleScreenCapture = useCallback(async () => {
    setCapturing(true);
    try {
      const file = await captureScreenToFeedbackFile();
      const v = await validateFeedbackAttachmentFile(file);
      if (!v.ok) {
        toast.error(v.message);
        return;
      }
      applyAttachment(file, 'capture', 'Screen capture');
    } catch (e) {
      const name = e && typeof e === 'object' && 'name' in e ? String((e as { name?: string }).name) : '';
      if (name === 'NotAllowedError' || name === 'AbortError') {
        toast.info('Capture cancelled.');
      } else {
        toast.error(e instanceof Error ? e.message : 'Screen capture failed.');
      }
    } finally {
      setCapturing(false);
    }
  }, [applyAttachment]);

  const fieldClass =
    'w-full border-2 border-border bg-background px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors';

  const runSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;

      if (!categoryId || categoriesLoading) {
        toast.error(categoriesLoading ? 'Loading categories…' : 'Choose a category.');
        return;
      }

      const sub = subject.trim();
      const desc = description.trim();
      const fn = firstName.trim();
      const ln = lastName.trim();
      const em = email.trim().toLowerCase();

      if (sub.length < 1 || sub.length > MAX_SUBJECT) {
        toast.error(`Subject must be 1–${MAX_SUBJECT} characters.`);
        return;
      }
      if (desc.length < MIN_DESC || desc.length > MAX_DESC) {
        toast.error(`Message must be ${MIN_DESC}–${MAX_DESC} characters.`);
        return;
      }

      let altchaPayload: string | undefined;
      if (!isAuthed) {
        if (fn.length < 1 || fn.length > MAX_FN) {
          toast.error(`First name must be 1–${MAX_FN} characters.`);
          return;
        }
        if (ln.length < 1 || ln.length > MAX_LN) {
          toast.error(`Last name must be 1–${MAX_LN} characters.`);
          return;
        }
        if (!validateEmail(em)) {
          toast.error('Enter a valid email address.');
          return;
        }
        altchaPayload = altchaOn ? readAltchaPayload(form) : undefined;
        if (altchaOn && !altchaPayload) {
          toast.error('Complete the verification check below.');
          return;
        }
      }

      if (sessionPending) {
        toast.error('Still loading your account. Try again in a moment.');
        return;
      }

      setSubmitting(true);
      try {
        const clientMeta = collectFeedbackClientMeta();
        const res = await submitFeedbackMultipart(
          {
            categoryId,
            subject: sub,
            description: desc,
            clientMeta,
            ...(isAuthed
              ? {}
              : { firstName: fn, lastName: ln, email: em, altcha: altchaPayload }),
            attachment: attachmentFile,
            attachmentTitle: attachmentImageTitle.trim() || undefined,
          },
          token
        );
        setEmailSent(Boolean(res.emailSent));
        setPhase('success');
        toast.success(res.message ?? 'Thanks for your feedback.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      altchaOn,
      attachmentFile,
      attachmentImageTitle,
      categoriesLoading,
      categoryId,
      description,
      email,
      firstName,
      isAuthed,
      lastName,
      sessionPending,
      subject,
      token,
    ]
  );

  const formFooter =
    phase === 'form' ? (
      <>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 min-h-12 shrink-0 border-2 px-5 text-xs font-black uppercase tracking-widest"
          onClick={clearFormFields}
          disabled={submitting || sessionPending || capturing}
        >
          Clear
        </Button>
        <Button
          id="fb-submit"
          type="submit"
          form={FEEDBACK_FORM_ID}
          size="lg"
          className="h-12 min-h-12 shrink-0 border-2 px-5 text-xs font-black uppercase tracking-widest"
          disabled={submitting || sessionPending || capturing || categoriesLoading || !categoryId}
        >
          {submitting ? 'Sending…' : 'Send feedback'}
        </Button>
      </>
    ) : null;

  return (
    <>
    <FormDialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="Feedback"
      titleIcon={<MessageSquare className="size-5" strokeWidth={2.5} aria-hidden />}
      subtitle={FEEDBACK_SUBTITLE}
      subtitleClassName="min-w-0 max-w-full text-[10px] sm:text-[11px] font-medium leading-tight tracking-wide text-muted-foreground line-clamp-1 normal-case"
      panelClassName="max-w-[min(42rem,calc(100vw-1.5rem))] sm:max-w-[42rem]"
      footer={formFooter}
      footerClassName="flex flex-row flex-wrap items-center justify-end gap-2"
      interactionLock={submitting}
      interactionLockContent={submitting ? <FeedbackSuccessSubmitSkeleton /> : undefined}
    >
      {sessionPending && phase === 'form' && (
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Loading your account…
        </p>
      )}
      {phase === 'success' ? (
        <div className="space-y-6 text-center py-4">
          <CheckCircle2 className="mx-auto size-14 text-primary" strokeWidth={2} aria-hidden />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">We received your message.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {emailSent === false
                ? 'Your feedback was saved. Email notification could not be sent automatically; our team can still read it in the dashboard.'
                : 'Thank you for helping improve Syntax Stories.'}
            </p>
          </div>
          <Button
            type="button"
            className="w-full py-6 text-xs font-black uppercase tracking-widest"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      ) : (
        <form id={FEEDBACK_FORM_ID} onSubmit={runSubmit} className="flex flex-col gap-6 lg:grid lg:grid-cols-[12.25rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          {/* Left: preview + one-of capture / upload (retro panel) */}
          <aside className="order-first flex w-full max-w-[13rem] flex-col gap-3 lg:mx-0 lg:max-w-none lg:shrink-0">
            <div className="border-2 border-border bg-muted/10 shadow-[3px_3px_0_0_var(--border)]">
              <p className="border-b-2 border-border bg-muted/30 px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                Attachment
              </p>
              <div className="relative aspect-square w-full border-b-2 border-dashed border-border/80 bg-background/50">
                {attachmentPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachmentPreview}
                    alt={attachmentImageTitle.trim() || 'Screenshot preview'}
                    title={attachmentImageTitle.trim() || undefined}
                    className="size-full object-contain p-1"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-1 p-3 text-center">
                    <ImagePlus className="size-7 text-muted-foreground/40" strokeWidth={1.5} aria-hidden />
                    <span className="text-[8px] font-bold uppercase leading-tight tracking-wide text-muted-foreground">
                      None yet
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 p-2">
                <p id="fb-screenshot-hint" className="text-[8px] leading-snug text-muted-foreground">
                  One optional image — Chrome screen share or upload. Max{' '}
                  {Math.round(FEEDBACK_MAX_IMAGE_BYTES / (1024 * 1024))} MB. Server scans (malware) and re-encodes.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-9 w-full border-2 rounded-none px-2 text-[9px] font-black uppercase tracking-wider"
                  onClick={() => void handleScreenCapture()}
                  disabled={capturing || submitting || sessionPending}
                  aria-describedby="fb-screenshot-hint"
                >
                  <Monitor className="mr-1.5 inline size-3.5 shrink-0 opacity-80" aria-hidden />
                  {capturing ? 'Capturing…' : 'Capture screen'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-9 w-full border-2 rounded-none px-2 text-[9px] font-black uppercase tracking-wider"
                  onClick={() => setCropDialogOpen(true)}
                  disabled={capturing || submitting || sessionPending}
                  aria-describedby="fb-screenshot-hint"
                >
                  <ImagePlus className="mr-1.5 inline size-3.5 shrink-0 opacity-80" aria-hidden />
                  Upload image
                </Button>
                {attachmentFile && (
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="w-full border-2 border-dashed border-border py-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    Remove image
                  </button>
                )}
                {attachmentSource !== 'none' && (
                  <p className="text-center text-[7px] font-mono font-bold uppercase tracking-tighter text-primary/80">
                    {attachmentSource === 'capture' ? 'Source: capture' : 'Source: upload'}
                  </p>
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-4 lg:pt-0">
          <div className="space-y-2">
            <p id="fb-category-label" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Category
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby="fb-category-label"
            >
              {categoriesLoading && categories.length === 0 ? (
                <div
                  className="flex flex-wrap gap-2"
                  aria-busy="true"
                  aria-label="Loading categories"
                >
                  {CATEGORY_SKELETON_WIDTHS.map((w, i) => (
                    <Skeleton key={`fb-cat-skeleton-${i}`} className={cn('h-9 rounded-none', w)} />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  No categories available.
                </span>
              ) : (
                categories.map((c) => {
                  const selected = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={categoriesLoading}
                      onClick={() => setCategoryId(c.id)}
                      className={cn(
                        'rounded-none border-2 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--border)]'
                          : 'border-border bg-card text-foreground hover:border-primary hover:bg-muted/40',
                        categoriesLoading && 'pointer-events-none opacity-50'
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="fb-fn" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                First name
              </label>
              <input
                id="fb-fn"
                type="text"
                autoComplete="given-name"
                maxLength={MAX_FN}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                readOnly={isAuthed}
                required={!isAuthed}
                className={cn(fieldClass, isAuthed && 'opacity-90 cursor-not-allowed bg-muted/40')}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fb-ln" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Last name
              </label>
              <input
                id="fb-ln"
                type="text"
                autoComplete="family-name"
                maxLength={MAX_LN}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                readOnly={isAuthed}
                required={!isAuthed}
                className={cn(fieldClass, isAuthed && 'opacity-90 cursor-not-allowed bg-muted/40')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fb-email" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Email
            </label>
            <input
              id="fb-email"
              type="email"
              autoComplete="email"
              maxLength={MAX_EMAIL}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={isAuthed}
              required={!isAuthed}
              className={cn(fieldClass, isAuthed && 'opacity-90 cursor-not-allowed bg-muted/40')}
            />
            {isAuthed && (
              <p className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">
                Signed in — contact details match your account.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fb-subject" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Subject
            </label>
            <input
              id="fb-subject"
              type="text"
              maxLength={MAX_SUBJECT}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="fb-desc" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Message
            </label>
            <textarea
              id="fb-desc"
              rows={5}
              maxLength={MAX_DESC}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={MIN_DESC}
              className={cn(fieldClass, 'min-h-[120px] resize-y')}
            />
            <p className="text-[9px] text-muted-foreground">
              {description.trim().length}/{MAX_DESC} · minimum {MIN_DESC} characters
            </p>
          </div>

          {altchaOn && (
            <div className="flex w-full flex-col gap-2">
              <AltchaField enabled floating="bottom" floatingAnchor="#fb-submit" floatingOffset={8} />
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Verification required when not signed in.
              </p>
            </div>
          )}
          </div>
        </form>
      )}
    </FormDialog>

    <ImageUploadCropDialog
      open={cropDialogOpen}
      onClose={() => setCropDialogOpen(false)}
      titleId={cropTitleId}
      title="Screenshot"
      titleIcon={<ImagePlus className="size-5" strokeWidth={2.5} aria-hidden />}
      subtitle={`Square crop · max ${Math.round(FEEDBACK_MAX_IMAGE_BYTES / (1024 * 1024))} MB`}
      subtitleClassName="min-w-0 max-w-full text-[10px] sm:text-[11px] font-medium leading-tight tracking-wide text-muted-foreground line-clamp-1 normal-case"
      maxSizeBytes={FEEDBACK_MAX_IMAGE_BYTES}
      aspect={1}
      imageTitleField
      imageTitleLabel="Title (optional)"
      imageTitlePlaceholder="e.g. Settings page, billing section"
      confirmLabel="Attach"
      chooseAnotherLabel="Choose another"
      onConfirm={handleCropConfirm}
    />
    </>
  );
}
