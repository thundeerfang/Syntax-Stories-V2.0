import fs from 'node:fs';
import path from 'node:path';

// Render Secret Files are mounted at /etc/secrets/<filename>
const RENDER_SECRETS_DIR = '/etc/secrets';
const privateKeyPem = 'privateKey.pem';
const publicKeyPem = 'publicKey.pem';

// From dist/config/keys.js, keys live in server/keys/
const keysDir = path.resolve(__dirname, '..', '..', 'keys');

function readKey(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function loadKey(filename: string): string | null {
  const fromSecrets = readKey(path.join(RENDER_SECRETS_DIR, filename));
  if (fromSecrets) return fromSecrets;
  return readKey(path.join(keysDir, filename));
}

export const privateKey = loadKey(privateKeyPem);
export const publicKey = loadKey(publicKeyPem);

if ((!privateKey || !publicKey) && process.env.NODE_ENV !== 'test') {
  console.warn(
    '[Keys] JWT PEM files not found. Add privateKey.pem and publicKey.pem to server/keys/. Run: npm run generate-keys'
  );
}
