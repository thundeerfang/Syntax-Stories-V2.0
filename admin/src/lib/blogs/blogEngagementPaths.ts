export const BLOG_ENGAGEMENT_METRICS = [
  'views',
  'respects',
  'comments',
  'reposts',
  'bookmarks',
] as const;

export type BlogEngagementMetric = (typeof BLOG_ENGAGEMENT_METRICS)[number];

export const BLOG_ENGAGEMENT_LABELS: Record<BlogEngagementMetric, string> = {
  views: 'Views',
  respects: 'Respects',
  comments: 'Comments',
  reposts: 'Reposts',
  bookmarks: 'Bookmarks',
};

export function blogEngagementPath(postId: string, metric: BlogEngagementMetric): string {
  return `/blogs/${encodeURIComponent(postId)}/engagement/${metric}`;
}

export function isBlogEngagementMetric(v: string): v is BlogEngagementMetric {
  return (BLOG_ENGAGEMENT_METRICS as readonly string[]).includes(v);
}
