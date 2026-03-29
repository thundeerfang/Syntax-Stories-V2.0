import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Compile linked `file:../packages/shared` TypeScript through Next (Vercel + local). */
  transpilePackages: ['@syntax-stories/shared'],
  /**
   * Monorepo: default Turbopack root is `webapp/`, so `@syntax-stories/shared` and `../packages/shared`
   * fail to resolve. Repo root + `zod` alias fix `profile.schema.ts` importing `zod` on Vercel.
   * `zod` path is relative to `root` (must stay repo-relative, not an absolute Windows path).
   */
  turbopack: {
    root: path.resolve(process.cwd(), '..'),
    resolveAlias: {
      zod: 'webapp/node_modules/zod',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
      { protocol: 'https', hostname: '127.0.0.1', pathname: '/**' },
    ],
  },
};

export default nextConfig;
