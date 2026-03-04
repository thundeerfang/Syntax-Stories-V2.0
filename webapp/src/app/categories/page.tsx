import Link from 'next/link';

export default function CategoriesPage() {
  const categories = [
    { slug: 'web-dev', name: 'Web Development', count: 42 },
    { slug: 'apis', name: 'APIs & Backend', count: 28 },
    { slug: 'frontend', name: 'Frontend', count: 56 },
    { slug: 'devops', name: 'DevOps & Infra', count: 19 },
    { slug: 'tools', name: 'Tools & Workflow', count: 34 },
    { slug: 'career', name: 'Career & Soft Skills', count: 22 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-foreground border-b-2 border-border pb-4">
        Categories
      </h1>
      <p className="mt-4 text-muted-foreground">
        Browse dev content by topic. Pick a category to see all stories.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {categories.map(({ slug, name, count }) => (
          <li key={slug}>
            <Link
              href={`/categories/${slug}`}
              className="block border-2 border-border bg-card p-5 text-card-foreground shadow-sm transition-shadow hover:shadow hover:bg-muted/30"
            >
              <span className="font-semibold">{name}</span>
              <span className="ml-2 text-sm text-muted-foreground">({count})</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
