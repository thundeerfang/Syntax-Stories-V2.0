'use client';

/**
 * Layout shell overlays (P4) — feedback dialog.
 * Co-located with layout/shell/LayoutShell.tsx.
 */


import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ImagePlus,
  MessageSquare,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  collectFeedbackClientMeta,
  fetchFeedbackCategories,
  fetchFeedbackQuota,
  submitFeedbackMultipart,
  FEEDBACK_MAX_IMAGE_BYTES,
  type FeedbackCategoryDto,
} from '@/api/feedback';
import { Button } from '@/components/ui';
import { FormDialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/feedback';
import { ImageUploadCropDialog } from '@/components/upload/ImageUploadCropDialog';
import { captureScreenToFeedbackFile } from '@/lib/media/captureScreenToFeedbackFile';
import { validateFeedbackAttachmentFile } from '@/lib/media/feedbackAttachmentClient';
import { buildUploadImageMeta } from '@/lib/media/uploadImageMeta';
import { cn } from '@/lib/core/utils';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { useUIStore } from '@/store/ui';

import {
  countFeedbackWords,
  FEEDBACK_MAX_DESC,
  FEEDBACK_MAX_SUBJECT,
  FEEDBACK_MIN_DESC_WORDS,
  isFeedbackFormSubmittable,
  validateFeedbackMessage,
  validateFeedbackSubject,
} from '@/lib/feedback/feedbackValidation';

/** Stable id so footer submit can target the form via `form` attribute. */
const FEEDBACK_FORM_ID = 'syntax-feedback-form';

const FEEDBACK_SUBTITLE =
  'Include a screenshot — capture or upload — so we can review your report.';

/** During tab/window capture, hide modal pixels so `getDisplayMedia` screenshots show the page behind. */
const FEEDBACK_CAPTURE_HIDE_UI_CLASS = 'invisible pointer-events-none';

/** Busy overlay: mirrors success step layout (icon, copy, full-width close). */
function FeedbackSuccessSubmitSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center px-6 py-5 text-center">
      <div className="flex w-full max-w-md flex-1 flex-col justify-center space-y-6 py-4">
        <Skeleton className="mx-auto size-14 shrink-0" />
        <div className="space-y-2">
          <Skeleton className="mx-auto h-4 w-52 max-w-[90%]" />
          <Skeleton className="mx-auto h-3 w-full" />
          <Skeleton className="mx-auto h-3 w-4/5 max-w-sm" />
        </div>
        <Skeleton className="h-14 w-full sm:h-[3.25rem]" />
      </div>
    </div>
  );
}

/** Category chips while API loads: same `h-9`, `gap-2`, varied widths like real labels. */
const CATEGORY_SKELETON_WIDTHS = ['w-[5.25rem]', 'w-28', 'w-24', 'w-[7.5rem]', 'w-20'] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

