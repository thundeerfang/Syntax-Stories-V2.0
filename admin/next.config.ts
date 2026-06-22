import type { NextConfig } from 'next';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const adminRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: adminRoot,
  },
};

export default nextConfig;
