import mongoose, { Schema } from 'mongoose';
const FollowSchema = new Schema({
    follower: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    following: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
}, { timestamps: true });
// Atomic dedupe (field-level `index: true` already covers single-field indexes)
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
export const FollowModel = mongoose.models?.follows ?? mongoose.model('follows', FollowSchema);
//# sourceMappingURL=Follow.js.map