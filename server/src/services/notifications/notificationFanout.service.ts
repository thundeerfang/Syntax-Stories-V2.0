import mongoose from "mongoose";
import { BlogCategoryFollowModel } from "../../models/BlogCategoryFollow.js";
import { FollowModel } from "../../models/Follow.js";
import { SquadMemberModel } from "../../models/SquadMember.js";
import { SquadModel } from "../../models/Squad.js";
import { UserModel } from "../../models/User.js";
import { createNotification } from "./notification.service.js";
function postHref(username: string, slug: string): string {
  return `/blogs/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}
export type PublishedPostFanoutInput = {
  postId: string;
  authorId: string;
  title: string;
  slug: string;
  category?: string;
  tags?: string[];
  squadId?: string;
};
export async function fanoutNewPublishedPost(
  input: PublishedPostFanoutInput,
): Promise<void> {
  const author = await UserModel.findById(input.authorId)
    .select("username fullName")
    .lean();
  const authorUsername = author?.username ?? "author";
  const authorName = author?.fullName ?? authorUsername;
  const href = postHref(authorUsername, input.slug);
  const titleShort = input.title.slice(0, 80);
  const authorOid = new mongoose.Types.ObjectId(input.authorId);
  const followerRows = await FollowModel.find({ following: authorOid })
    .select("follower")
    .lean();
  for (const row of followerRows) {
    const followerId = String(row.follower);
    if (followerId === input.authorId) continue;
    void createNotification({
      userId: followerId,
      type: "following_new_post",
      title: "New post in your feed",
      message: `${authorName} published "${titleShort}".`,
      href,
      icon: "bell",
      metadata: { postId: input.postId, authorId: input.authorId },
      skipWebhook: true,
    });
  }
  if (input.category?.trim()) {
    const categorySlug = input.category.trim().toLowerCase();
    const categoryFollowers = await BlogCategoryFollowModel.find({
      categorySlug,
    })
      .select("userId")
      .lean();
    for (const row of categoryFollowers) {
      const uid = String(row.userId);
      if (uid === input.authorId) continue;
      void createNotification({
        userId: uid,
        type: "category_new_post",
        title: "New in a category you follow",
        message: `${authorName} posted "${titleShort}" in ${categorySlug.replace(/-/g, " ")}.`,
        href,
        icon: "tag",
        metadata: { postId: input.postId, category: categorySlug },
        skipWebhook: true,
      });
    }
  }
  if (input.tags?.length) {
    for (const tag of input.tags.slice(0, 5)) {
      const tagSlug = tag.trim().toLowerCase();
      if (!tagSlug) continue;
      const tagFollowers = await BlogCategoryFollowModel.find({
        categorySlug: tagSlug,
      })
        .select("userId")
        .lean();
      for (const row of tagFollowers) {
        const uid = String(row.userId);
        if (uid === input.authorId) continue;
        void createNotification({
          userId: uid,
          type: "tag_new_post",
          title: "New post on a topic you follow",
          message: `${authorName} tagged "${tagSlug.replace(/-/g, " ")}" in "${titleShort}".`,
          href,
          icon: "tag",
          metadata: { postId: input.postId, tag: tagSlug },
          skipWebhook: true,
        });
      }
    }
  }
  if (input.squadId && mongoose.Types.ObjectId.isValid(input.squadId)) {
    const squadOid = new mongoose.Types.ObjectId(input.squadId);
    const squad = await SquadModel.findById(squadOid)
      .select("slug name")
      .lean();
    if (squad) {
      const members = await SquadMemberModel.find({ squadId: squadOid })
        .select("userId")
        .lean();
      for (const m of members) {
        const uid = String(m.userId);
        if (uid === input.authorId) continue;
        void createNotification({
          userId: uid,
          type: "squad_new_post",
          title: "New squad post",
          message: `${authorName} posted "${titleShort}" in ${squad.name}.`,
          href: `/squads/${encodeURIComponent(squad.slug)}`,
          icon: "users",
          metadata: { postId: input.postId, squadId: input.squadId },
          skipWebhook: true,
        });
      }
    }
  }
}
