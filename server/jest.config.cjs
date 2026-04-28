/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  setupFiles: ['<rootDir>/src/test/setup-env.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/test/**',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
  // Set ENFORCE_COVERAGE=1 (e.g. in GitHub Actions) to require ≥80% once suites are broad enough.
  ...(process.env.ENFORCE_COVERAGE === '1'
    ? {
        coverageThreshold: {
          global: { branches: 80, functions: 80, lines: 80, statements: 80 },
        },
      }
    : {}),
  testTimeout: 20_000,
};
