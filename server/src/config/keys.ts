import fs from 'fs';
import path from 'path';

// From dist/config/keys.js, keys live in server/keys/
const keysDir = path.resolve(__dirname, '..', '..', 'keys');
const privateKeyPath = path.join(keysDir, 'privateKey.pem');
const publicKeyPath = path.join(keysDir, 'publicKey.pem');

function readKey(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export const privateKey = readKey(privateKeyPath);
export const publicKey = readKey(publicKeyPath);

if (!privateKey || !publicKey) {
  console.warn(
    '[Keys] JWT PEM files not found. Add privateKey.pem and publicKey.pem to server/keys/. Run: npm run generate-keys'
  );
}
