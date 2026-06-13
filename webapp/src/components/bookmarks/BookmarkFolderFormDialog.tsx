'use client';

import { Bookmark } from 'lucide-react';
import { Dialog, DIALOG_Z_INDEX_STACKED } from '@/components/ui/dialog';
import { BookmarkFolderEmojiPicker } from './BookmarkFolderEmojiPicker';

export type BookmarkFolderFormValues = {
  name: string;
  emoji: string;
  makeDefault: boolean;
};

type BookmarkFolderFormDialogProps = Readonly<{
  open: boolean;
  mode: 'create' | 'edit';
  submitting: boolean;
  values: BookmarkFolderFormValues;
  onClose: () => void;
  onChange: (patch: Partial<BookmarkFolderFormValues>) => void;
  onSubmit: () => void;
  /** Hide default checkbox when editing the folder that is already default. */
  showMakeDefault?: boolean;
}>;

export function BookmarkFolderFormDialog({
  open,
  mode,
  submitting,
  values,
  onClose,
  onChange,
  onSubmit,
  showMakeDefault = true,
}: BookmarkFolderFormDialogProps) {
  const isCreate = mode === 'create';
  const titleId = isCreate ? 'bookmark-new-folder-title' : 'bookmark-edit-folder-title';

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      titleId={titleId}
      title={isCreate ? 'New folder' : 'Edit folder'}
      description={
        isCreate
          ? 'Name your folder and pick an emoji from the list.'
          : 'Update the folder name or emoji.'
      }
      titleIcon={<Bookmark strokeWidth={2.25} />}
      panelClassName="max-w-md"
      contentClassName="px-6 pb-6 pt-2"
      showCloseButton={true}
      zIndex={DIALOG_Z_INDEX_STACKED}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="bookmark-folder-name"
            className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            Folder name
          </label>
          <input
            id="bookmark-folder-name"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Research"
            maxLength={80}
            disabled={submitting}
            className="w-full border-2 border-border bg-background px-3 py-2 font-mono text-xs outline-none ring-primary focus-visible:ring-2 disabled:opacity-50"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Emoji (optional)
          </span>
          <BookmarkFolderEmojiPicker
            id="bookmark-folder-emoji"
            value={values.emoji}
            onChange={(emoji) => onChange({ emoji })}
            disabled={submitting}
          />
        </div>
        {showMakeDefault && isCreate ? (
          <label className="flex cursor-pointer items-start gap-3 border-2 border-border bg-muted/20 px-3 py-2.5">
            <input
              type="checkbox"
              checked={values.makeDefault}
              onChange={(e) => onChange({ makeDefault: e.target.checked })}
              disabled={submitting}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="text-left text-xs leading-snug text-foreground">
              <span className="font-bold">Default folder</span>
              <span className="block text-muted-foreground">
                New bookmarks from your feed and story pages save here unless you pick another
                folder.
              </span>
            </span>
          </label>
        ) : null}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="border-2 border-border bg-background px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wide shadow transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !values.name.trim()}
            onClick={onSubmit}
            className="border-2 border-border bg-primary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            {submitting ? (isCreate ? 'Creating…' : 'Saving…') : isCreate ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
