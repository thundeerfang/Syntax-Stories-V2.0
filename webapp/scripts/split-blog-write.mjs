import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '../src/app/blogs/write/page.tsx');
const outDir = path.join(__dirname, '../src/features/blog/pages/write');
const lines = fs.readFileSync(srcPath, 'utf8').split('\n');
const importBlock = lines.slice(2, 47).join('\n');

const chunks = [
  { file: 'writeUtils.ts', start: 47, end: 301, rename: [] },
  { file: 'SummaryEditor.tsx', start: 301, end: 634, export: 'SummaryEditor' },
  { file: 'writeSyncHooks.ts', start: 634, end: 1149, exports: ['useBlogWritePageSyncEffects', 'useBlogWriteServerDraftSync', 'BlogWriteTopNav'] },
  { file: 'BlogWritePage.tsx', start: 1149, end: lines.length, defaultExport: 'WriteBlogPage' },
];

fs.mkdirSync(outDir, { recursive: true });

for (const c of chunks) {
  let body = lines.slice(c.start, c.end).join('\n');
  if (c.export) {
    body = body.replace(new RegExp(`^function ${c.export}`), `export function ${c.export}`);
  }
  if (c.exports) {
    for (const name of c.exports) {
      body = body.replace(new RegExp(`^function ${name}`), `export function ${name}`);
    }
  }
  if (c.defaultExport) {
    body = body.replace(
      new RegExp(`^export default function ${c.defaultExport}`),
      `export default function ${c.defaultExport}`,
    );
  }
  // Simpler: all files get full import block; BlogWritePage imports submodules
  const content =
    c.file === 'BlogWritePage.tsx'
      ? `'use client';\n\n${importBlock}\n\nimport { SummaryEditor } from './SummaryEditor';\nimport { BlogWriteTopNav, useBlogWritePageSyncEffects, useBlogWriteServerDraftSync } from './writeSyncHooks';\nimport {\n  thumbnailPreviewFromApi,\n  TITLE_MAX,\n  SUMMARY_MAX_WORDS,\n  serializeWriteWorkspace,\n  summaryWordCount,\n  draftSyncBadgeTitle,\n  draftSyncBadgeLabel,\n  MAX_BLOCKS_PER_SECTION,\n  type RevisionKind,\n  type RevisionEntry,\n  formatRevisionWhen,\n  revisionKindBadgeClass,\n  PRIMARY_SECTION_ID,\n  THUMB_MAX_MB,\n  REVISIONS_SIDEBAR_VISIBLE,\n  resolveCentreMaxWidthClass,\n  taxonomyApiFields,\n  taxonomyPayload,\n  type WriteFocusChrome,\n} from './writeUtils';\n\n${body}\n`
      : `'use client';\n\n${importBlock}\n\n${body}\n`;
  fs.writeFileSync(path.join(outDir, c.file), content);
  console.log('wrote', c.file);
}

fs.writeFileSync(
  path.join(outDir, 'index.ts'),
  `export { default as BlogWritePage } from './BlogWritePage';\nexport { default } from './BlogWritePage';\n`,
);

fs.writeFileSync(
  path.join(__dirname, '../src/app/blogs/write/page.tsx'),
  `export { default } from '@/features/blog/pages/write';\n`,
);

console.log('thinned app/blogs/write/page.tsx');
