const WEBAPP_ORIGIN =
  (process.env.NEXT_PUBLIC_WEBAPP_URL ?? process.env.NEXT_PUBLIC_PUBLIC_APP_URL ?? 'http://localhost:3001')
    .replace(/\/$/, '');

/** Public webapp URL for a blog post (`/blogs/:username/:slug`). */
export function publicBlogPostUrl(username: string, slug: string): string {
  return `${WEBAPP_ORIGIN}/blogs/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}
