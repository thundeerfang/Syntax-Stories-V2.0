/**
 * One-off: extract SettingsPage section components into features/settings/sections/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../src/features/settings');
const srcPath = path.join(root, 'SettingsPage.tsx');
const lines = fs.readFileSync(srcPath, 'utf8').split('\n');

const importEnd = 132; // 0-based index 133 is blank after imports
const importBlock = lines.slice(2, importEnd).join('\n');

const sections = [
  { file: 'SyntaxCardSection.tsx', start: 135, end: 176, exportName: 'SyntaxCardContent' },
  { file: 'EditProfileSection.tsx', start: 176, end: 847, exportName: 'EditProfileContent' },
  { file: 'SecurityEmailSection.tsx', start: 847, end: 1034, exportName: 'SecurityEmailContent' },
  { file: 'ConnectedAccountsSection.tsx', start: 1034, end: 1179, exportName: 'ConnectedAccountsContent' },
  { file: 'StackAndToolsSection.tsx', start: 1179, end: 1479, exportName: 'StackAndToolsContent' },
  { file: 'MySetupSection.tsx', start: 1479, end: 1716, exportName: 'MySetupContent' },
  { file: 'workExperienceForm.ts', start: 1716, end: 2190, exportName: null, lib: true },
  { file: 'WorkExperiencesSection.tsx', start: 2190, end: 3111, exportName: 'WorkExperiencesContent' },
  { file: 'EducationSection.tsx', start: 3111, end: 3453, exportName: 'EducationContent' },
  { file: 'CertificationsSection.tsx', start: 3453, end: 3967, exportName: 'CertificationsContent' },
  { file: 'ProjectsSection.tsx', start: 3967, end: 4381, exportName: 'ProjectsContent' },
  { file: 'OpenSourceSection.tsx', start: 4382, end: 4632, exportName: 'OpenSourceContent' },
];

const shellStart = 4633; // export default function SettingsPage
const shellLines = lines.slice(shellStart);

const outSections = path.join(root, 'sections');
const outLib = path.join(root, 'lib');
fs.mkdirSync(outSections, { recursive: true });
fs.mkdirSync(outLib, { recursive: true });

for (const s of sections) {
  const body = lines.slice(s.start, s.end).join('\n');
  const isLib = s.lib === true;
  const exportLine = s.exportName ? `\nexport { ${s.exportName} };\n` : '';
  const renamedBody = s.exportName
    ? body.replace(new RegExp(`^function ${s.exportName}`, 'm'), `export function ${s.exportName}`)
    : body.replace(/^type /gm, 'export type ').replace(/^const /gm, 'export const ').replace(/^function /gm, 'export function ').replace(/^interface /gm, 'export interface ');

  const content = isLib
    ? `'use client';\n\n${importBlock}\n\n${renamedBody}\n`
    : `'use client';\n\n${importBlock}\n\n${renamedBody}${exportLine}`;

  const outPath = path.join(isLib ? outLib : outSections, s.file);
  fs.writeFileSync(outPath, content);
  console.log('wrote', outPath);
}

const sectionImports = sections
  .filter((s) => s.exportName)
  .map((s) => `import { ${s.exportName} } from './sections/${s.file.replace('.tsx', '')}';`)
  .join('\n');

const shellImports = `'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/auth';
import { SettingsContentSkeleton, SettingsSidebarSkeleton, StackToolsSettingsSkeleton } from '@/components/skeletons';
import { PaymentsSettingsContent } from '@/app/settings/PaymentsSettingsContent';
import { BlogStreakSettingsContent } from '@/app/settings/BlogStreakSettingsContent';
import { SettingsComingSoonPlaceholder } from './components/SettingsComingSoonPlaceholder';
import {
  SETTINGS_ACCORDION_VARIANTS,
  SETTINGS_IMPLEMENTED_SECTION_IDS,
  SETTINGS_NAV_GROUPS,
} from './config/nav';
${sectionImports}
`;

const shellBody = shellLines
  .join('\n')
  .replace(/function SettingsPage/g, 'export default function SettingsPage');

fs.writeFileSync(path.join(root, 'SettingsPage.tsx'), `${shellImports}\n${shellBody}`);
console.log('wrote slim SettingsPage.tsx');

const indexExports = sections
  .filter((s) => s.exportName)
  .map((s) => `export { ${s.exportName} } from './${s.file.replace('.tsx', '')}';`)
  .join('\n');
fs.writeFileSync(path.join(outSections, 'index.ts'), `${indexExports}\n`);
