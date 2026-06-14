#!/usr/bin/env node
/**
 * Strip comments and collapse extra blank lines in TS/TSX under src/.
 * Uses the TypeScript printer (removeComments) so strings and JSX stay intact.
 *
 * Usage: node scripts/strip-comments.mjs [dir ...]
 * Default dirs: components, api, context, features, hooks, lib, store, types, variable
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webappRoot = path.join(__dirname, '..');

const DEFAULT_DIRS = [
  'src/components',
  'src/api',
  'src/context',
  'src/features',
  'src/hooks',
  'src/lib',
  'src/store',
  'src/types',
  'src/variable',
];

const args = process.argv.slice(2);
const targetRoots = (args.length ? args : DEFAULT_DIRS).map((d) =>
  path.isAbsolute(d) ? d : path.join(webappRoot, d)
);

function scriptKindFor(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.ts')) return ts.ScriptKind.TS;
  return null;
}

function normalizeBlankLines(text) {
  const lines = text.split('\n').map((line) => line.trimEnd());
  const out = [];
  let blankRun = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blankRun += 1;
      if (blankRun <= 1) out.push('');
      continue;
    }
    blankRun = 0;
    out.push(line);
  }
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

function stripFile(filePath) {
  const kind = scriptKindFor(filePath);
  if (!kind) return false;

  const before = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, before, ts.ScriptTarget.Latest, true, kind);
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: true,
  });
  const printed = printer.printFile(sourceFile);
  const after = normalizeBlankLines(printed);

  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
    return true;
  }
  return false;
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (/\.tsx?$/.test(ent.name) && !ent.name.endsWith('.d.ts')) files.push(full);
  }
  return files;
}

let changed = 0;
let scanned = 0;

for (const root of targetRoots) {
  if (!fs.existsSync(root)) {
    console.warn(`[strip-comments] skip missing: ${path.relative(webappRoot, root)}`);
    continue;
  }
  for (const file of walk(root)) {
    scanned += 1;
    if (stripFile(file)) {
      changed += 1;
      console.log(`updated ${path.relative(webappRoot, file)}`);
    }
  }
}

console.log(`[strip-comments] scanned ${scanned} files, updated ${changed}`);
