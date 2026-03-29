import type { NextConfig } from 'next';

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
  },
};

export default nextConfig;
