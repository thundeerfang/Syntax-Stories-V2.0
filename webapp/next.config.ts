import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Compile linked `file:../packages/shared` TypeScript through Next (Vercel + local). */
  transpilePackages: ['@syntax-stories/shared'],
  /**
   * Monorepo: `turbopack.root` is the repo root so `packages/shared` resolves.
   * Do not `resolveAlias` for `zod`: Turbopack turns targets into broken "server relative" paths on Linux/CI
   * (`./home/runner/.../node_modules/zod`). Instead install deps in `packages/shared` (`postinstall` + CI)
   * so `import 'zod'` resolves from `packages/shared/node_modules` next to `profile.schema.ts`.
   */
  turbopack: {
    root: path.resolve(process.cwd(), '..'),
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
