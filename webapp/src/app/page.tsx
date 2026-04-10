import { HomeFeed } from '@/components/home/HomeFeed';

export default function HomePage() {
  return (
    <div className="min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-mono text-2xl font-bold uppercase tracking-tight text-foreground">All dev blogs</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Tutorials, hot takes, and deep dives from the community — live from the database.
      </p>
      <HomeFeed />
    </div>
  );
}
