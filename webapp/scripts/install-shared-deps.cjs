'use strict';

/**
 * Installs deps for `packages/shared` when present (monorepo / CI).
 * Skips cleanly when only `webapp/` is deployed (no sibling `packages/shared`).
 * Uses `npm ci` only when package-lock.json exists; otherwise `npm install`.
 */
const { existsSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { execSync } = require('node:child_process');

const webappRoot = resolve(__dirname, '..');
const sharedRoot = resolve(webappRoot, '..', 'packages', 'shared');
const pkgJson = join(sharedRoot, 'package.json');
const lockfile = join(sharedRoot, 'package-lock.json');

if (!existsSync(pkgJson)) {
  console.log('[install-shared-deps] packages/shared not found — skip.');
  process.exit(0);
}

if (existsSync(lockfile)) {
  execSync('npm ci', { cwd: sharedRoot, stdio: 'inherit' });
} else {
  console.warn(
    '[install-shared-deps] no package-lock.json in packages/shared — npm install --omit=dev',
  );
  execSync('npm install --omit=dev', { cwd: sharedRoot, stdio: 'inherit' });
}
