import Link from 'next/link';

export default function TrendingPage() {
  const trending = [
    { rank: 1, title: 'React Server Components in 2025', slug: 'rsc-2025', author: 'Jane Doe' },
    { rank: 2, title: 'Building APIs with TypeScript', slug: 'apis-typescript', author: 'Alex Chen' },
    { rank: 3, title: 'The State of CSS', slug: 'state-of-css', author: 'Sam Rivera' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground border-b-2 border-border pb-4">
        Trending
      </h1>
      <p className="mt-4 text-muted-foreground">
        Stories and topics gaining traction right now.
      </p>
      <ul className="mt-8 space-y-4">
        {trending.map(({ rank, title, slug, author }) => (
          <li key={slug}>
            <Link
              href={`/stories/${slug}`}
              className="flex items-center gap-4 border-2 border-border bg-card p-4 shadow-sm transition-shadow hover:shadow hover:bg-muted/30"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-border bg-muted text-sm font-bold">
                {rank}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-foreground">{title}</span>
                <span className="ml-2 text-sm text-muted-foreground">— {author}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
