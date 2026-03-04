/**
 * Generates privateKey.pem and publicKey.pem in server/keys/
 * Run from server root: node scripts/generate-keys.js
 * Requires: npm install -g openssl (or use system openssl)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', 'keys');
const privatePath = path.join(keysDir, 'privateKey.pem');
const publicPath = path.join(keysDir, 'publicKey.pem');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

try {
  execSync(`openssl genrsa -out "${privatePath}" 2048`, { stdio: 'inherit' });
  execSync(`openssl rsa -in "${privatePath}" -pubout -out "${publicPath}"`, { stdio: 'inherit' });
  console.log('Created privateKey.pem and publicKey.pem in server/keys/');
} catch (e) {
  console.error('OpenSSL failed. Install OpenSSL and ensure "openssl" is in PATH.');
  process.exit(1);
}
