import type { ComponentType } from 'react';
import { FileText, MessageSquare, Repeat2 } from 'lucide-react';

export type ActivityTab = 'posts' | 'replies' | 'repost';

export const ACTIVITY_TAB_META: Record<
  ActivityTab,
  { label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }> }
> = {
  posts: { label: 'Posts', icon: FileText },
  replies: { label: 'Replies', icon: MessageSquare },
  repost: { label: 'Repost', icon: Repeat2 },
};

export function activityTabLabel(tab: ActivityTab): string {
  return ACTIVITY_TAB_META[tab].label;
}
