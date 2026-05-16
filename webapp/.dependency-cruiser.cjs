/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-shared-to-features',
      comment:
        'Shared components/ must not import features/ (use feature-shim barrels during migration).',
      severity: 'error',
      from: {
        path: '^src/components/(?!blog/|profile/|squads/|explore/|topics/|tags/|legal/|connectivity/|auth/)',
      },
      to: { path: '^src/features/' },
    },
    {
      name: 'no-shared-to-app',
      comment: 'Shared components/ must not import app/ routes.',
      severity: 'error',
      from: {
        path: '^src/components/(?!blog/|profile/|squads/|explore/|topics/|tags/|legal/|connectivity/|auth/)',
      },
      to: { path: '^src/app/' },
    },
    {
      name: 'no-feature-to-app',
      comment:
        'Features must not import app/ (exception: settings until app/settings is moved — Scale P9).',
      severity: 'error',
      from: { path: '^src/features/(?!settings/)' },
      to: { path: '^src/app/' },
    },
    {
      name: 'no-infra-to-ui-layers',
      comment: 'lib/api/types must not import app, features, or components.',
      severity: 'error',
      from: { path: '^src/(lib|api|types|contracts|store|hooks|context)/' },
      to: { path: '^src/(app|features|components)/' },
    },
    {
      name: 'no-deep-feature-imports',
      comment:
        'Outside features/, import @/features/<name> only — not .../components/... internal paths.',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/features/'] },
      to: {
        path: '^src/features/[^/]+/(components|hooks|services|api|store|sections|lib|config)/',
      },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules|\\.next|coverage|reports',
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['types', 'main', 'module'],
    },
  },
};
