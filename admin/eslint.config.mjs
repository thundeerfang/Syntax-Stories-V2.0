import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextCoreWebVitals,
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'next-env.d.ts', '*.config.mjs'],
  },
  {
    rules: {
      // Same rationale as webapp: common data-fetch / form-reset patterns in this codebase.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
