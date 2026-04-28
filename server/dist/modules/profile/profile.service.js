import { emitAppEvent } from '../../shared/events/appEvents.js';
import { applyBasicProfileRules } from './profile-basic.service.js';
import { normalizeCertifications } from './profile-certifications.service.js';
import { normalizeEducation } from './profile-education.service.js';
import { toAccountUser } from './profile.mapper.js';
import { normalizeProjectsPrjLog } from './profile-projects.service.js';
import { profileRepository } from './profile.repository.js';
import { ProfileErrorCode, PROFILE_SECTION_KEYS } from './profile.types.js';
import { normalizeWorkExperiences } from './profile-work.service.js';
const UPDATE_PROFILE_KEYS = [
    'fullName',
    'username',
    'bio',
    'profileImg',
    'profileImgAlt',
    'coverBanner',
    'coverBannerAlt',
    'job',
    'portfolioUrl',
    'linkedin',
    'instagram',
    'github',
    'youtube',
    'stackAndTools',
    'workExperiences',
    'education',
    'certifications',
    'projects',
    'openSourceContributions',
    'mySetup',
    'isGoogleAccount',
    'isGitAccount',
    'isFacebookAccount',
    'isXAccount',
    'isAppleAccount',
    'isDiscordAccount',
];
const profileSectionKeys = [
    'education',
    'workExperiences',
    'projects',
    'certifications',
    'openSourceContributions',
    'stackAndTools',
    'mySetup',
];
async function applyProfileUpdate(req, user, body, allowedKeys, section) {
    const userId = String(user._id);
    const rawEv = body.expectedProfileVersion;
    const expectedVersion = typeof rawEv === 'number' && Number.isInteger(rawEv) && rawEv >= 0 ? rawEv : undefined;
    const updates = {};
    for (const key of allowedKeys) {
        if (body[key] !== undefined)
            updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
        return {
            ok: false,
            status: 400,
            message: 'No valid fields to update',
            code: ProfileErrorCode.NO_VALID_FIELDS,
        };
    }
    const basicKeys = new Set(PROFILE_SECTION_KEYS.basic);
    const hasBasicKey = Object.keys(updates).some((k) => basicKeys.has(k));
    if (hasBasicKey) {
        const basicResult = await applyBasicProfileRules(userId, updates);
        if (!basicResult.ok) {
            return { ok: false, status: basicResult.status, message: basicResult.message, code: basicResult.code };
        }
    }
    let currentProfile = null;
    if (profileSectionKeys.some((k) => updates[k] !== undefined)) {
        const doc = await profileRepository.findLeanByIdSelect(userId, profileSectionKeys.join(' '));
        if (doc)
            currentProfile = doc;
    }
    if (updates.workExperiences !== undefined) {
        await normalizeWorkExperiences(userId, updates);
    }
    if (updates.education !== undefined) {
        await normalizeEducation(userId, updates);
    }
    if (updates.certifications !== undefined) {
        await normalizeCertifications(userId, updates);
    }
    if (updates.projects !== undefined) {
        normalizeProjectsPrjLog(updates);
    }
    const updated = await profileRepository.updateBySection(userId, section, updates, expectedVersion);
    if (!updated) {
        if (expectedVersion !== undefined) {
            return {
                ok: false,
                status: 409,
                message: 'Profile was updated elsewhere. Refresh and try again.',
                code: ProfileErrorCode.PROFILE_VERSION_CONFLICT,
            };
        }
        return {
            ok: false,
            status: 404,
            message: 'User not found',
            code: ProfileErrorCode.USER_NOT_FOUND,
        };
    }
    const actorId = userId;
    const updatedProfile = updated;
    emitAppEvent('profile.updated', {
        req,
        actorId,
        updates,
        currentProfile,
        updatedProfile,
        section,
    });
    return { ok: true, user: toAccountUser(updated) };
}
export const profileService = {
    async getMe(userId) {
        const found = await profileRepository.findLeanById(userId);
        if (!found) {
            return {
                ok: false,
                status: 404,
                message: 'User not found',
                code: ProfileErrorCode.USER_NOT_FOUND,
            };
        }
        return { ok: true, user: toAccountUser(found) };
    },
    async updateProfile(req, user, body) {
        return applyProfileUpdate(req, user, body, UPDATE_PROFILE_KEYS, 'legacy');
    },
    async updateProfileSection(req, user, section, body) {
        const keys = PROFILE_SECTION_KEYS[section];
        return applyProfileUpdate(req, user, body, keys, section);
    },
    async parseCvFromPdfBuffer(buffer) {
        const pdfParse = (await import('pdf-parse')).default;
        const { text } = await pdfParse(buffer);
        const { parseCvFromText } = await import('../../utils/parseCvFromPdf.js');
        const { extracted, missingFields, incompleteItemHints } = parseCvFromText(text ?? '');
        return {
            extracted: extracted,
            missingFields,
            incompleteItemHints: (incompleteItemHints ?? {}),
        };
    },
};
//# sourceMappingURL=profile.service.js.map