import path from 'node:path';
import type { NextConfig } from 'next';

/** Turbopack `resolveAlias` target for `zod` from monorepo root (POSIX, `./`-prefixed). */
function turbopackZodAlias(): string {
  const repoRoot = path.resolve(process.cwd(), '..');
  const zodDir = path.resolve(process.cwd(), 'node_modules', 'zod');
  let rel = path.relative(repoRoot, zodDir).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) {
    // Fallback if cwd is not webapp
    rel = path.join('webapp', 'node_modules', 'zod').split(path.sep).join('/');
  }
  return rel.startsWith('.') ? rel : `./${rel}`;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Compile linked `file:../packages/shared` TypeScript through Next (Vercel + local). */
  transpilePackages: ['@syntax-stories/shared'],
  /**
   * Monorepo: Turbopack root is repo root so `../packages/shared` resolves. Files there import `zod`;
   * Node resolution from `packages/shared` does not reach `webapp/node_modules`, so we alias `zod`.
   * - Bare `webapp/node_modules/zod` is parsed as npm package `webapp` + subpath on Vercel.
   * - Absolute Windows paths hit "windows imports are not implemented yet" in Turbopack locally.
   * Repo-relative `./webapp/node_modules/zod` works on both.
   */
  turbopack: {
    root: path.resolve(process.cwd(), '..'),
    resolveAlias: {
      zod: turbopackZodAlias(),
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
