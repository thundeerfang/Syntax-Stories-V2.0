/**
 * Architecture layer rules (Scale P3 / Part IV §28.2).
 * @see WEBAPP_STRUCTURE.md §12.3, §19
 */
import boundaries from 'eslint-plugin-boundaries';

const FEATURE_SHIMS = [
  'blog',
  'profile',
  'squads',
  'explore',
  'topics',
  'tags',
  'legal',
  'connectivity',
  'auth',
];

/** @type {import('eslint-plugin-boundaries').BoundariesElement[]} */
const elements = [
  ...FEATURE_SHIMS.map((shim) => ({
    type: 'feature-shim',
    pattern: `src/components/${shim}/**`,
    mode: 'folder',
    capture: ['shim'],
  })),
  {
    type: 'shared',
    pattern: 'src/components/**',
    mode: 'folder',
  },
  {
    type: 'features-settings',
    pattern: 'src/features/settings/**',
    mode: 'folder',
  },
  {
    type: 'features',
    pattern: 'src/features/**',
    mode: 'folder',
    capture: ['feature'],
  },
  {
    type: 'app',
    pattern: 'src/app/**',
    mode: 'folder',
  },
  {
    type: 'infrastructure',
    pattern: 'src/{lib,api,types,contracts,store,hooks,context}/**',
    mode: 'folder',
  },
];

/** @type {import('eslint').Linter.Config} */
export const boundariesConfig = {
  plugins: {
    boundaries,
  },
  settings: {
    'boundaries/elements': elements,
    'boundaries/include': ['src/**/*'],
    'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
  },
  rules: {
    ...boundaries.configs.recommended.rules,
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        message: '{{from.type}} must not depend on {{to.type}} ({{dependency.source}})',
        rules: [
          {
            allow: {
              dependency: { relationship: { to: 'internal' } },
            },
          },
          {
            from: { type: 'app' },
            allow: {
              to: {
                type: [
                  'app',
                  'features',
                  'features-settings',
                  'shared',
                  'feature-shim',
                  'infrastructure',
                ],
              },
            },
          },
          {
            from: { type: 'features-settings' },
            allow: {
              to: { type: ['features', 'shared', 'feature-shim', 'infrastructure', 'app'] },
            },
          },
          {
            from: { type: 'features' },
            allow: {
              to: { type: ['shared', 'feature-shim', 'infrastructure', 'features'] },
            },
          },
          {
            from: { type: 'shared' },
            allow: {
              to: { type: ['shared', 'infrastructure', 'feature-shim'] },
            },
          },
          {
            from: { type: 'feature-shim' },
            allow: {
              to: { type: 'features' },
            },
          },
          {
            from: { type: 'infrastructure' },
            allow: {
              to: { type: ['infrastructure', 'shared'] },
            },
          },
        ],
      },
    ],
  },
};
