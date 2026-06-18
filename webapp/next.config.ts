import path from 'node:path';
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  /** Desktop dev (:3010) can run alongside browser dev (:3001) without lock conflicts. */
  ...(isDesktop ? { distDir: '.next-desktop' } : {}),
  async redirects() {
    return [
      { source: '/tag/:slug', destination: '/topics/:slug', permanent: true },
      { source: '/squads/discover/:category', destination: '/squads/:category', permanent: true },
      { source: '/squads/discover', destination: '/squads/featured', permanent: true },
      { source: '/upgrade', destination: '/pricing', permanent: true },
      { source: '/categories/:slug', destination: '/topics/category/:slug', permanent: true },
    ];
  },
  /** Linked `file:./packages/shared` lives under the app; transpile its TypeScript for the bundler. */
  transpilePackages: ['@syntax-stories/shared'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/**' },
      { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
      { protocol: 'https', hostname: '127.0.0.1', pathname: '/**' },
    ],
    /**
     * Dev-only: `next/image` resolves `localhost` to 127.0.0.1/::1 and otherwise refuses to optimize
     * (“upstream image … resolved to private ip”). Production should use public CDN/origin URLs.
     */
    ...(isDev ? { dangerouslyAllowLocalIP: true } : {}),
  },
};

export default nextConfig;
