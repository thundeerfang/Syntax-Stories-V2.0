import Link from 'next/link';
import type { Post } from '@/types';

export function BlogCard({ post }: Readonly<{ post: Post }>) {
  const date = new Date(post.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="border-2 border-border bg-card p-5 shadow-sm transition-shadow hover:shadow">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.coverImage && (
          <div className="mb-4 aspect-video w-full overflow-hidden border-2 border-border bg-muted">
            <img
              src={post.coverImage}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <h2 className="text-lg font-semibold text-foreground hover:text-primary hover:underline">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {post.excerpt}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{post.author.name}</span>
          <span>·</span>
          <time dateTime={post.publishedAt}>{date}</time>
          {post.tags && post.tags.length > 0 && (
            <>
              <span>·</span>
              <span>{post.tags.slice(0, 2).join(', ')}</span>
            </>
          )}
        </div>
      </Link>
    </article>
  );
}
