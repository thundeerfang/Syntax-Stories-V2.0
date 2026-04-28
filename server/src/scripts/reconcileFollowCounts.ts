import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { FollowModel } from '../models/Follow.js';

/**
 * One-off / periodic integrity repair:
 * Recompute followersCount and followingCount from Follow collection.
 *
 * Usage:
 *   npm run reconcile:follow-counts
 */
async function main() {
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(uri);
  console.log('[reconcile] connected');

  const cursor = UserModel.find({}).select('_id').lean().cursor();
  let n = 0;

  for await (const u of cursor) {
    const userId = u._id;
    const [followersCount, followingCount] = await Promise.all([
      FollowModel.countDocuments({ following: userId }),
      FollowModel.countDocuments({ follower: userId }),
    ]);
    await UserModel.updateOne({ _id: userId }, { $set: { followersCount, followingCount } });
    n += 1;
    if (n % 500 === 0) {
      console.log(`[reconcile] updated ${n}`);
    }
  }

  console.log(`[reconcile] done. users=${n}`);
  await mongoose.disconnect();
}

try {
  await main();
} catch (err) {
  console.error('[reconcile] failed', err);
  process.exit(1);
}
