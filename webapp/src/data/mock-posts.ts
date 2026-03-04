import type { Post } from '@/types';

export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    title: 'Building a REST API with Next.js and TypeScript',
    slug: 'rest-api-nextjs-typescript',
    excerpt: 'A step-by-step guide to creating a type-safe API layer in your Next.js app, with validation and error handling.',
    author: { id: 'u1', email: 'alex@example.com', name: 'Alex Chen' },
    publishedAt: '2025-02-20T10:00:00Z',
    tags: ['Next.js', 'TypeScript', 'API'],
  },
  {
    id: '2',
    title: 'CSS Grid vs Flexbox: When to Use Which',
    slug: 'css-grid-vs-flexbox',
    excerpt: 'Practical rules and examples so you can pick the right layout tool and avoid over-engineering.',
    author: { id: 'u2', email: 'sam@example.com', name: 'Sam Rivera' },
    publishedAt: '2025-02-19T14:30:00Z',
    tags: ['CSS', 'Frontend'],
  },
  {
    id: '3',
    title: 'Debugging Production Issues Without Logs',
    slug: 'debugging-production-without-logs',
    excerpt: 'How we tracked down a race condition using browser DevTools and minimal instrumentation.',
    author: { id: 'u3', email: 'jordan@example.com', name: 'Jordan Lee' },
    publishedAt: '2025-02-18T09:15:00Z',
    tags: ['DevOps', 'Debugging'],
  },
  {
    id: '4',
    title: 'Why We Switched to Monorepos',
    slug: 'why-we-switched-monorepos',
    excerpt: 'Our team moved from multiple repos to a single monorepo. Here’s what we gained and what we’d do differently.',
    author: { id: 'u4', email: 'casey@example.com', name: 'Casey Moore' },
    publishedAt: '2025-02-17T16:00:00Z',
    tags: ['Tooling', 'Monorepo'],
  },
  {
    id: '5',
    title: 'Getting Your First Dev Job: What Worked for Me',
    slug: 'first-dev-job-what-worked',
    excerpt: 'Projects, networking, and interview prep that actually moved the needle when I was breaking into tech.',
    author: { id: 'u5', email: 'riley@example.com', name: 'Riley Park' },
    publishedAt: '2025-02-16T11:00:00Z',
    tags: ['Career', 'Interview'],
  },
];
