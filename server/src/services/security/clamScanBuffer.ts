import net from 'node:net';
import { env } from '../../config/env.js';

/**
 * Send buffer to clamd via INSTREAM (TCP).
 * @see https://manpages.debian.org/testing/clamav-daemon/clamd.8.en.html
 */
export async function scanBufferWithClamAV(buffer: Buffer): Promise<{ ok: boolean; detail: string }> {
  const host = env.CLAMAV_HOST?.trim();
  if (!host) {
    return { ok: true, detail: 'clamav_disabled' };
  }

  const port = Number.isFinite(env.CLAMAV_PORT) ? env.CLAMAV_PORT : 3310;

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      fn();
    };

    const timer = setTimeout(() => {
      settle(() => resolve({ ok: false, detail: 'clamav_timeout' }));
    }, 20_000);

    socket.once('error', (err) => {
      settle(() => reject(err));
    });

    socket.once('connect', () => {
      const out: Buffer[] = [Buffer.from('zINSTREAM\0')];
      const chunkSize = 2048;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const slice = buffer.subarray(i, Math.min(i + chunkSize, buffer.length));
        const len = Buffer.allocUnsafe(4);
        len.writeUInt32BE(slice.length, 0);
        out.push(len, slice);
      }
      out.push(Buffer.alloc(4, 0));
      socket.write(Buffer.concat(out));
    });

    socket.on('data', (d) => {
      chunks.push(d);
    });

    socket.once('close', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      settle(() => {
        if (/FOUND/i.test(text)) {
          resolve({ ok: false, detail: text || 'clamav_found' });
          return;
        }
        if (/OK/i.test(text)) {
          resolve({ ok: true, detail: text || 'clamav_ok' });
          return;
        }
        resolve({ ok: false, detail: text || 'clamav_empty_response' });
      });
    });
  });
}
