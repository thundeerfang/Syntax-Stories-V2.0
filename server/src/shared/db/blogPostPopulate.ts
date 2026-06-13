/** Mongoose populate presets for blog post feed/list queries. */

export const BLOG_POST_FEED_POPULATE = [
  { path: 'authorId', select: 'username fullName profileImg', model: 'users' },
  { path: 'lastEditedById', select: 'username fullName', model: 'users' },
  {
    path: 'squadId',
    select: 'slug name iconUrl visibility coverBannerUrl memberCount',
    model: 'squads',
  },
] as const;
