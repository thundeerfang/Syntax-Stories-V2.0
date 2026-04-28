import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
/**
 * Read-only referral integrity checks (see docs/INVITE_FRIEND_PRODUCTION_README.md §21).
 *
 * Usage: `npx tsx src/scripts/referralIntegrityCheck.ts`
 */
async function main() {
    const uri = env.MONGODB_URI;
    if (!uri)
        throw new Error('MONGO_CONN / MONGODB_URI is required');
    await mongoose.connect(uri);
    console.log('[referral-integrity] connected');
    const self = await UserModel.countDocuments({
        $expr: { $eq: ['$_id', '$referredByUserId'] },
    });
    if (self > 0) {
        console.error(`[referral-integrity] FAIL: self-referrals count=${self}`);
    }
    const orphanAgg = await UserModel.aggregate([
        { $match: { referredByUserId: { $exists: true, $ne: null } } },
        {
            $lookup: {
                from: 'users',
                localField: 'referredByUserId',
                foreignField: '_id',
                as: 'ref',
            },
        },
        { $match: { ref: { $size: 0 } } },
        { $count: 'n' },
    ]);
    const orphans = orphanAgg[0]?.n ?? 0;
    if (orphans > 0) {
        console.error(`[referral-integrity] FAIL: orphan referredByUserId count=${orphans}`);
    }
    const exit = self > 0 || orphans > 0 ? 1 : 0;
    if (exit === 0) {
        console.log('[referral-integrity] OK');
    }
    await mongoose.disconnect();
    return exit;
}
const code = await main().catch((err) => {
    console.error('[referral-integrity] error', err);
    return 1;
});
process.exit(code);
//# sourceMappingURL=referralIntegrityCheck.js.map