import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { BlogBookmarkModel } from '../models/BlogBookmark.js';
import { BlogCommentModel } from '../models/BlogComment.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { BlogRepostModel } from '../models/BlogRepost.js';

/**
 * Recompute `commentCount`, `repostCount`, and `bookmarkCount` on every blog post.
 *
 * Usage: `npx tsx src/scripts/backfillBlogPostEngagementCounts.ts`
 */
async function main(): Promise<void> {
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(uri);
  console.log('[backfill-blog-engagement] connected');

  const cursor = BlogPostModel.find({}).select('_id').cursor();
  let n = 0;
  for await (const doc of cursor) {
    const postId = doc._id as mongoose.Types.ObjectId;
    const [commentCount, repostCount, bookmarkCount] = await Promise.all([
      BlogCommentModel.countDocuments({ postId }),
      BlogRepostModel.countDocuments({ postId }),
      BlogBookmarkModel.countDocuments({ postId }),
    ]);
    await BlogPostModel.updateOne(
      { _id: postId },
      {
        $set: {
          commentCount: Math.max(0, commentCount),
          repostCount: Math.max(0, repostCount),
          bookmarkCount: Math.max(0, bookmarkCount),
        },
      }
    );
    n += 1;
    if (n % 200 === 0) {
      console.log(`[backfill-blog-engagement] updated ${n} posts…`);
    }
  }

  console.log(`[backfill-blog-engagement] done, posts=${n}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
