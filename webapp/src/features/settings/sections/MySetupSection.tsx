'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Monitor, Wrench, ImagePlus, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { settingsBtnBlockPrimaryMd } from '@/app/settings/buttonStyles';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { ImageUploadCropDialog } from '@/components/upload';
import { uploadMedia } from '@/api/upload';
import { type SetupItem as MySetupItem } from '@/app/settings/settings-list/MySetupCard';
import {
  SettingsSectionHeading,
  SettingsTabPanel,
  SettingsTabRoot,
} from '@/app/settings/settings-list/SettingsSectionHeading';

export function MySetupContent() {
  const { user, updateProfile, token } = useSettingsAuthSlice();
  const [items, setItems] = useState<MySetupItem[]>((user as any)?.mySetup ?? []);
  const [saving, setSaving] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftProductUrl, setDraftProductUrl] = useState('');
  const [draftImageUrl, setDraftImageUrl] = useState('');
  const [draftImageAlt, setDraftImageAlt] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const canSaveDraft = Boolean(draftLabel.trim()) && Boolean(draftImageUrl.trim());

  const normalizeUrl = (raw: string) => {
    const v = (raw ?? '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const onAddOrUpdate = async () => {
    if (!canSaveDraft) return;
    const nextItem = {
      label: draftLabel.trim().slice(0, 80),
      imageUrl: draftImageUrl.trim().slice(0, 500),
      productUrl: normalizeUrl(draftProductUrl).slice(0, 500),
      imageAlt: draftImageAlt.trim().slice(0, 120) || undefined,
    };
    if (editIndex !== null && items[editIndex]) {
      const e = items[editIndex];
      const same =
        nextItem.label === (e.label ?? '').trim() &&
        nextItem.imageUrl === (e.imageUrl ?? '').trim() &&
        nextItem.productUrl === normalizeUrl(e.productUrl ?? '').slice(0, 500) &&
        (nextItem.imageAlt ?? '') === ((e as { imageAlt?: string }).imageAlt ?? '').trim();
      if (same) {
        toast.error('No changes to save.', { id: 'syntax-no-changes' });
        return;
      }
    }
    const next = [...items];
    if (editIndex !== null) next[editIndex] = nextItem;
    else next.push(nextItem);

    setSaving(true);
    try {
      await updateProfile({ mySetup: next.slice(0, 5) } as any, { section: 'setup' });
      setItems(next.slice(0, 5));
      setDraftLabel('');
      setDraftImageUrl('');
      setDraftImageAlt('');
      setDraftProductUrl('');
      setEditIndex(null);
      toast.success('My Setup updated.', { id: 'syntax-setup-success' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update setup.', {
        id: 'syntax-setup-error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={<Wrench />}
        title="My Setup"
        description="Configure your physical workstation components (max 5 slots)."
      />
      <SettingsTabPanel>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Label
              </label>
              <input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder='Ex: LG UltraWide 34"'
                className="w-full p-3 border-2 border-border bg-muted/20 font-bold text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Source Link
              </label>
              <input
                value={draftProductUrl}
                onChange={(e) => setDraftProductUrl(e.target.value)}
                placeholder="https://amazon.com/..."
                className="w-full p-3 border-2 border-border bg-muted/20 font-bold text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all group"
            >
              {draftImageUrl ? (
                <div className="size-10 border-2 border-primary overflow-hidden">
                  <img
                    src={draftImageUrl}
                    alt={draftImageAlt.trim() || draftLabel.trim() || 'Component preview'}
                    title={draftImageAlt.trim() || undefined}
                    className="size-full object-cover"
                  />
                </div>
              ) : (
                <ImagePlus className="size-5 text-muted-foreground group-hover:text-primary" />
              )}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {draftImageUrl ? 'Replace Component Image' : 'Upload Component Image'}
              </span>
            </button>

            <div className="flex-1" />

            {editIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditIndex(null);
                  setDraftLabel('');
                  setDraftImageUrl('');
                  setDraftImageAlt('');
                  setDraftProductUrl('');
                }}
                className="text-[10px] font-black uppercase tracking-widest underline underline-offset-4 hover:text-primary"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              disabled={!canSaveDraft || (items.length >= 5 && editIndex === null)}
              onClick={onAddOrUpdate}
              className={cn(
                settingsBtnBlockPrimaryMd,
                'w-full md:w-auto px-10 py-3 text-xs tracking-widest'
              )}
            >
              {saving ? 'PROCESSING...' : editIndex !== null ? 'Updating Changes' : 'Save Changes'}
            </button>
          </div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {items.map((it, idx) => (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative border-4 border-border bg-card shadow hover:border-primary transition-colors overflow-hidden"
                >
                  <div className="aspect-video relative overflow-hidden border-b-4 border-border">
                    <img
                      src={it.imageUrl}
                      alt={(it as { imageAlt?: string }).imageAlt?.trim() || it.label}
                      title={(it as { imageAlt?: string }).imageAlt?.trim() || undefined}
                      className="size-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute top-2 left-2 px-2 py-1 bg-background/90 text-foreground border border-border text-[8px] font-black tracking-widest">
                      SLOT_0{idx + 1}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-black uppercase truncate">{it.label}</h4>
                    <div className="flex items-center gap-4 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditIndex(idx);
                          setDraftLabel(it.label);
                          setDraftImageUrl(it.imageUrl);
                          setDraftImageAlt((it as { imageAlt?: string }).imageAlt ?? '');
                          setDraftProductUrl(it.productUrl || '');
                        }}
                        className="p-2 border-2 border-border hover:bg-muted transition-colors"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = items.filter((_, i) => i !== idx);
                          setSaving(true);
                          updateProfile({ mySetup: next } as any, { section: 'setup' })
                            .then(() => {
                              setItems(next);
                              toast.success('Component removed.');
                            })
                            .catch((e) => {
                              toast.error(
                                e instanceof Error ? e.message : 'Failed to remove component.'
                              );
                            })
                            .finally(() => setSaving(false));
                        }}
                        className="p-2 border-2 border-border hover:text-destructive hover:border-destructive transition-colors"
                      >
                        <Trash2 className="size-3" />
                      </button>
                      {it.productUrl && (
                        <a
                          href={it.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-primary"
                        >
                          LINK <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {items.length === 0 && (
              <div className="col-span-full py-12 border-4 border-dashed border-border bg-muted/5 flex flex-col items-center justify-center">
                <Monitor className="size-12 text-muted-foreground/30 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Hardware inventory empty.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </SettingsTabPanel>

      <ImageUploadCropDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        titleId="my-setup-component-crop"
        title="Component image"
        titleIcon={<ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />}
        subtitle="16∶9 crop · max 5 MB · uploads when you mount the component."
        subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
        maxSizeBytes={5 * 1024 * 1024}
        aspect={16 / 9}
        cropMinHeightClass="min-h-[12rem] h-48"
        imageTitleField
        imageTitleLabel="Title (optional)"
        confirmLabel="Use image"
        onConfirm={async (file, meta) => {
          if (!token) throw new Error('Not signed in.');
          const data = await uploadMedia(token, file);
          if (!data.url) throw new Error(data.message ?? 'Upload failed');
          setDraftImageUrl(data.url);
          const alt = meta?.imageTitle?.trim();
          if (alt) setDraftImageAlt(alt);
          else setDraftImageAlt('');
          toast.success('Image ready.');
        }}
      />
    </SettingsTabRoot>
  );
}
