import { createRequire } from 'node:module';
import eslintConfigPrettier from 'eslint-config-prettier';

const require = createRequire(import.meta.url);
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextCoreWebVitals,
  eslintConfigPrettier,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'next-env.d.ts',
      '*.config.mjs',
      'jest.config.cjs',
      'jest.setup.ts',
      'coverage/**',
    ],
  },
  {
    rules: {
      // Valid patterns in this codebase (theme sync, fetch→setState); revisit gradually.
      'react-hooks/set-state-in-effect': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
];
