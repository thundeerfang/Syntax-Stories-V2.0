import type { IncompleteItemHints, ProfileUpdateSection } from '@/api/auth';
import type { CompleteItemDialogSection } from '@/features/profile';

export type ActivityTab = 'posts' | 'replies' | 'repost';

export function activityTabLabel(tab: ActivityTab): string {
  if (tab === 'posts') return 'Posts';
  if (tab === 'replies') return 'Replies';
  return 'Repost';
}

export function filterIncompleteHintsAfterIndex(
  prev: IncompleteItemHints | null,
  section: CompleteItemDialogSection,
  index: number,
): IncompleteItemHints | null {
  if (!prev) return null;
  const list = prev[section];
  if (!list?.length) return prev;
  const next = list.filter((_, i) => i !== index);
  if (next.length === 0) {
    const o = { ...prev };
    delete o[section];
    return Object.keys(o).length ? o : null;
  }
  return { ...prev, [section]: next };
}

export function incompleteHintsBlockingCount(h: IncompleteItemHints | null): number {
  if (!h) return 0;
  return (
    (h.education?.length ?? 0) +
    (h.certifications?.length ?? 0) +
    (h.workExperiences?.length ?? 0)
  );
}

export function completeItemSectionToSettingsId(section: CompleteItemDialogSection): string {
  if (section === 'workExperiences') return 'work-experiences';
  if (section === 'education') return 'education';
  if (section === 'certifications') return 'certifications';
  return 'projects';
}

export const COMPLETE_ITEM_PROFILE_SECTION: Record<CompleteItemDialogSection, ProfileUpdateSection> = {
  workExperiences: 'work',
  education: 'education',
  certifications: 'certifications',
  projects: 'projects',
};
