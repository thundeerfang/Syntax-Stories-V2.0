#!/usr/bin/env node
/** Collapse all shadow-* variants → single `shadow` class. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const REPLACEMENTS = [
  ['hover:shadow-block-md-hover', 'hover:shadow-block-hover'],
  ['hover:shadow-block-sm-hover', 'hover:shadow-block-hover'],
  ['drop-shadow-glow-primary-strong', 'shadow'],
  ['drop-shadow-glow-primary-mix-sm', 'shadow'],
  ['drop-shadow-glow-primary-mix', 'shadow'],
  ['drop-shadow-glow-primary-8', 'shadow'],
  ['drop-shadow-glow-primary', 'shadow'],
  ['drop-shadow-respect-icon', 'shadow'],
  ['shadow-glow-primary-violet', 'shadow'],
  ['shadow-ring-background-2', 'shadow'],
  ['shadow-badge-destructive', 'shadow'],
  ['shadow-badge-warning', 'shadow'],
  ['shadow-md-primary-soft', 'shadow'],
  ['shadow-underline-black', 'shadow'],
  ['shadow-glow-primary-sm', 'shadow'],
  ['shadow-glow-primary-md', 'shadow'],
  ['shadow-glow-primary-lg', 'shadow'],
  ['shadow-ring-background', 'shadow'],
  ['shadow-md-black-solid', 'shadow'],
  ['shadow-lg-destructive', 'shadow'],
  ['shadow-xl-black-solid', 'shadow'],
  ['shadow-sm-primary-mix', 'shadow'],
  ['shadow-block-md-hover', 'shadow'],
  ['shadow-block-sm-hover', 'shadow'],
  ['shadow-settings-icon', 'shadow'],
  ['shadow-glass-toolbar', 'shadow'],
  ['shadow-toolbar-muted', 'shadow'],
  ['shadow-elevated-soft', 'shadow'],
  ['shadow-glass-badge', 'shadow'],
  ['shadow-sm-black-20', 'shadow'],
  ['shadow-sm-white-25', 'shadow'],
  ['shadow-inset-field', 'shadow'],
  ['shadow-ring-border', 'shadow'],
  ['shadow-inset-white-ring', 'shadow'],
  ['shadow-lg-primary', 'shadow'],
  ['shadow-xl-primary', 'shadow'],
  ['shadow-tab-active', 'shadow'],
  ['shadow-sm-current', 'shadow'],
  ['shadow-float-hero', 'shadow'],
  ['shadow-dock-light', 'shadow'],
  ['shadow-violet-900', 'shadow'],
  ['shadow-cta-muted', 'shadow'],
  ['shadow-dock-dark', 'shadow'],
  ['shadow-hero-lift', 'shadow'],
  ['shadow-md-black', 'shadow'],
  ['shadow-md-glass', 'shadow'],
  ['shadow-float-md', 'shadow'],
  ['shadow-inset-sm', 'shadow'],
  ['shadow-inset-md', 'shadow'],
  ['shadow-7-muted', 'shadow'],
  ['shadow-primary', 'shadow'],
  ['drop-shadow-md', 'shadow'],
  ['drop-shadow-sm', 'shadow'],
  ['hover:shadow-cta', 'hover:shadow'],
  ['hover:shadow-lg', 'hover:shadow'],
  ['hover:shadow-sm', 'hover:shadow'],
  ['disabled:shadow-md', 'disabled:shadow'],
  ['md:shadow-3xl', 'md:shadow'],
  ['sm:shadow-3xl', 'sm:shadow'],
  ['sm:shadow-2xl', 'sm:shadow'],
  ['shadow-4xl', 'shadow'],
  ['shadow-3xl', 'shadow'],
  ['shadow-2xl', 'shadow'],
  ['shadow-cta', 'shadow'],
  ['shadow-md', 'shadow'],
  ['shadow-lg', 'shadow'],
  ['shadow-xl', 'shadow'],
  ['shadow-sm', 'shadow'],
  ['shadow-xs', 'shadow'],
  ['shadow-inner', 'shadow'],
].sort((a, b) => b[0].length - a[0].length);

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
  for (const [from, to] of REPLACEMENTS) {
    if (!text.includes(from)) continue;
    const n = text.split(from).length - 1;
    text = text.split(from).join(to);
    count += n;
  }
  if (count > 0) {
    fs.writeFileSync(file, text);
    total += count;
    console.log(`${count}\t${path.relative(ROOT, file)}`);
  }
}
console.log(`\n${total} replacements.`);
