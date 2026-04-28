'use strict';

/**
 * Installs deps for `webapp/packages/shared` (@syntax-stories/shared).
 * Skips if the folder is missing (should not happen for normal webapp checkouts).
 * Uses `npm ci` when package-lock.json exists; otherwise `npm install`.
 */
const { existsSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { execSync } = require('node:child_process');

const webappRoot = resolve(__dirname, '..');
const sharedRoot = join(webappRoot, 'packages', 'shared');
const pkgJson = join(sharedRoot, 'package.json');
const lockfile = join(sharedRoot, 'package-lock.json');

if (!existsSync(pkgJson)) {
  console.log('[install-shared-deps] webapp/packages/shared not found — skip.');
  process.exit(0);
}

if (existsSync(lockfile)) {
  execSync('npm ci', { cwd: sharedRoot, stdio: 'inherit' });
} else {
  console.warn(
    '[install-shared-deps] no package-lock.json in webapp/packages/shared — npm install --omit=dev',
  );
  execSync('npm install --omit=dev', { cwd: sharedRoot, stdio: 'inherit' });
}
