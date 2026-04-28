import Link from 'next/link';

const TOPICS = [
  { slug: 'web-dev', label: 'Web Development' },
  { slug: 'apis', label: 'APIs & Backend' },
  { slug: 'frontend', label: 'Frontend' },
  { slug: 'devops', label: 'DevOps' },
  { slug: 'tools', label: 'Tools' },
  { slug: 'career', label: 'Career' },
];

const TOP_CREATORS = [
  { id: '1', name: 'Alex Chen', href: '/u/alex-chen' },
  { id: '2', name: 'Sam Rivera', href: '/u/sam-rivera' },
  { id: '3', name: 'Jordan Lee', href: '/u/jordan-lee' },
  { id: '4', name: 'Casey Moore', href: '/u/casey-moore' },
  { id: '5', name: 'Riley Park', href: '/u/riley-park' },
];

export function HomeSidebar() {
  return (
    <aside className="w-full shrink-0 lg:w-64 lg:sticky lg:top-[4.5rem] lg:self-start space-y-8">
      <div className="border-2 border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Topics
        </h2>
        <ul className="mt-3 space-y-1">
          {TOPICS.map(({ slug, label }) => (
            <li key={slug}>
              <Link
                href={`/categories/${slug}`}
                className="block py-1.5 text-sm text-foreground hover:text-primary hover:underline"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-2 border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Top creators
        </h2>
        <ul className="mt-3 space-y-2">
          {TOP_CREATORS.map(({ id, name, href }) => (
            <li key={id}>
              <Link
                href={href}
                className="text-sm font-medium text-foreground hover:text-primary hover:underline"
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
