/**
 * Tech stack list for autocomplete: name, slug (skillicons.dev), category.
 * Format: https://skillicons.dev/icons?i={slug}
 */

export type TechStackCategory =
  | 'Frontend'
  | 'Backend'
  | 'Mobile'
  | 'Database'
  | 'DevOps'
  | 'Cloud'
  | 'Library'
  | 'Tool'
  | 'Language'
  | 'Design';

export interface TechStackItem {
  name: string;
  slug: string;
  category: TechStackCategory;
}

export const TECH_STACK_LIST: TechStackItem[] = [
  // Frontend
  { name: 'React', slug: 'react', category: 'Frontend' },
  { name: 'React Native', slug: 'react', category: 'Mobile' },
  { name: 'React Router', slug: 'react', category: 'Library' },
  { name: 'Vue', slug: 'vue', category: 'Frontend' },
  { name: 'Vue.js', slug: 'vue', category: 'Frontend' },
  { name: 'Angular', slug: 'angular', category: 'Frontend' },
  { name: 'Svelte', slug: 'svelte', category: 'Frontend' },
  { name: 'Next.js', slug: 'nextjs', category: 'Frontend' },
  { name: 'Nuxt', slug: 'nuxt', category: 'Frontend' },
  { name: 'Remix', slug: 'remix', category: 'Frontend' },
  { name: 'HTML', slug: 'html', category: 'Frontend' },
  { name: 'CSS', slug: 'css', category: 'Frontend' },
  { name: 'Tailwind CSS', slug: 'tailwind', category: 'Frontend' },
  { name: 'Bootstrap', slug: 'bootstrap', category: 'Frontend' },
  { name: 'Redux', slug: 'redux', category: 'Library' },
  { name: 'Vite', slug: 'vite', category: 'Tool' },
  { name: 'Webpack', slug: 'webpack', category: 'Tool' },
  { name: 'Parcel', slug: 'parcel', category: 'Tool' },
  { name: 'Astro', slug: 'astro', category: 'Frontend' },
  { name: 'Solid', slug: 'solid', category: 'Frontend' },
  { name: 'Qwik', slug: 'qwik', category: 'Frontend' },
  { name: 'Ember', slug: 'ember', category: 'Frontend' },
  { name: 'jQuery', slug: 'jquery', category: 'Library' },
  // Backend
  { name: 'Node.js', slug: 'nodejs', category: 'Backend' },
  { name: 'Express', slug: 'express', category: 'Backend' },
  { name: 'NestJS', slug: 'nestjs', category: 'Backend' },
  { name: 'Fastify', slug: 'fastify', category: 'Backend' },
  { name: 'Django', slug: 'django', category: 'Backend' },
  { name: 'Flask', slug: 'flask', category: 'Backend' },
  { name: 'FastAPI', slug: 'fastapi', category: 'Backend' },
  { name: 'Laravel', slug: 'laravel', category: 'Backend' },
  { name: 'Rails', slug: 'rails', category: 'Backend' },
  { name: 'Spring', slug: 'spring', category: 'Backend' },
  { name: 'ASP.NET', slug: 'dotnet', category: 'Backend' },
  { name: 'Phoenix', slug: 'phoenix', category: 'Backend' },
  { name: 'Gin', slug: 'go', category: 'Backend' },
  { name: 'Actix', slug: 'rust', category: 'Backend' },
  { name: 'Rocket', slug: 'rust', category: 'Backend' },
  // Mobile
  { name: 'Flutter', slug: 'flutter', category: 'Mobile' },
  { name: 'Swift', slug: 'swift', category: 'Mobile' },
  { name: 'Kotlin', slug: 'kotlin', category: 'Mobile' },
  { name: 'Ionic', slug: 'ionic', category: 'Mobile' },
  { name: 'Expo', slug: 'react', category: 'Mobile' },
  // Database
  { name: 'MongoDB', slug: 'mongodb', category: 'Database' },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'Database' },
  { name: 'MySQL', slug: 'mysql', category: 'Database' },
  { name: 'Redis', slug: 'redis', category: 'Database' },
  { name: 'SQLite', slug: 'sqlite', category: 'Database' },
  { name: 'Elasticsearch', slug: 'elasticsearch', category: 'Database' },
  { name: 'Firebase', slug: 'firebase', category: 'Database' },
  { name: 'Supabase', slug: 'supabase', category: 'Database' },
  { name: 'Prisma', slug: 'prisma', category: 'Tool' },
  { name: 'Drizzle', slug: 'drizzle', category: 'Tool' },
  // DevOps & Cloud
  { name: 'Docker', slug: 'docker', category: 'DevOps' },
  { name: 'Kubernetes', slug: 'kubernetes', category: 'DevOps' },
  { name: 'AWS', slug: 'aws', category: 'Cloud' },
  { name: 'GCP', slug: 'gcp', category: 'Cloud' },
  { name: 'Azure', slug: 'azure', category: 'Cloud' },
  { name: 'Terraform', slug: 'terraform', category: 'DevOps' },
  { name: 'Ansible', slug: 'ansible', category: 'DevOps' },
  { name: 'Jenkins', slug: 'jenkins', category: 'DevOps' },
  { name: 'GitHub Actions', slug: 'github', category: 'DevOps' },
  { name: 'GitLab CI', slug: 'gitlab', category: 'DevOps' },
  { name: 'Vercel', slug: 'vercel', category: 'Cloud' },
  { name: 'Netlify', slug: 'netlify', category: 'Cloud' },
  { name: 'Linux', slug: 'linux', category: 'DevOps' },
  { name: 'Nginx', slug: 'nginx', category: 'DevOps' },
  // Languages
  { name: 'JavaScript', slug: 'js', category: 'Language' },
  { name: 'TypeScript', slug: 'ts', category: 'Language' },
  { name: 'Python', slug: 'python', category: 'Language' },
  { name: 'Java', slug: 'java', category: 'Language' },
  { name: 'Go', slug: 'golang', category: 'Language' },
  { name: 'Golang', slug: 'golang', category: 'Language' },
  { name: 'Rust', slug: 'rust', category: 'Language' },
  { name: 'C++', slug: 'cpp', category: 'Language' },
  { name: 'C', slug: 'c', category: 'Language' },
  { name: 'C#', slug: 'cs', category: 'Language' },
  { name: 'PHP', slug: 'php', category: 'Language' },
  { name: 'Ruby', slug: 'ruby', category: 'Language' },
  { name: 'Swift', slug: 'swift', category: 'Language' },
  { name: 'Kotlin', slug: 'kotlin', category: 'Language' },
  { name: 'Scala', slug: 'scala', category: 'Language' },
  { name: 'Dart', slug: 'dart', category: 'Language' },
  { name: 'Elixir', slug: 'elixir', category: 'Language' },
  { name: 'Haskell', slug: 'haskell', category: 'Language' },
  { name: 'Lua', slug: 'lua', category: 'Language' },
  { name: 'Deno', slug: 'deno', category: 'Language' },
  { name: 'Bun', slug: 'bun', category: 'Language' },
  // Library & Tool
  { name: 'GraphQL', slug: 'graphql', category: 'Library' },
  { name: 'RxJS', slug: 'rxjs', category: 'Library' },
  { name: 'Lodash', slug: 'lodash', category: 'Library' },
  { name: 'Jest', slug: 'jest', category: 'Tool' },
  { name: 'Vitest', slug: 'vitest', category: 'Tool' },
  { name: 'Cypress', slug: 'cypress', category: 'Tool' },
  { name: 'Playwright', slug: 'playwright', category: 'Tool' },
  { name: 'Testing Library', slug: 'testinglibrary', category: 'Tool' },
  { name: 'ESLint', slug: 'eslint', category: 'Tool' },
  { name: 'Prettier', slug: 'prettier', category: 'Tool' },
  { name: 'Git', slug: 'git', category: 'Tool' },
  { name: 'GitHub', slug: 'github', category: 'Tool' },
  { name: 'GitLab', slug: 'gitlab', category: 'Tool' },
  { name: 'Bitbucket', slug: 'bitbucket', category: 'Tool' },
  { name: 'Figma', slug: 'figma', category: 'Design' },
  { name: 'Photoshop', slug: 'photoshop', category: 'Design' },
  { name: 'Illustrator', slug: 'illustrator', category: 'Design' },
  { name: 'Blender', slug: 'blender', category: 'Design' },
  { name: 'Three.js', slug: 'threejs', category: 'Library' },
  { name: 'D3.js', slug: 'd3', category: 'Library' },
  { name: 'Socket.io', slug: 'socketio', category: 'Library' },
  { name: 'tRPC', slug: 'trpc', category: 'Library' },
  { name: 'Storybook', slug: 'storybook', category: 'Tool' },
  { name: 'Nx', slug: 'nx', category: 'Tool' },
  { name: 'Turborepo', slug: 'turborepo', category: 'Tool' },
  { name: 'pnpm', slug: 'pnpm', category: 'Tool' },
  { name: 'npm', slug: 'npm', category: 'Tool' },
  { name: 'Yarn', slug: 'yarn', category: 'Tool' },
  { name: 'Babel', slug: 'babel', category: 'Tool' },
  { name: 'Rollup', slug: 'rollup', category: 'Tool' },
  { name: 'esbuild', slug: 'esbuild', category: 'Tool' },
  { name: 'SWC', slug: 'swc', category: 'Tool' },
  { name: 'Postman', slug: 'postman', category: 'Tool' },
  { name: 'Insomnia', slug: 'insomnia', category: 'Tool' },
  { name: 'VS Code', slug: 'vscode', category: 'Tool' },
  { name: 'Neovim', slug: 'neovim', category: 'Tool' },
  { name: 'Zapier', slug: 'zapier', category: 'Tool' },
  { name: 'Stripe', slug: 'stripe', category: 'Tool' },
  { name: 'SendGrid', slug: 'sendgrid', category: 'Tool' },
  { name: 'Twilio', slug: 'twilio', category: 'Tool' },
  { name: 'Cloudflare', slug: 'cloudflare', category: 'Cloud' },
  { name: 'DigitalOcean', slug: 'digitalocean', category: 'Cloud' },
  { name: 'Heroku', slug: 'heroku', category: 'Cloud' },
  { name: 'Railway', slug: 'railway', category: 'Cloud' },
  { name: 'Render', slug: 'render', category: 'Cloud' },
  { name: 'Fly.io', slug: 'flyio', category: 'Cloud' },
  { name: 'Kafka', slug: 'kafka', category: 'Database' },
  { name: 'Cassandra', slug: 'cassandra', category: 'Database' },
  { name: 'DynamoDB', slug: 'aws', category: 'Database' },
  { name: 'Apollo', slug: 'apollo', category: 'Library' },
  { name: 'Zod', slug: 'zod', category: 'Library' },
  { name: 'React Query', slug: 'reactquery', category: 'Library' },
  { name: 'TanStack Query', slug: 'reactquery', category: 'Library' },
  { name: 'SWR', slug: 'vercel', category: 'Library' },
  { name: 'Formik', slug: 'formik', category: 'Library' },
  { name: 'React Hook Form', slug: 'react', category: 'Library' },
  { name: 'Chakra UI', slug: 'chakra', category: 'Frontend' },
  { name: 'MUI', slug: 'mui', category: 'Frontend' },
  { name: 'Material UI', slug: 'mui', category: 'Frontend' },
  { name: 'Ant Design', slug: 'antdesign', category: 'Frontend' },
  { name: 'Radix', slug: 'radix', category: 'Frontend' },
  { name: 'Shadcn', slug: 'shadcn', category: 'Frontend' },
  { name: 'Framer Motion', slug: 'framer', category: 'Library' },
  { name: 'GSAP', slug: 'gsap', category: 'Library' },
  { name: 'Puppeteer', slug: 'puppeteer', category: 'Tool' },
  { name: 'Selenium', slug: 'selenium', category: 'Tool' },
  { name: 'Prometheus', slug: 'prometheus', category: 'DevOps' },
  { name: 'Grafana', slug: 'grafana', category: 'DevOps' },
  { name: 'Datadog', slug: 'datadog', category: 'DevOps' },
  { name: 'Sentry', slug: 'sentry', category: 'Tool' },
  { name: 'LogRocket', slug: 'logrocket', category: 'Tool' },
];

/** All unique categories in order for display */
export const TECH_STACK_CATEGORIES: TechStackCategory[] = [
  'Frontend',
  'Backend',
  'Mobile',
  'Database',
  'DevOps',
  'Cloud',
  'Library',
  'Tool',
  'Language',
  'Design',
];

/**
 * Filter tech stack by search query (matches name and slug).
 */
export function searchTechStack(query: string, limit = 15): TechStackItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const filtered = TECH_STACK_LIST.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
  );
  return filtered.slice(0, limit);
}
