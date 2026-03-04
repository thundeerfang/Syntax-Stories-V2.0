import { BlogCard } from '@/components/home/BlogCard';
import { MOCK_POSTS } from '@/data/mock-posts';

export default function HomePage() {
  return (
    <div className="min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">All dev blogs</h1>
      </div>
      <p className="mt-2 text-muted-foreground">
        Tutorials, hot takes, and deep dives from the community.
      </p>
      <ul className="mt-8 space-y-6">
        {MOCK_POSTS.map((post) => (
          <li key={post.id}>
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </div>
  );
}
