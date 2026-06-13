import { parseGithubRepoUrl } from '@/api/github';
import { validateMermaidSource } from '@/lib/blog/mermaidValidate';
import { tableHasContent, MAX_TABLE_COLS, MAX_TABLE_ROWS } from '@/lib/blog/tableBlockLimits';
import type { Block } from '@/types/blog';

export function validateBlocksForPublish(blocks: Block[]): string | null {
  for (const block of blocks) {
    if (block.type === 'githubRepo') {
      const p = block.payload as Record<string, unknown> | undefined;
      const url = typeof p?.url === 'string' ? p.url.trim() : '';
      const owner = typeof p?.owner === 'string' ? p.owner.trim() : '';
      const repo = typeof p?.repo === 'string' ? p.repo.trim() : '';
      if (!owner || !repo) continue;
      if (url && !parseGithubRepoUrl(url)) {
        return 'GitHub repo block must use a valid https://github.com/owner/repo URL.';
      }
      if (!url && !parseGithubRepoUrl(`https://github.com/${owner}/${repo}`)) {
        return 'GitHub repo block has an invalid owner/repo.';
      }
    }

    if (block.type === 'table') {
      const p = block.payload as { rows?: string[][] } | undefined;
      const rows = Array.isArray(p?.rows) ? p!.rows! : [];
      if (rows.length > MAX_TABLE_ROWS) {
        return `Table block exceeds ${MAX_TABLE_ROWS} rows.`;
      }
      const maxCols = rows.length ? Math.max(...rows.map((r) => r.length)) : 0;
      if (maxCols > MAX_TABLE_COLS) {
        return `Table block exceeds ${MAX_TABLE_COLS} columns.`;
      }
      if (rows.length > 0 && !tableHasContent(rows)) {
        return 'Table block needs at least one filled cell.';
      }
    }
  }
  return null;
}

export async function validateBlocksForPublishAsync(blocks: Block[]): Promise<string | null> {
  const syncError = validateBlocksForPublish(blocks);
  if (syncError) return syncError;

  for (const block of blocks) {
    if (block.type !== 'mermaidDiagram') continue;
    const p = block.payload as { source?: string } | undefined;
    const source = typeof p?.source === 'string' ? p.source : '';
    if (!source.trim()) continue;
    const res = await validateMermaidSource(source);
    if (!res.ok) return res.message;
  }

  return null;
}
