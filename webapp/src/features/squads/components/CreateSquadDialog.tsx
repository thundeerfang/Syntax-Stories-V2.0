'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Image as ImageIcon, ImagePlus, Lock, UsersRound } from 'lucide-react';
import type { Accept } from 'react-dropzone';
import { FormDialog } from '@/components/ui/dialog';
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
const HANDLE_MAX = 40;
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
  const [handle, setHandle] = useState('');
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
      setHandle(initialSquad.handle ?? initialSquad.slug);
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
    setHandle('');
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
    setHandle('');
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
            ? 'Update how this squad looks and how members can participate. Your handle and public/private type stay fixed.'
            : 'Create a group where you can learn and interact privately with other developers around topics that matter to you.'
        }
        subtitleClassName={isEdit ? undefined : 'line-clamp-1 min-w-0'}
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <UsersRound className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            <p className="text-[11px] font-medium leading-snug">
              Squad members appear together in feeds and shared spaces—your group has its own
              identity and rules.
            </p>
          </div>

          <section className="grid gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Squad details
            </h3>
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
            {isEdit ? (
              <label className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                    Squad handle
                  </span>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    {handle.replace(/^@+/, '').length}/{HANDLE_MAX}
                  </span>
                </div>
                <input
                  value={handle}
                  readOnly
                  maxLength={HANDLE_MAX}
                  className="cursor-not-allowed border-2 border-border bg-background px-3 py-2 text-sm font-medium opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="text-[10px] text-muted-foreground">
                  Handle is permanent for this squad.
                </p>
              </label>
            ) : (
              <p className="text-[10px] leading-snug text-muted-foreground">
                Your squad URL slug is assigned automatically from the name when you create it—you
                cannot choose it here.
              </p>
            )}
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
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Group icon
            </h3>
            <button
              type="button"
              onClick={() => setLogoCropOpen(true)}
              className={cn(
                'flex w-full flex-col items-stretch gap-3 border-2 border-dashed border-border bg-muted/15 px-4 py-4 text-left transition-colors hover:border-primary hover:bg-muted/25',
                iconUrl && 'border-solid'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden border-2 border-border bg-background">
                  {iconUrl ? (
                    <img
                      src={resolveSquadMediaSrc(iconUrl)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImagePlus
                      className="size-7 text-muted-foreground"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">
                    Choose logo for the group icon
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Square crop · JPEG, PNG, WebP, or GIF · max 2 MB. Optional.
                  </p>
                </div>
              </div>
            </button>
            {iconUrl ? (
              <button
                type="button"
                className="w-fit text-[10px] font-bold uppercase tracking-wide text-destructive underline"
                onClick={() => setIconUrl(undefined)}
              >
                Remove logo
              </button>
            ) : null}
          </section>

          <section className="grid gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Squad banner
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Wide cover behind the squad header. Optional — uses the gradient when empty.
            </p>
            {bannerPreviewSrc ? (
              <div className="overflow-hidden border-2 border-border">
                <img src={bannerPreviewSrc} alt="" className="max-h-36 w-full object-cover" />
              </div>
            ) : (
              <div
                className="h-24 w-full border-2 border-dashed border-border bg-muted/20"
                aria-hidden
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-mono text-[10px] font-black uppercase tracking-widest"
                onClick={() => setBannerCropOpen(true)}
              >
                <ImageIcon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                Upload banner
              </Button>
              {bannerUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-mono text-[10px] font-black uppercase tracking-widest"
                  onClick={() => setBannerUrl(null)}
                >
                  Remove banner
                </Button>
              ) : null}
            </div>
          </section>

          <section className="grid gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Squad type
            </h3>
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
            {isEdit ? (
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Visibility cannot be changed after creation.
              </p>
            ) : null}
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

          <section className="grid gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-foreground">
              <Lock className="size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Moderation settings
              </h3>
            </div>

            <div className="grid gap-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                Post content
              </p>
              <p className="text-[11px] text-muted-foreground">
                Choose who may publish new posts or share into this squad.
              </p>
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
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                Invitation permissions
              </p>
              <p className="text-[11px] text-muted-foreground">
                Who may add other people to this squad by username.
              </p>
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
