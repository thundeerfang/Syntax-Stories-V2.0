import mongoose from 'mongoose';
import type { ProfileUpdateSection } from './profile.types.js';
export declare const profileRepository: {
    findLeanById(userId: string): Promise<(mongoose.FlattenMaps<import("../../models/User.js").IUser> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    findLeanByIdSelect(userId: string, spaceSeparatedFields: string): Promise<(mongoose.FlattenMaps<import("../../models/User.js").IUser> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    findOneUsernameConflict(usernameLower: string, excludeUserId: string): Promise<(mongoose.FlattenMaps<import("../../models/User.js").IUser> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    updateById(userId: string, updates: Record<string, unknown>): Promise<(mongoose.FlattenMaps<import("../../models/User.js").IUser> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    /**
     * Single-document write: `$set` (profile fields + `profileUpdatedAt`) and `$inc: { profileVersion: 1 }`
     * run in **one** MongoDB update operation — atomic relative to other concurrent updates on this document.
     *
     * When `expectedVersion` is defined, the filter includes `$expr` so the update applies **only** if
     * `profileVersion` (or 0 if missing) equals that value; otherwise matched count is zero and this returns `null` → 409 upstream.
     */
    applyProfileAtomic(userId: string, updates: Record<string, unknown>, expectedVersion: number | undefined): Promise<(mongoose.FlattenMaps<import("../../models/User.js").IUser> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
    updateBySection(userId: string, _section: ProfileUpdateSection | "legacy", updates: Record<string, unknown>, expectedVersion?: number): Promise<(mongoose.FlattenMaps<import("../../models/User.js").IUser> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
};
//# sourceMappingURL=profile.repository.d.ts.map