import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { env } from './env.js';

/** PID of clamd we spawned (not brew); stopped on dev server exit. */
let spawnedClamdPid: number | null = null;

function registerClamdCleanup(): void {
  const kill = () => {
    if (!spawnedClamdPid) return;
    try {
      process.kill(spawnedClamdPid, 'SIGTERM');
    } catch {
      /* ignore */
    }
    spawnedClamdPid = null;
  };
  process.once('SIGINT', kill);
  process.once('SIGTERM', kill);
  process.once('beforeExit', kill);
}

function resolveClamdBinary(): string | null {
  const fromEnv = process.env.CLAMD_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    '/opt/homebrew/opt/clamav/sbin/clamd',
    '/usr/local/opt/clamav/sbin/clamd',
    '/usr/sbin/clamd',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function resolveClamdConf(): string | null {
  const fromEnv = process.env.CLAMD_CONF?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    '/opt/homebrew/etc/clamav/clamd.conf',
    '/usr/local/etc/clamav/clamd.conf',
    '/etc/clamav/clamd.conf',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function canConnect(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(false);
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(true);
    });
    socket.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

function tryBrewServicesStartClamav(): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform !== 'darwin') {
      resolve();
      return;
    }
    const p = spawn('brew', ['services', 'start', 'clamav'], {
      stdio: 'ignore',
      env: process.env,
    });
    p.on('error', () => resolve());
    p.on('close', () => resolve());
  });
}

/**
 * In development, if CLAMAV_HOST is localhost and nothing listens on CLAMAV_PORT,
 * try `brew services start clamav` (macOS) and/or spawn `clamd --foreground`.
 * Production: no-op. Tests: disabled via CLAMAV_AUTO_START=false in setup-env.
 */
export async function ensureLocalClamd(): Promise<void> {
  if (env.NODE_ENV === 'production') return;
  if (env.NODE_ENV === 'test') return;
  if (!env.CLAMAV_AUTO_START) return;

  const host = env.CLAMAV_HOST?.trim();
  if (!host) return;

  const local = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  if (!local) return;

  const port = env.CLAMAV_PORT;
  if (await canConnect(host, port, 400)) {
    console.log(`[ClamAV] Daemon reachable at ${host}:${port}`);
    return;
  }

  console.log('[ClamAV] Nothing listening; attempting to start local clamd…');

  await tryBrewServicesStartClamav();
  await sleep(2000);
  if (await canConnect(host, port, 500)) {
    console.log(`[ClamAV] Ready at ${host}:${port} (brew services)`);
    return;
  }

  const clamd = resolveClamdBinary();
  const conf = resolveClamdConf();
  if (!clamd) {
    console.warn(
      '[ClamAV] clamd binary not found. Install ClamAV (e.g. brew install clamav) or set CLAMD_PATH.'
    );
    return;
  }
  if (!conf) {
    console.warn(
      '[ClamAV] clamd.conf not found. Run server/scripts/setup-clamav-homebrew.sh or set CLAMD_CONF.'
    );
    return;
  }

  const child = spawn(clamd, ['-c', conf, '--foreground'], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  if (child.pid) {
    spawnedClamdPid = child.pid;
    registerClamdCleanup();
  }

  for (let i = 0; i < 40; i++) {
    await sleep(400);
    if (await canConnect(host, port, 600)) {
      console.log(`[ClamAV] Started local clamd (pid ${child.pid}) at ${host}:${port}`);
      return;
    }
  }
  console.warn(`[ClamAV] Timed out waiting for clamd on ${host}:${port}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
