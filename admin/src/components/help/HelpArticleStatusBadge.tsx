'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';

export function HelpArticleStatusBadge({
  status,
  isPublished,
}: {
  status: string;
  isPublished?: boolean;
}) {
  if (isPublished || status === 'published') {
    return (
      <AdminStatusBadge
        label="Published"
        tone="success"
        emphasis
        icon={<CheckCircleRoundedIcon fontSize="inherit" />}
      />
    );
  }
  if (status === 'scheduled') {
    return (
      <AdminStatusBadge
        label="Scheduled"
        tone="info"
        icon={<ScheduleRoundedIcon fontSize="inherit" />}
      />
    );
  }
  if (status === 'archived') {
    return (
      <AdminStatusBadge
        label="Archived"
        tone="neutral"
        icon={<Inventory2RoundedIcon fontSize="inherit" />}
      />
    );
  }
  return (
    <AdminStatusBadge
      label="Draft"
      tone="warning"
      icon={<EditNoteRoundedIcon fontSize="inherit" />}
    />
  );
}
