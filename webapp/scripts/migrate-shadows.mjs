#!/usr/bin/env node
/**
 * Maps legacy `shadow-[…]` arbitrary classes → single `shadow` token.
 * Run: node scripts/migrate-shadows.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TARGET = 'shadow';

const LEGACY_ARBITRARY = [
  /shadow-\[[^\]]+\]/g,
  /hover:shadow-\[[^\]]+\]/g,
  /disabled:shadow-\[[^\]]+\]/g,
  /drop-shadow-\[[^\]]+\]/g,
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(tsx?|jsx?|css|md)$/.test(ent.name)) files.push(p);
  }
  return files;
}

let total = 0;
for (const file of walk(path.join(ROOT, 'src'))) {
  if (file.endsWith('shadows.js')) continue;
  let text = fs.readFileSync(file, 'utf8');
  let count = 0;
  for (const re of LEGACY_ARBITRARY) {
    text = text.replace(re, (match) => {
      if (
        match.includes('shadow-none') ||
        match.includes('block-btn-hover') ||
        match.includes('ghost-btn-hover')
      ) {
        return match;
      }
      count += 1;
      const prefix = match.startsWith('hover:')
        ? 'hover:'
        : match.startsWith('disabled:')
          ? 'disabled:'
          : '';
      return `${prefix}${TARGET}`;
    });
  }
  if (count > 0) {
    fs.writeFileSync(file, text);
    total += count;
    console.log(`${count}\t${path.relative(ROOT, file)}`);
  }
}
console.log(`\n${total} arbitrary shadows → ${TARGET}.`);
