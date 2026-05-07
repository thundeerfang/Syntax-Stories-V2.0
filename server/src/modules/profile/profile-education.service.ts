import { profileRepository } from './profile.repository.js';

/** Assigns `eduId` / `refCode` when missing (education section). */
export async function normalizeEducation(userId: string, updates: Record<string, unknown>): Promise<void> {
  const education = updates.education as Array<{ eduId?: string; refCode?: string; [k: string]: unknown }> | undefined;
  if (!Array.isArray(education) || education.length === 0) return;

  const current = await profileRepository.findLeanByIdSelect(userId, 'education');
  const existingIds = (current?.education ?? [])
    .map((ed: { eduId?: string }) => (ed.eduId ?? '').trim())
    .filter(Boolean)
    .map((id) => Number.parseInt(id, 10))
    .filter((n) => !Number.isNaN(n));
  let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  const year = new Date().getFullYear();
  for (const ed of education) {
    const id = (ed.eduId ?? '').trim();
    if (id) {
      const n = Number.parseInt(id, 10);
      if (!Number.isNaN(n) && n >= nextNum) nextNum = n + 1;
    } else {
      ed.eduId = String(nextNum);
      nextNum += 1;
    }
    ed.refCode = `${year}_EDU_DOC`;
  }
  updates.education = education;
}
