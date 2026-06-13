import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/features/blog/pages/write'
);
const lines = fs.readFileSync(path.join(root, 'BlogWritePage.tsx'), 'utf8').split('\n');
const imports = lines.slice(0, 47).join('\n');

const utilsBody = lines.slice(48, 1149).join('\n');
const utils = `${imports}

${utilsBody
  .replace(/^function /gm, 'export function ')
  .replace(/^type /gm, 'export type ')
  .replace(/^const /gm, 'export const ')}
`;
fs.writeFileSync(path.join(root, 'blogWritePageUtils.tsx'), utils);

const mainBody = lines.slice(1149).join('\n');
const main = `${imports}

import {
  SummaryEditor,
  BlogWriteTopNav,
  useBlogWritePageSyncEffects,
  useBlogWriteServerDraftSync,
  thumbnailPreviewFromApi,
  TITLE_MAX,
  SUMMARY_MAX_WORDS,
  serializeWriteWorkspace,
  summaryWordCount,
  draftSyncBadgeTitle,
  draftSyncBadgeLabel,
  MAX_BLOCKS_PER_SECTION,
  type RevisionKind,
  type RevisionEntry,
  formatRevisionWhen,
  revisionKindBadgeClass,
  PRIMARY_SECTION_ID,
  THUMB_MAX_MB,
  REVISIONS_SIDEBAR_VISIBLE,
  resolveCentreMaxWidthClass,
  taxonomyApiFields,
  taxonomyPayload,
  type WriteFocusChrome,
  focusContextLabel,
} from './blogWritePageUtils';

${mainBody}
`;
fs.writeFileSync(path.join(root, 'BlogWritePage.tsx'), main);
console.log('utils', 1149 - 48, 'main', lines.length - 1149);
