import hljs from 'highlight.js/lib/common';

/**
 * Languages registered by `highlight.js/lib/common` — used to bound auto-detect cost
 * and keep results relevant for typical blog snippets.
 */
export const HLJS_AUTO_DETECT_SUBSET: string[] = [
  'typescript',
  'javascript',
  'json',
  'python',
  'rust',
  'go',
  'java',
  'c',
  'cpp',
  'csharp',
  'css',
  'scss',
  'xml',
  'markdown',
  'bash',
  'shell',
  'sql',
  'yaml',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'graphql',
  'diff',
  'plaintext',
];

/** Labels for the write-blog language override dropdown (subset + common aliases). */
export const CODE_LANGUAGE_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'plaintext', label: 'Plain text' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'tsx', label: 'TSX' },
  { id: 'jsx', label: 'JSX' },
  { id: 'json', label: 'JSON' },
  { id: 'python', label: 'Python' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
  { id: 'java', label: 'Java' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'css', label: 'CSS' },
  { id: 'scss', label: 'SCSS' },
  { id: 'xml', label: 'HTML / XML' },
  { id: 'bash', label: 'Bash' },
  { id: 'shell', label: 'Shell' },
  { id: 'sql', label: 'SQL' },
  { id: 'yaml', label: 'YAML' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'php', label: 'PHP' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'swift', label: 'Swift' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'graphql', label: 'GraphQL' },
  { id: 'diff', label: 'Diff' },
];

function resolveLanguageId(raw: string | undefined | null): string | null {
  const t = raw?.trim().toLowerCase();
  if (!t || t === 'auto' || t === 'text') return null;
  const aliases: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    py: 'python',
    rs: 'rust',
    yml: 'yaml',
    sh: 'bash',
    html: 'xml',
    htm: 'xml',
  };
  const id = aliases[t] ?? t;
  return hljs.getLanguage(id) ? id : null;
}

/** Infer language from snippet text (highlight.js auto-detect, bounded subset). */
export function inferCodeLanguage(code: string): string {
  const t = code.trim();
  if (!t) return 'plaintext';
  try {
    const r = hljs.highlightAuto(t, HLJS_AUTO_DETECT_SUBSET);
    if (r.language && hljs.getLanguage(r.language)) return r.language;
  } catch {
    /* ignore */
  }
  return 'plaintext';
}

/** Produce highlighted HTML (safe: escaped by highlight.js). */
export function highlightCodeToHtml(
  code: string,
  languageHint?: string | null,
): { language: string; html: string } {
  const safe = code ?? '';
  const resolved = resolveLanguageId(languageHint ?? undefined);
  if (resolved) {
    try {
      const r = hljs.highlight(safe, { language: resolved });
      return { language: resolved, html: r.value };
    } catch {
      /* fall through to auto */
    }
  }
  try {
    const r = hljs.highlightAuto(safe, HLJS_AUTO_DETECT_SUBSET);
    const lang =
      r.language && hljs.getLanguage(r.language) ? r.language : 'plaintext';
    const out = hljs.highlight(safe, { language: lang });
    return { language: lang, html: out.value };
  } catch {
    const r = hljs.highlight(safe, { language: 'plaintext' });
    return { language: 'plaintext', html: r.value };
  }
}
