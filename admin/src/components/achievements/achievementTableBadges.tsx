'use client';

import { Box, alpha, useTheme } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import {
  CATEGORY_LABELS,
  MODULE_LABELS,
  type AchievementCategory,
  type AchievementModule,
} from '@/lib/achievements/achievementCatalogAdmin';
import { AdminStatusBadge, type AdminStatusBadgeTone } from '@/components/ui/AdminStatusBadge';

const MODULE_META: Record<
  AchievementModule,
  { Icon: SvgIconComponent; tone: AdminStatusBadgeTone }
> = {
  profile: { Icon: PersonRoundedIcon, tone: 'primary' },
  blog: { Icon: ArticleRoundedIcon, tone: 'info' },
  reading: { Icon: MenuBookRoundedIcon, tone: 'info' },
  social: { Icon: GroupsRoundedIcon, tone: 'success' },
  engagement: { Icon: ThumbUpAltRoundedIcon, tone: 'warning' },
  meta: { Icon: HubRoundedIcon, tone: 'neutral' },
};

const CATEGORY_META: Record<
  AchievementCategory,
  { Icon: SvgIconComponent; tone: AdminStatusBadgeTone }
> = {
  engagement: { Icon: ThumbUpAltRoundedIcon, tone: 'warning' },
  profile: { Icon: PersonRoundedIcon, tone: 'primary' },
  reading: { Icon: AutoStoriesRoundedIcon, tone: 'info' },
  social: { Icon: GroupsRoundedIcon, tone: 'success' },
  meta: { Icon: EmojiEventsRoundedIcon, tone: 'neutral' },
};

export function AchievementCatalogIconBadge({ active }: { active: boolean }) {
  const theme = useTheme();
  const color = active ? theme.palette.primary.main : theme.palette.text.secondary;

  return (
    <Box
      aria-hidden
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(color, active ? 0.35 : 0.2),
        bgcolor: alpha(color, active ? 0.12 : 0.06),
        color,
      }}
    >
      <EmojiEventsRoundedIcon sx={{ fontSize: 20 }} />
    </Box>
  );
}

export function AchievementModuleBadge({ module }: { module: AchievementModule }) {
  const meta = MODULE_META[module];
  const Icon = meta.Icon;
  return (
    <AdminStatusBadge
      label={MODULE_LABELS[module]}
      tone={meta.tone}
      icon={<Icon fontSize="inherit" />}
    />
  );
}

export function AchievementCategoryBadge({ category }: { category: AchievementCategory }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.Icon;
  return (
    <AdminStatusBadge
      label={CATEGORY_LABELS[category]}
      tone={meta.tone}
      icon={<Icon fontSize="inherit" />}
    />
  );
}

export function AchievementPointsBadge({ points }: { points: number }) {
  return (
    <AdminStatusBadge
      label={`+${points}`}
      tone="primary"
      emphasis
      icon={<StarsRoundedIcon fontSize="inherit" />}
    />
  );
}

export function AchievementActiveBadge({ active }: { active: boolean }) {
  return (
    <AdminStatusBadge
      label={active ? 'Active' : 'Hidden'}
      tone={active ? 'success' : 'neutral'}
      emphasis={active}
      icon={
        active ? (
          <VisibilityRoundedIcon fontSize="inherit" />
        ) : (
          <VisibilityOffRoundedIcon fontSize="inherit" />
        )
      }
    />
  );
}
