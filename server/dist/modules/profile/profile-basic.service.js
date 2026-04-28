import { STACK_AND_TOOLS_MAX } from '../../constants/profileLimits.js';
import { ProfileErrorCode } from './profile.types.js';
import { profileRepository } from './profile.repository.js';
/**
 * Caps stack list and resolves username uniqueness + lowercase (basic section).
 */
export async function applyBasicProfileRules(userId, updates) {
    const stackRaw = updates.stackAndTools;
    if (Array.isArray(stackRaw)) {
        const arr = stackRaw.filter((t) => typeof t === 'string');
        updates.stackAndTools = arr.slice(0, STACK_AND_TOOLS_MAX);
    }
    if (typeof updates.username === 'string') {
        const lower = updates.username.trim().toLowerCase();
        const existing = await profileRepository.findOneUsernameConflict(lower, userId);
        if (existing) {
            return {
                ok: false,
                status: 409,
                message: 'Username is already taken. Choose another.',
                code: ProfileErrorCode.USERNAME_TAKEN,
            };
        }
        updates.username = lower;
    }
    return { ok: true };
}
//# sourceMappingURL=profile-basic.service.js.map