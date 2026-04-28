'use client';

import React from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Delete post"
      message={
        post ? (
          <>
            Move “{post.title.trim() || 'Untitled'}” to trash? It leaves the site immediately, but you can restore it
            from the Deleted tab for 7 days.
          </>
        ) : null
      }
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      loading={loading}
      onConfirm={() => {
        if (post) onConfirm(post);
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
      message={
        post ? (
          <>
            Open “{post.title.trim() || 'Untitled'}” in the write workspace? Your session will load this post without
            showing its id in the URL.
          </>
        ) : null
      }
      confirmLabel="Continue"
      cancelLabel="Cancel"
      variant="default"
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
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Delete forever"
      message={
        post ? (
          <>
            Permanently erase “{post.title.trim() || 'Untitled'}”? This cannot be undone. Only use this for posts
            already in trash.
          </>
        ) : null
      }
      confirmLabel="Delete forever"
      cancelLabel="Cancel"
      variant="danger"
      loading={loading}
      onConfirm={() => {
        if (post) onConfirm(post);
      }}
    />
  );
}
