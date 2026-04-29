import mongoose from 'mongoose';
import { UserModel } from '../../models/User.js';
/** Never $set these from client-driven updates; version is bumped only via $inc, time via server. */
const PROFILE_UPDATE_RESERVED_KEYS = new Set([
    'profileVersion',
    'profileUpdatedAt',
    'expectedProfileVersion',
]);
function sanitizeProfileSetFields(updates) {
    const out = { ...updates };
    for (const k of PROFILE_UPDATE_RESERVED_KEYS) {
        delete out[k];
    }
    return out;
}
const TOKEN_PROJECTION = {
    twoFactorSecret: 0,
    googleToken: 0,
    githubToken: 0,
    facebookToken: 0,
    xToken: 0,
    appleToken: 0,
    discordToken: 0,
};
export const profileRepository = {
    async findLeanById(userId) {
        return UserModel.findById(userId).lean();
    },
    async findLeanByIdSelect(userId, spaceSeparatedFields) {
        return UserModel.findById(userId).select(spaceSeparatedFields).lean();
    },
    async findOneUsernameConflict(usernameLower, excludeUserId) {
        return UserModel.findOne({
            username: usernameLower,
            _id: { $ne: excludeUserId },
        })
            .select('_id')
            .lean();
    },
    async updateById(userId, updates) {
        return UserModel.findByIdAndUpdate(userId, updates, {
            new: true,
            runValidators: true,
            projection: TOKEN_PROJECTION,
        }).lean();
    },
    /**
     * Single-document write: `$set` (profile fields + `profileUpdatedAt`) and `$inc: { profileVersion: 1 }`
     * run in **one** MongoDB update operation — atomic relative to other concurrent updates on this document.
     *
     * When `expectedVersion` is defined, the filter includes `$expr` so the update applies **only** if
     * `profileVersion` (or 0 if missing) equals that value; otherwise matched count is zero and this returns `null` → 409 upstream.
     */
    async applyProfileAtomic(userId, updates, expectedVersion) {
        const id = new mongoose.Types.ObjectId(userId);
        const setDoc = { ...sanitizeProfileSetFields(updates), profileUpdatedAt: new Date() };
        const update = { $set: setDoc, $inc: { profileVersion: 1 } };
        const options = { new: true, runValidators: true, projection: TOKEN_PROJECTION };
        if (expectedVersion !== undefined) {
            return UserModel.findOneAndUpdate({
                _id: id,
                $expr: { $eq: [{ $ifNull: ['$profileVersion', 0] }, expectedVersion] },
            }, update, options).lean();
        }
        return UserModel.findOneAndUpdate({ _id: id }, update, options).lean();
    },
    async updateBySection(userId, _section, updates, expectedVersion) {
        return this.applyProfileAtomic(userId, updates, expectedVersion);
    },
};
//# sourceMappingURL=profile.repository.js.map