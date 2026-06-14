/**
 * Architecture layer rules (Scale P3 / Part IV §28.2).
 * @see WEBAPP_STRUCTURE.md §12.3, §19
 */
import boundaries from 'eslint-plugin-boundaries';

const DOMAIN_COMPONENTS = [
  'achievements',
  'auth',
  'blog',
  'connectivity',
  'explore',
  'legal',
  'platform',
  'profile',
  'settings',
  'squads',
  'tags',
  'topics',
];

/** @type {import('eslint-plugin-boundaries').BoundariesElement[]} */
const elements = [
  ...DOMAIN_COMPONENTS.map((domain) => ({
    type: 'domain-components',
    pattern: `src/components/${domain}/**`,
    mode: 'folder',
    capture: ['domain'],
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
                  'domain-components',
                  'infrastructure',
                ],
              },
            },
          },
          {
            from: { type: 'features-settings' },
            allow: {
              to: {
                type: [
                  'features',
                  'shared',
                  'domain-components',
                  'infrastructure',
                  'app',
                ],
              },
            },
          },
          {
            from: { type: 'features' },
            allow: {
              to: {
                type: [
                  'shared',
                  'domain-components',
                  'infrastructure',
                  'features',
                ],
              },
            },
          },
          {
            from: { type: 'shared' },
            allow: {
              to: { type: ['shared', 'infrastructure', 'domain-components'] },
            },
          },
          {
            from: { type: 'domain-components' },
            allow: {
              to: {
                type: [
                  'shared',
                  'infrastructure',
                  'features',
                  'domain-components',
                  'app',
                ],
              },
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
