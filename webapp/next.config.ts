import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
