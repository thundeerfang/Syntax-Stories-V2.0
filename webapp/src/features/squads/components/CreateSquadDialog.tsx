'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Image as ImageIcon, ImagePlus, Trash2, UsersRound } from 'lucide-react';
import type { Accept } from 'react-dropzone';
import { FormDialog, InfoHintDialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageUploadCropDialog } from '@/components/upload/ImageUploadCropDialog';
import { Switch } from '@/components/retroui/Switch';
import {
  squadsApi,
  type SquadCategory,
  type SquadInvitePermission,
  type SquadPostPolicy,
  type SquadSummary,
  type SquadVisibility,
} from '@/api/squads';
import { SQUAD_CATEGORIES, SQUAD_CATEGORY_LABEL } from '@/lib/squads/squadCategory';
import { uploadCover, uploadMedia } from '@/api/upload';
import { toast } from 'sonner';
import { cn } from '@/lib/core/utils';

const NAME_MAX = 100;
const DESC_MAX = 500;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const BANNER_MAX_BYTES = 10 * 1024 * 1024;

const LOGO_ACCEPT: Accept = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

function resolveSquadMediaSrc(url: string | null | undefined): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:')) return t;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}${t.startsWith('/') ? '' : '/'}${t}`;
}

type SquadFormMode = 'create' | 'edit';

type CreateSquadDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  accessToken: string;
  mode?: SquadFormMode;
  /** When `mode` is `edit`, prefills the form. */
  initialSquad?: SquadSummary | null;
  onCreated?: (slug: string) => void;
  onUpdated?: (squad: SquadSummary) => void;
}>;