function FeedbackDialog({ open, onClose }: Readonly<Props>) {
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

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentImageTitle, setAttachmentImageTitle] = useState('');
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentSource, setAttachmentSource] = useState<'none' | 'capture' | 'upload'>('none');
  const [capturing, setCapturing] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [weeklyRemaining, setWeeklyRemaining] = useState<number | null>(null);

  const canSubmitFeedback = useMemo(
    () =>
      isFeedbackFormSubmittable({
        isAuthed,
        categoryId,
        categoriesLoading,
        subject,
        description,
        hasAttachment: Boolean(attachmentFile && attachmentFile.size > 0),
        weeklyRemaining,
        sessionPending,
        capturing,
        submitting,
      }),
    [
      attachmentFile,
      capturing,
      categoriesLoading,
      categoryId,
      description,
      isAuthed,
      sessionPending,
      subject,
      submitting,
      weeklyRemaining,
    ]
  );

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
    setWeeklyRemaining(null);

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

    if (token && user?.email) {
      void fetchFeedbackQuota(token)
        .then((q) => {
          if (!cancelled) setWeeklyRemaining(q.remaining);
        })
        .catch(() => {
          if (!cancelled) setWeeklyRemaining(null);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [open, token, user]);

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
  }, [categories, clearAttachment]);

  const applyAttachment = useCallback(
    (file: File, source: 'capture' | 'upload', title?: string) => {
      setAttachmentFile(file);
      setAttachmentSource(source);
      setAttachmentImageTitle(title ?? '');
      setAttachmentPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    []
  );

  const handleCropConfirm = useCallback(
    async (file: File) => {
      const v = await validateFeedbackAttachmentFile(file);
      if (!v.ok) {
        throw new Error(v.message);
      }
      const title = buildUploadImageMeta(file.name, user?.username ?? 'user').title;
      applyAttachment(file, 'upload', title);
    },
    [applyAttachment, user?.username]
  );

  const handleScreenCapture = useCallback(async () => {
    setCapturing(true);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      const file = await captureScreenToFeedbackFile();
      const v = await validateFeedbackAttachmentFile(file);
      if (!v.ok) {
        toast.error(v.message);
        return;
      }
      applyAttachment(file, 'capture', buildUploadImageMeta('Screen capture', user?.username ?? 'user').title);
    } catch (e) {
      const name =
        e && typeof e === 'object' && 'name' in e ? String((e as { name?: string }).name) : '';
      if (name === 'NotAllowedError' || name === 'AbortError') {
        toast.info('Capture cancelled.');
      } else {
        toast.error(e instanceof Error ? e.message : 'Screen capture failed.');
      }
    } finally {
      setCapturing(false);
    }
  }, [applyAttachment, user?.username]);

  const fieldClass =
    'w-full border-2 border-border bg-background px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors';

  const runSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!isAuthed || !token) {
        return;
      }

      if (!categoryId || categoriesLoading) {
        toast.error(categoriesLoading ? 'Loading categories…' : 'Choose a category.');
        return;
      }

      const sub = subject.trim();
      const desc = description.trim();

      const subjectErr = validateFeedbackSubject(sub);
      if (subjectErr) {
        toast.error(subjectErr);
        return;
      }
      const messageErr = validateFeedbackMessage(desc);
      if (messageErr) {
        toast.error(messageErr);
        return;
      }

      if (!attachmentFile || attachmentFile.size <= 0) {
        toast.error('Add a screenshot (capture or upload) before sending.');
        return;
      }

      if (weeklyRemaining != null && weeklyRemaining <= 0) {
        toast.error('You have reached the feedback limit for now. Try again later.');
        return;
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
            attachment: attachmentFile,
            attachmentTitle: attachmentImageTitle.trim() || undefined,
          },
          token
        );
        setEmailSent(Boolean(res.emailSent));
        setPhase('success');
        setWeeklyRemaining((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
        toast.success(res.message ?? 'Thanks for your feedback.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong.';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      attachmentFile,
      attachmentImageTitle,
      categoriesLoading,
      categoryId,
      description,
      isAuthed,
      sessionPending,
      subject,
      token,
      weeklyRemaining,
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
          disabled={!canSubmitFeedback}
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
        subtitleClassName="min-w-0 max-w-full text-[10px] sm:text-[11px] font-medium leading-snug tracking-wide text-muted-foreground sm:line-clamp-2 normal-case"
        panelClassName={cn(
          'max-w-[min(56rem,calc(100vw-1.25rem))] sm:max-w-[56rem]',
          capturing && FEEDBACK_CAPTURE_HIDE_UI_CLASS
        )}
        backdropClassName={capturing ? FEEDBACK_CAPTURE_HIDE_UI_CLASS : undefined}
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
          <form
            id={FEEDBACK_FORM_ID}
            onSubmit={runSubmit}
            className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:grid-rows-[auto_auto] lg:items-stretch lg:gap-x-8 lg:gap-y-6"
          >
            {/* Left: preview + capture / upload — on lg, column height matches category→subject block */}
            <aside className="order-first flex w-full max-w-[15rem] flex-col lg:col-start-1 lg:row-start-1 lg:max-w-none lg:h-full lg:min-h-0">
              <div className="flex min-h-[14rem] flex-1 flex-col border-2 border-border bg-muted/10 shadow lg:min-h-0">
                <p className="shrink-0 border-b-2 border-border bg-muted/30 px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  Attachment
                </p>
                <div className="relative min-h-[9rem] flex-1 border-b-2 border-dashed border-border/80 bg-background/50 lg:min-h-0">
                  {attachmentPreview ? (
                    <img
                      src={attachmentPreview}
                      alt={attachmentImageTitle.trim() || 'Screenshot preview'}
                      title={attachmentImageTitle.trim() || undefined}
                      className="absolute inset-0 size-full object-contain p-1"
                    />
                  ) : (
                    <div className="flex size-full min-h-[9rem] flex-col items-center justify-center gap-1 p-3 text-center lg:min-h-0">
                      <ImagePlus
                        className="size-7 text-muted-foreground/40"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <span className="text-[8px] font-bold uppercase leading-tight tracking-wide text-muted-foreground">
                        None yet
                      </span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 space-y-1.5 p-2">
                  <p
                    id="fb-screenshot-hint"
                    className="text-[8px] leading-snug text-muted-foreground"
                  >
                    Required — screen capture or upload. Max{' '}
                    {Math.round(FEEDBACK_MAX_IMAGE_BYTES / (1024 * 1024))} MB. Server scans
                    (malware) and re-encodes.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-9 w-full border-2 px-2 text-[9px] font-black uppercase tracking-wider"
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
                    className="h-9 w-full border-2 px-2 text-[9px] font-black uppercase tracking-wider"
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

            <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-1 lg:pt-0">
              <div className="space-y-2">
                <p
                  id="fb-category-label"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
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
                        <Skeleton key={`fb-cat-skeleton-${i}`} className={cn('h-9 ', w)} />
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
                            'whitespace-nowrap  border-2 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                            selected
                              ? 'border-primary bg-primary text-primary-foreground shadow'
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

              <div className="space-y-1.5">
                <label
                  htmlFor="fb-subject"
                  className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Subject
                </label>
                <input
                  id="fb-subject"
                  type="text"
                  maxLength={FEEDBACK_MAX_SUBJECT}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="min-w-0 space-y-4 lg:col-span-2 lg:row-start-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="fb-desc"
                  className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Message
                </label>
                <textarea
                  id="fb-desc"
                  rows={5}
                  maxLength={FEEDBACK_MAX_DESC}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className={cn(fieldClass, 'min-h-[120px] resize-y')}
                />
                <p className="text-[9px] text-muted-foreground">
                  {countFeedbackWords(description)}/{FEEDBACK_MIN_DESC_WORDS} words ·{' '}
                  {description.trim().length}/{FEEDBACK_MAX_DESC} characters
                </p>
              </div>
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
        confirmLabel="Attach"
        chooseAnotherLabel="Choose another"
        onConfirm={handleCropConfirm}
      />
    </>
  );
}

export function FeedbackDialogWrapper() {
  const open = useUIStore((s) => s.feedbackDialogOpen);
  const setOpen = useUIStore((s) => s.setFeedbackDialogOpen);
  const openAuthDialog = useAuthDialogStore((s) => s.open);
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const canShowFeedback = Boolean(token);

  useEffect(() => {
    if (!open || !isHydrated || canShowFeedback) return;
    setOpen(false);
    openAuthDialog('login');
  }, [open, isHydrated, canShowFeedback, openAuthDialog, setOpen]);

  return <FeedbackDialog open={open && canShowFeedback} onClose={() => setOpen(false)} />;
}
