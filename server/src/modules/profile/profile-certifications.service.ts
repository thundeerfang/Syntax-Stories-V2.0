import { profileRepository } from './profile.repository';

/** Assigns `certId` / `certValType` when missing (certifications section). */
export async function normalizeCertifications(userId: string, updates: Record<string, unknown>): Promise<void> {
  const certifications = updates.certifications as Array<{ certId?: string; certValType?: string; [k: string]: unknown }> | undefined;
  if (!Array.isArray(certifications) || certifications.length === 0) return;

  const current = await profileRepository.findLeanByIdSelect(userId, 'certifications');
  const existingIds = (current?.certifications ?? [])
    .map((c: { certId?: string }) => (c.certId ?? '').trim())
    .filter(Boolean)
    .map((id) => Number.parseInt(id, 10))
    .filter((n) => !Number.isNaN(n));
  let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  const year = new Date().getFullYear();
  const yearSuffix = String(year).slice(-2);
  const baseValType = `A-${yearSuffix}`;

  for (const cert of certifications) {
    const id = (cert.certId ?? '').trim();
    if (!id) {
      cert.certId = String(nextNum);
      nextNum += 1;
    } else {
      const n = Number.parseInt(id, 10);
      if (!Number.isNaN(n) && n >= nextNum) nextNum = n + 1;
    }
    if (!cert.certValType || !String(cert.certValType).trim()) {
      cert.certValType = baseValType;
    }
  }
  updates.certifications = certifications;
}
