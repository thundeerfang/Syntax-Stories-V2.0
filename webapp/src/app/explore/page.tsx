import Link from 'next/link';

export default function ExplorePage() {
  const topics = [
    { slug: 'react', name: 'React' },
    { slug: 'typescript', name: 'TypeScript' },
    { slug: 'nodejs', name: 'Node.js' },
    { slug: 'api-design', name: 'API Design' },
    { slug: 'devops', name: 'DevOps' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground border-b-2 border-border pb-4">
        Explore
      </h1>
      <p className="mt-4 text-muted-foreground">
        Discover stories and topics across the community.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {topics.map(({ slug, name }) => (
          <li key={slug}>
            <Link
              href={`/topics/${slug}`}
              className="block border-2 border-border bg-card p-5 text-card-foreground shadow-sm transition-shadow hover:shadow hover:bg-muted/30"
            >
              <span className="font-semibold">{name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
