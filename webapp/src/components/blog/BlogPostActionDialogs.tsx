'use client';

import React from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DeleteConfirmDialog } from '@/components/ui/delete';
import type { BlogPostResponse } from '@/api/blog';

type BlogPostDeleteDialogProps = Readonly<{
  post: BlogPostResponse | null;
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (post: BlogPostResponse) => void;
}>;

export function BlogPostDeleteDialog({
  post,
  open,
  loading = false,
  onClose,
  onConfirm,
}: BlogPostDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      titleId="blog-post-delete-dialog-title"
      title="Delete post"
      description={
        post ? (
          <>
            Move “{post.title.trim() || 'Untitled'}” to trash? It leaves the site immediately, but you can restore it
            from the Deleted tab for 7 days.
          </>
        ) : undefined
      }
      confirmLabel="Delete"
      confirming={loading}
      onConfirm={() => {
        if (post) void onConfirm(post);
      }}
    />
  );
}

type BlogPostEditNavigationDialogProps = Readonly<{
  post: BlogPostResponse | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (post: BlogPostResponse) => void;
}>;

export function BlogPostEditNavigationDialog({
  post,
  open,
  onClose,
  onConfirm,
}: BlogPostEditNavigationDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Open editor"
      variant="default"
      confirmLabel="Continue"
      cancelLabel="Cancel"
      defaultFocusConfirm
      message={
        post ? (
          <>
            Open “{post.title.trim() || 'Untitled'}” in the write workspace? Your draft loads in this session while the
            address bar stays on{' '}
            <span className="font-mono font-bold text-foreground/90">/blogs/write</span>
            —the post id is not shown in the URL.
          </>
        ) : null
      }
      onConfirm={() => {
        if (post) onConfirm(post);
      }}
    />
  );
}

type BlogPostPurgePermanentDialogProps = Readonly<{
  post: BlogPostResponse | null;
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (post: BlogPostResponse) => void;
}>;

export function BlogPostPurgePermanentDialog({
  post,
  open,
  loading = false,
  onClose,
  onConfirm,
}: BlogPostPurgePermanentDialogProps) {
  return (
    <DeleteConfirmDialog
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      titleId="blog-post-purge-dialog-title"
      title="Delete forever"
      description={
        post ? (
          <>
            Permanently erase “{post.title.trim() || 'Untitled'}”? This cannot be undone. Only use this for posts
            already in trash.
          </>
        ) : undefined
      }
      confirmLabel="Delete forever"
      confirming={loading}
      onConfirm={() => {
        if (post) void onConfirm(post);
      }}
    />
  );
}
