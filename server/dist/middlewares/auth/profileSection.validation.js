import { isProfileUpdateSection } from '../../modules/profile/profile.types.js';
import { updateProfileBasicSchema, updateProfileCertificationsSchema, updateProfileEducationSchema, updateProfileProjectsSchema, updateProfileSetupSchema, updateProfileSocialSchema, updateProfileStackSchema, updateProfileWorkSchema, } from './profileZodSchemas.js';
import { formatZodError } from './zodFormat.js';
function sectionValidation(schema, req, res, next) {
    const r = schema.safeParse(req.body);
    if (!r.success) {
        res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Validation error',
            details: formatZodError(r.error),
        });
        return;
    }
    req.body = r.data;
    next();
}
export function updateProfileBasicValidation(req, res, next) {
    sectionValidation(updateProfileBasicSchema, req, res, next);
}
export function updateProfileSocialValidation(req, res, next) {
    sectionValidation(updateProfileSocialSchema, req, res, next);
}
export function updateProfileWorkValidation(req, res, next) {
    sectionValidation(updateProfileWorkSchema, req, res, next);
}
export function updateProfileEducationValidation(req, res, next) {
    sectionValidation(updateProfileEducationSchema, req, res, next);
}
export function updateProfileCertificationsValidation(req, res, next) {
    sectionValidation(updateProfileCertificationsSchema, req, res, next);
}
export function updateProfileProjectsValidation(req, res, next) {
    sectionValidation(updateProfileProjectsSchema, req, res, next);
}
export function updateProfileSetupValidation(req, res, next) {
    sectionValidation(updateProfileSetupSchema, req, res, next);
}
export function updateProfileStackValidation(req, res, next) {
    sectionValidation(updateProfileStackSchema, req, res, next);
}
function paramSection(req) {
    const raw = req.params.section;
    const s = Array.isArray(raw) ? raw[0] : raw;
    return typeof s === 'string' ? s : undefined;
}
/** Dispatches the correct Zod schema for `PATCH /auth/profile/:section`. */
export function updateProfileSectionBodyValidation(req, res, next) {
    const s = paramSection(req);
    if (!s || !isProfileUpdateSection(s)) {
        res.status(400).json({
            success: false,
            code: 'INVALID_SECTION',
            message: 'Unknown profile section',
        });
        return;
    }
    switch (s) {
        case 'basic':
            return updateProfileBasicValidation(req, res, next);
        case 'social':
            return updateProfileSocialValidation(req, res, next);
        case 'stack':
            return updateProfileStackValidation(req, res, next);
        case 'work':
            return updateProfileWorkValidation(req, res, next);
        case 'education':
            return updateProfileEducationValidation(req, res, next);
        case 'certifications':
            return updateProfileCertificationsValidation(req, res, next);
        case 'projects':
            return updateProfileProjectsValidation(req, res, next);
        case 'setup':
            return updateProfileSetupValidation(req, res, next);
        default:
            res.status(400).json({
                success: false,
                code: 'INVALID_SECTION',
                message: 'Unknown profile section',
            });
    }
}
//# sourceMappingURL=profileSection.validation.js.map