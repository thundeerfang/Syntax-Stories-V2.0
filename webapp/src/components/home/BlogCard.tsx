import Link from 'next/link';
import type { Post } from '@/types';

export function BlogCard({ post }: Readonly<{ post: Post }>) {
  const date = new Date(post.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const username = post.author.username ?? post.author.id;
  const href = `/blogs/${encodeURIComponent(username)}/${encodeURIComponent(post.slug)}`;

  return (
    <article className="group border-2 border-border bg-card shadow-[4px_4px_0_0_var(--border)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--border)]">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <div className="flex flex-col sm:flex-row">
          {post.coverImage ? (
            <div className="relative shrink-0 sm:w-[min(42%,20rem)] border-b-2 border-border sm:border-b-0 sm:border-r-2 border-border bg-muted">
              <div className="aspect-video w-full overflow-hidden sm:aspect-auto sm:min-h-[11rem] sm:h-full">
                <img src={post.coverImage} alt="" className="h-full w-full object-cover" />
              </div>
            </div>
          ) : null}
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="text-primary">Blog</span>
              <span aria-hidden className="text-border">
                ·
              </span>
              <time dateTime={post.publishedAt}>{date}</time>
            </div>
            <h2 className="mt-2 font-mono text-lg font-bold uppercase leading-snug tracking-tight text-foreground group-hover:text-primary group-hover:underline decoration-2 underline-offset-2">
              {post.title}
            </h2>
            {post.excerpt ? (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-border pt-3">
              {post.author.image ? (
                <img
                  src={post.author.image}
                  alt=""
                  className="h-9 w-9 border-2 border-border object-cover shadow-[2px_2px_0_0_var(--border)]"
                />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center border-2 border-border bg-muted text-[10px] font-bold uppercase text-muted-foreground shadow-[2px_2px_0_0_var(--border)]"
                  aria-hidden
                >
                  {post.author.name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{post.author.name}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">@{username}</p>
              </div>
              <span className="hidden text-[10px] font-bold uppercase tracking-wide text-primary sm:inline group-hover:underline">
                Read →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
