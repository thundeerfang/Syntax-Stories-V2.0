import mongoose from 'mongoose';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { FollowModel } from '../models/Follow';

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
  // eslint-disable-next-line no-console
  console.log('[reconcile] connected');

  const cursor = UserModel.find({}).select('_id').lean().cursor();
  let n = 0;

  for await (const u of cursor) {
    const userId = u._id as mongoose.Types.ObjectId;
    const [followersCount, followingCount] = await Promise.all([
      FollowModel.countDocuments({ following: userId }),
      FollowModel.countDocuments({ follower: userId }),
    ]);
    await UserModel.updateOne({ _id: userId }, { $set: { followersCount, followingCount } });
    n += 1;
    if (n % 500 === 0) {
      // eslint-disable-next-line no-console
      console.log(`[reconcile] updated ${n}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[reconcile] done. users=${n}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[reconcile] failed', err);
  process.exit(1);
});

