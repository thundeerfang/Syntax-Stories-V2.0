'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';

export type BlogPostStatus = 'draft' | 'published' | 'suspended';

export function BlogPostStatusBadge({ status }: { status: BlogPostStatus }) {
  if (status === 'suspended') {
    return (
      <AdminStatusBadge
        label="Suspended"
        tone="warning"
        emphasis
        icon={<BlockRoundedIcon fontSize="inherit" />}
      />
    );
  }

  if (status === 'published') {
    return (
      <AdminStatusBadge
        label="Published"
        tone="success"
        emphasis
        icon={<CheckCircleRoundedIcon fontSize="inherit" />}
      />
    );
  }

  return (
    <AdminStatusBadge
      label="Draft"
      tone="neutral"
      icon={<EditNoteRoundedIcon fontSize="inherit" />}
    />
  );
}
