import { createElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlignLeft,
  Award,
  BookOpen,
  Camera,
  Code2,
  Github,
  Heart,
  Image,
  Layers,
  MessageSquare,
  Monitor,
  PenLine,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import type { AchievementCategory } from '@/contracts/achievementsApi';

/** Slug → icon for catalog badges (swap for custom assets later via same slot). */
export const ACHIEVEMENT_ICON_BY_SLUG: Record<string, LucideIcon> = {
  'everyone-gets-one': Heart,
  'daily-syntax-readit': Sparkles,
  'daily-syntax-reader': BookOpen,
  'daily-syntax-author': PenLine,
  'profile-picture': Camera,
  'background-banner': Image,
  'bio-complete': AlignLeft,
  'github-connected': Github,
  'stack-and-tools': Code2,
  'my-setup': Monitor,
  'follow-three-authors': Users,
  'follow-three-categories': Layers,
  'squad-up': Shield,
  'first-feedback': MessageSquare,
  'invite-one-friend': Users,
  'invite-five-friends': Users,
  'invite-ten-friends': Award,
};

export function resolveAchievementIcon(slug: string): LucideIcon {
  return ACHIEVEMENT_ICON_BY_SLUG[slug] ?? Award;
}

type AchievementSlugIconProps = Readonly<{
  slug: string;
  className?: string;
  strokeWidth?: number;
}>;

/** Renders a catalog icon without assigning a component variable during render. */
export function AchievementSlugIcon({ slug, className, strokeWidth }: AchievementSlugIconProps) {
  return createElement(resolveAchievementIcon(slug), { className, strokeWidth });
}

export const ACHIEVEMENT_CATEGORY_LABEL: Record<AchievementCategory, string> = {
  engagement: 'Engagement',
  profile: 'Profile',
  reading: 'Reading',
  social: 'Social',
  meta: 'Writing',
};

export const ACHIEVEMENT_CATEGORY_TILE: Record<
  AchievementCategory,
  { tile: string; badge: string }
> = {
  engagement: {
    tile: 'border-primary/45 bg-primary/10 text-primary',
    badge: 'border-primary/30 bg-primary/5 text-primary',
  },
  profile: {
    tile: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    badge: 'border-violet-500/25 bg-violet-500/5 text-violet-700 dark:text-violet-300',
  },
  reading: {
    tile: 'border-amber-500/45 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    badge: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  },
  social: {
    tile: 'border-sky-500/45 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    badge: 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300',
  },
  meta: {
    tile: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    badge: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  },
};