export function CreateSquadDialog({
  open,
  onClose,
  accessToken,
  mode = 'create',
  initialSquad = null,
  onCreated,
  onUpdated,
}: CreateSquadDialogProps) {
  const cropTitleId = useId();
  const bannerCropTitleId = useId();
  const isEdit = mode === 'edit' && initialSquad != null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [descOpen, setDescOpen] = useState(false);
  const [iconUrl, setIconUrl] = useState<string | undefined>();
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerCropOpen, setBannerCropOpen] = useState(false);
  const [visibility, setVisibility] = useState<SquadVisibility>('public');
  const [postPolicy, setPostPolicy] = useState<SquadPostPolicy>('all_members');
  const [invitePermission, setInvitePermission] = useState<SquadInvitePermission>('all_members');
  const [requirePostApproval, setRequirePostApproval] = useState(false);
  const [category, setCategory] = useState<SquadCategory>('web');
  const [busy, setBusy] = useState(false);
  /** Avoid re-hydrating while the dialog stays open (parent may refresh `squad` by reference). */
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      hydratedKeyRef.current = null;
      return;
    }
    const sessionKey = isEdit && initialSquad ? `edit:${String(initialSquad._id)}` : 'create';
    if (hydratedKeyRef.current === sessionKey) return;
    hydratedKeyRef.current = sessionKey;

    if (isEdit && initialSquad) {
      setName(initialSquad.name);
      setDescription(initialSquad.description ?? '');
      setDescOpen(Boolean(initialSquad.description?.trim()));
      setIconUrl(initialSquad.iconUrl);
      setBannerUrl(initialSquad.coverBannerUrl ?? null);
      setVisibility(initialSquad.visibility);
      setPostPolicy(initialSquad.postPolicy);
      setInvitePermission(initialSquad.invitePermission ?? 'all_members');
      setRequirePostApproval(initialSquad.requirePostApproval === true);
      setCategory(
        initialSquad.visibility === 'public' && initialSquad.category
          ? initialSquad.category
          : 'web'
      );
      return;
    }
    setName('');
    setDescription('');
    setDescOpen(false);
    setIconUrl(undefined);
    setBannerUrl(null);
    setVisibility('public');
    setPostPolicy('all_members');
    setInvitePermission('all_members');
    setRequirePostApproval(false);
    setCategory('web');
  }, [open, isEdit, initialSquad]);

  useEffect(() => {
    if (open && description.trim()) setDescOpen(true);
  }, [open, description]);

  const reset = () => {
    setName('');
    setDescription('');
    setDescOpen(false);
    setIconUrl(undefined);
    setBannerUrl(null);
    setVisibility('public');
    setPostPolicy('all_members');
    setInvitePermission('all_members');
    setRequirePostApproval(false);
    setCategory('web');
  };

  const handleClose = () => {
    if (!busy) {
      reset();
      onClose();
    }
  };

  const submitCreate = async () => {
    const n = name.trim();
    if (!n) {
      toast.error('Name is required');
      return;
    }
    setBusy(true);
    try {
      const { squad, inviteToken } = await squadsApi.create(
        {
          name: n,
          description: description.trim(),
          iconUrl,
          ...(bannerUrl?.trim() ? { coverBannerUrl: bannerUrl.trim() } : {}),
          visibility,
          ...(visibility === 'public' ? { category } : {}),
          postPolicy,
          requirePostApproval,
          invitePermission,
        },
        accessToken
      );
      if (visibility === 'private' && inviteToken) {
        void navigator.clipboard.writeText(inviteToken).then(
          () => toast.success('Private squad created — invite code copied'),
          () =>
            toast.success('Private squad created', {
              description: `Save this invite code: ${inviteToken}`,
            })
        );
      } else {
        toast.success('Squad created');
      }
      reset();
      onClose();
      onCreated?.(squad.slug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create squad');
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!initialSquad) return;
    const n = name.trim();
    if (!n) {
      toast.error('Name is required');
      return;
    }
    setBusy(true);
    try {
      const { squad } = await squadsApi.patch(
        initialSquad.slug,
        {
          name: n,
          description: description.trim(),
          iconUrl: iconUrl ?? null,
          coverBannerUrl: bannerUrl,
          postPolicy,
          requirePostApproval,
          invitePermission,
          ...(visibility === 'public' ? { category } : {}),
        },
        accessToken
      );
      toast.success('Squad updated');
      reset();
      onClose();
      onUpdated?.(squad);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update squad');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (isEdit) void submitEdit();
    else void submitCreate();
  };

  const bannerPreviewSrc = resolveSquadMediaSrc(bannerUrl);
  const iconPreviewSrc = resolveSquadMediaSrc(iconUrl);

  const mediaIconBtn =
    'inline-flex size-8 shrink-0 items-center justify-center border-2 border-white/50 bg-black/60 text-white backdrop-blur-sm transition-colors hover:border-primary';

  const mediaDeleteBtn =
    'inline-flex size-8 shrink-0 items-center justify-center border-2 border-red-400/70 bg-red-950/80 text-red-300 backdrop-blur-sm transition-colors hover:border-red-400 hover:bg-red-900/90 hover:text-red-200';

  const bannerOverlayClass =
    'pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 transition-opacity duration-150 group-hover/banner:pointer-events-auto group-hover/banner:opacity-100 group-focus-within/banner:pointer-events-auto group-focus-within/banner:opacity-100';

  const iconOverlayClass =
    'pointer-events-none absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity duration-150 group-hover/icon:pointer-events-auto group-hover/icon:opacity-100 group-focus-within/icon:pointer-events-auto group-focus-within/icon:opacity-100';

  return (
    <>
      <FormDialog
        open={open}
        onClose={handleClose}
        title={isEdit ? 'Edit squad' : 'Create new Squad'}
        titleId={isEdit ? 'edit-squad-title' : 'create-squad-title'}
        titleIcon={<UsersRound className="h-5 w-5 text-primary" strokeWidth={2.5} aria-hidden />}
        subtitle={
          isEdit
            ? 'Update look and rules. Visibility stays fixed.'
            : 'Create a group where you can learn and interact with other developers around topics that matter to you.'
        }
        subtitleClassName="line-clamp-1 min-w-0 truncate whitespace-nowrap"
        interactionLock={busy}
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" loading={busy} onClick={() => void submit()}>
              {isEdit ? 'Save changes' : 'Create squad'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <section className="relative -mx-6 -mt-5">
            <div className="relative pb-12">
              <div className="group/banner relative h-28 w-full overflow-hidden border-b-2 border-border sm:h-32">
                {bannerPreviewSrc ? (
                  <>
                    <img src={bannerPreviewSrc} alt="" className="h-full w-full object-cover" />
                    <div className={bannerOverlayClass}>
                      <button
                        type="button"
                        className={mediaIconBtn}
                        aria-label="Change banner"
                        onClick={() => setBannerCropOpen(true)}
                      >
                        <ImageIcon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={mediaDeleteBtn}
                        aria-label="Delete banner"
                        onClick={() => setBannerUrl(null)}
                      >
                        <Trash2 className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBannerCropOpen(true)}
                    className="relative flex h-full w-full items-center justify-center bg-muted/25 transition-colors hover:bg-muted/35"
                    aria-label="Upload squad banner"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      No image selected
                    </span>
                    <div className={bannerOverlayClass}>
                      <span className={mediaIconBtn} aria-hidden>
                        <ImagePlus className="size-4 shrink-0" strokeWidth={2} />
                      </span>
                    </div>
                  </button>
                )}
              </div>

              <div className="absolute left-1/2 top-28 z-30 size-20 -translate-x-1/2 -translate-y-1/2 sm:top-32">
                <div
                  className={cn(
                    'group/icon relative size-20 overflow-hidden border-2 border-border bg-muted',
                    !iconPreviewSrc && 'cursor-pointer'
                  )}
                  role={iconPreviewSrc ? undefined : 'button'}
                  tabIndex={iconPreviewSrc ? undefined : 0}
                  onClick={() => {
                    if (!iconPreviewSrc) setLogoCropOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (!iconPreviewSrc && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setLogoCropOpen(true);
                    }
                  }}
                >
                  {iconPreviewSrc ? (
                    <img
                      src={iconPreviewSrc}
                      alt=""
                      className="absolute inset-0 block size-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex size-full items-center justify-center bg-muted/50"
                      aria-hidden
                    >
                      <UsersRound
                        className="size-9 text-muted-foreground/45"
                        strokeWidth={1.5}
                      />
                    </div>
                  )}
                  <div className={iconOverlayClass}>
                    {iconPreviewSrc ? (
                      <>
                        <button
                          type="button"
                          className={mediaIconBtn}
                          aria-label="Change squad icon"
                          onClick={() => setLogoCropOpen(true)}
                        >
                          <ImageIcon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={mediaDeleteBtn}
                          aria-label="Delete squad icon"
                          onClick={() => setIconUrl(undefined)}
                        >
                          <Trash2 className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={mediaIconBtn}
                        aria-label="Upload squad icon"
                        onClick={() => setLogoCropOpen(true)}
                      >
                        <ImagePlus className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            <label className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Name your Squad
                </span>
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                  {name.length}/{NAME_MAX}
                </span>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                className="border-2 border-border bg-background px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="e.g. Node.js developers"
              />
            </label>
            {!descOpen ? (
              <button
                type="button"
                className="w-fit text-left text-xs font-bold text-primary underline decoration-2 underline-offset-2"
                onClick={() => setDescOpen(true)}
              >
                + Add description (recommended)
              </button>
            ) : (
              <label className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                    Description
                  </span>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    {description.length}/{DESC_MAX}
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={DESC_MAX}
                  className="resize-y border-2 border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="What is this squad about?"
                />
              </label>
            )}
          </section>

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Squad type
              </h3>
              <InfoHintDialog title={isEdit ? 'Squad visibility' : 'Squad type'}>
                {isEdit ? (
                  <>
                    <p>
                      Visibility cannot be changed after creation. Your squad stays public or
                      private for its lifetime.
                    </p>
                    <p>
                      Public squads appear in the directory and are open for anyone to join. Private
                      squads are invite-only and hidden from browse lists.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Public squads are searchable, listed in the squad directory, and open for
                      everyone to join — best for communities and creators.
                    </p>
                    <p>
                      Private squads are invite-only and hidden from the directory — best for teams
                      and smaller groups.
                    </p>
                    <p>Visibility is permanent once the squad is created.</p>
                  </>
                )}
              </InfoHintDialog>
            </div>
            <div
              className={cn(
                'grid gap-2 sm:grid-cols-2',
                isEdit && 'pointer-events-none opacity-60'
              )}
              aria-hidden={isEdit}
            >
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={cn(
                  'border-2 p-3 text-left transition-colors',
                  visibility === 'public'
                    ? 'border-primary bg-primary/10 shadow'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <p className="text-sm font-black text-foreground">Public</p>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  Searchable, listed in the squad directory, and open for everyone to join. Ideal
                  for communities and creators.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={cn(
                  'border-2 p-3 text-left transition-colors',
                  visibility === 'private'
                    ? 'border-primary bg-primary/10 shadow'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <p className="text-sm font-black text-foreground">Private</p>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  Invite-only, hidden from the directory—best for teams and smaller groups who
                  collaborate privately.
                </p>
              </button>
            </div>
            {visibility === 'public' ? (
              <div className="grid gap-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Squad category <span className="text-destructive">*</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Public squads must pick one topic for the directory.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SQUAD_CATEGORIES.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'border-2 px-2.5 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest transition-colors',
                        category === id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:border-primary/50'
                      )}
                      onClick={() => setCategory(id)}
                    >
                      {SQUAD_CATEGORY_LABEL[id]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid gap-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Post content
                </p>
                <InfoHintDialog title="Post content">
                  <p>
                    Choose who may publish new posts or share existing posts into this squad feed.
                  </p>
                  <p>
                    <span className="font-bold text-foreground">All members</span> — anyone in the
                    squad can author new posts or share into the feed.
                  </p>
                  <p>
                    <span className="font-bold text-foreground">Staff only</span> — only admins and
                    moderators can post or share; other members can still read and engage.
                  </p>
                </InfoHintDialog>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPostPolicy('all_members')}
                  className={cn(
                    'border-2 p-3 text-left transition-colors',
                    postPolicy === 'all_members'
                      ? 'border-primary bg-primary/10 shadow'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="text-sm font-bold">All members</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Anyone in the squad can post and share.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPostPolicy('staff_only')}
                  className={cn(
                    'border-2 p-3 text-left transition-colors',
                    postPolicy === 'staff_only'
                      ? 'border-primary bg-primary/10 shadow'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="text-sm font-bold">Staff only</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Only admins and moderators can post or share.
                  </p>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-2 border-border bg-muted/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Require post approval</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  When on, new posts can be held for moderator review before publishing (stored for
                  a future workflow).
                </p>
              </div>
              <Switch
                checked={requirePostApproval}
                onCheckedChange={setRequirePostApproval}
                disabled={busy}
                className="shrink-0"
                aria-label="Require post approval"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Invitation permissions
                </p>
                <InfoHintDialog title="Invitation permissions">
                  <p>Choose who may add other people to this squad by username.</p>
                  <p>
                    <span className="font-bold text-foreground">All members</span> — any member can
                    invite others by username.
                  </p>
                  <p>
                    <span className="font-bold text-foreground">Staff only</span> — only admins and
                    moderators can add members; regular members cannot send invites.
                  </p>
                </InfoHintDialog>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInvitePermission('all_members')}
                  className={cn(
                    'border-2 p-3 text-left transition-colors',
                    invitePermission === 'all_members'
                      ? 'border-primary bg-primary/10 shadow'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="text-sm font-bold">All members</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Any member can invite others.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setInvitePermission('staff_only')}
                  className={cn(
                    'border-2 p-3 text-left transition-colors',
                    invitePermission === 'staff_only'
                      ? 'border-primary bg-primary/10 shadow'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="text-sm font-bold">Staff only</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Only admins and moderators can add members.
                  </p>
                </button>
              </div>
            </div>
          </section>
        </div>
      </FormDialog>

      <ImageUploadCropDialog
        open={logoCropOpen}
        onClose={() => setLogoCropOpen(false)}
        titleId={cropTitleId}
        title="Squad icon"
        titleIcon={<ImagePlus className="size-5 text-primary" strokeWidth={2.5} aria-hidden />}
        subtitle="Square crop for the group icon · max 2 MB"
        subtitleClassName="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        maxSizeBytes={LOGO_MAX_BYTES}
        aspect={1}
        cropMinHeightClass="min-h-[12rem] h-48"
        accept={LOGO_ACCEPT}
        secondaryDropzoneHint="Square crop, then upload"
        confirmLabel="Use as squad icon"
        chooseAnotherLabel="Choose another"
        panelClassName="max-w-md sm:max-w-lg"
        onConfirm={async (file) => {
          const up = await uploadMedia(accessToken, file);
          if (!up.url) throw new Error(up.message ?? 'Upload failed');
          setIconUrl(up.url);
          toast.success('Group icon ready');
        }}
      />

      <ImageUploadCropDialog
        open={bannerCropOpen}
        onClose={() => setBannerCropOpen(false)}
        titleId={bannerCropTitleId}
        title="Upload cover image"
        titleIcon={<ImageIcon className="size-5 text-primary" strokeWidth={2.5} aria-hidden />}
        subtitle="JPEG, PNG, GIF or WebP. Max 10 MB."
        subtitleClassName="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
        maxSizeBytes={BANNER_MAX_BYTES}
        aspect={4}
        cropMinHeightClass="min-h-[20rem] h-80"
        secondaryDropzoneHint="Wide banner crop, then upload"
        confirmLabel="Save & upload"
        chooseAnotherLabel="Choose another"
        panelClassName="max-w-md sm:max-w-lg"
        onConfirm={async (file) => {
          const data = await uploadCover(accessToken, file);
          if (!data.url) throw new Error(data.message ?? 'Upload failed');
          setBannerUrl(data.url);
          toast.success(isEdit ? 'Banner added — save changes to apply' : 'Banner ready');
        }}
      />
    </>
  );
}
