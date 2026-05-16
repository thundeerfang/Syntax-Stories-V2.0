'use strict';

/**
 * Installs and builds @syntax-stories/shared (webapp/packages/shared).
 * Required because the package is linked via `file:` and must not use `prepare`
 * (npm would run build before this package's own deps exist during parent `npm ci`).
 */
const { existsSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { execSync } = require('node:child_process');

const serverRoot = resolve(__dirname, '..');
const sharedRoot = join(serverRoot, '..', 'webapp', 'packages', 'shared');
const pkgJson = join(sharedRoot, 'package.json');
const lockfile = join(sharedRoot, 'package-lock.json');

if (!existsSync(pkgJson)) {
  console.log('[install-shared-package] webapp/packages/shared not found — skip.');
  process.exit(0);
}

if (existsSync(lockfile)) {
  execSync('npm ci', { cwd: sharedRoot, stdio: 'inherit' });
} else {
  console.warn(
    '[install-shared-package] no package-lock.json in webapp/packages/shared — npm install --omit=dev',
  );
  execSync('npm install --omit=dev', { cwd: sharedRoot, stdio: 'inherit' });
}

console.log('[install-shared-package] building @syntax-stories/shared…');
execSync('npm run build', { cwd: sharedRoot, stdio: 'inherit' });
