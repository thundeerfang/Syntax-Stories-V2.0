import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Alias target for bare `zod` imports from `packages/shared/*`.
 * On Vercel, `./webapp/node_modules/zod` is resolved under `[project]/webapp` → wrong path; use absolute.
 * On Windows, Turbopack rejects absolute `C:\...` ("windows imports are not implemented"); use repo-relative.
 */
function turbopackZodAlias(): string {
  const zodDir = path.resolve(process.cwd(), 'node_modules', 'zod');
  if (process.platform !== 'win32') {
    return zodDir;
  }
  const repoRoot = path.resolve(process.cwd(), '..');
  let rel = path.relative(repoRoot, zodDir).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) {
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
   * Vercel: alias target must be absolute POSIX path (see turbopackZodAlias). Windows: repo-relative
   * `./webapp/node_modules/zod` — absolute `C:\…` triggers "windows imports are not implemented yet".
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
