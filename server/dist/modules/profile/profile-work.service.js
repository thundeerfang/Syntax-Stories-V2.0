import { profileRepository } from './profile.repository.js';
/** Assigns numeric `workId` values when missing (work section). */
export async function normalizeWorkExperiences(userId, updates) {
    const workExperiences = updates.workExperiences;
    if (!Array.isArray(workExperiences) || workExperiences.length === 0)
        return;
    const current = await profileRepository.findLeanByIdSelect(userId, 'workExperiences');
    const existingIds = (current?.workExperiences ?? [])
        .map((we) => (we.workId ?? '').trim())
        .filter(Boolean)
        .map((id) => Number.parseInt(id, 10))
        .filter((n) => !Number.isNaN(n));
    let nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    for (const we of workExperiences) {
        const id = (we.workId ?? '').trim();
        if (id) {
            const n = Number.parseInt(id, 10);
            if (!Number.isNaN(n) && n >= nextNum)
                nextNum = n + 1;
        }
        else {
            we.workId = String(nextNum);
            nextNum += 1;
        }
    }
    updates.workExperiences = workExperiences;
}
//# sourceMappingURL=profile-work.service.js.map