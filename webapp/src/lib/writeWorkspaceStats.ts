import type { Block } from '@/components/ui/BlogWriteEditor';
import type {
  CodePayload,
  GithubRepoPayload,
  ImagePayload,
  MermaidDiagramPayload,
  ParagraphPayload,
  TablePayload,
  UnsplashPayload,
  VideoEmbedPayload,
} from '@/types/blog';

/** Count words in plain text (ASCII-ish; good enough for editor stats). */
export function countWordsInPlainText(text: string): number {
  const t = text.replaceAll(/\s+/g, ' ').trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function extractTextFromTipTapNode(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as Record<string, unknown>;
  if (n.type === 'text' && typeof n.text === 'string') return n.text;
  const c = n.content;
  if (!Array.isArray(c)) return '';
  return c.map((child) => extractTextFromTipTapNode(child)).join('');
}

export function paragraphPayloadPlainText(payload: ParagraphPayload | undefined): string {
  if (!payload) return '';
  if (payload.doc) return extractTextFromTipTapNode(payload.doc);
  return payload.text ?? '';
}

/** Word count from summary HTML (same idea as write page summary limits). */
export function countWordsInSummaryHtml(html: string): number {
  if (!html || html === '<br>') return 0;
  if (typeof document === 'undefined') {
    const text = html.replaceAll(/<[^>]*>/g, ' ').replaceAll('&nbsp;', ' ');
    return countWordsInPlainText(text);
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent ?? '';
  return countWordsInPlainText(text);
}

export function countWordsForBlock(block: Block): number {
  const p = (block as { payload?: unknown }).payload as Record<string, unknown> | undefined;
  switch (block.type) {
    case 'paragraph':
      return countWordsInPlainText(paragraphPayloadPlainText(p as ParagraphPayload));
    case 'heading':
      return countWordsInPlainText(typeof p?.text === 'string' ? p.text : '');
    case 'code':
      return countWordsInPlainText(String((p as CodePayload | undefined)?.code ?? ''));
    case 'table': {
      const rows = (p as TablePayload | undefined)?.rows ?? [];
      return countWordsInPlainText(rows.map((r) => r.join(' ')).join(' '));
    }
    case 'mermaidDiagram':
      return countWordsInPlainText(String((p as MermaidDiagramPayload | undefined)?.source ?? ''));
    case 'image':
      return countWordsInPlainText(String((p as ImagePayload | undefined)?.title ?? ''));
    case 'videoEmbed': {
      const v = p as VideoEmbedPayload | undefined;
      const urls = v?.videos ?? (v?.url ? [v.url] : []);
      return countWordsInPlainText(urls.join(' '));
    }
    case 'githubRepo': {
      const g = p as GithubRepoPayload | undefined;
      return countWordsInPlainText(
        [g?.name, g?.description, g?.owner, g?.repo].filter(Boolean).join(' '),
      );
    }
    case 'unsplashImage': {
      const u = p as UnsplashPayload | undefined;
      return countWordsInPlainText([u?.caption, u?.photographer].filter(Boolean).join(' '));
    }
    case 'partition':
    case 'link':
      return 0;
    default:
      return 0;
  }
}

export function totalWorkspaceWordCount(args: {
  title: string;
  summaryHtml: string;
  blocks: Block[];
}): number {
  let n = countWordsInPlainText(args.title);
  n += countWordsInSummaryHtml(args.summaryHtml);
  for (const b of args.blocks) n += countWordsForBlock(b);
  return n;
}

/** Labels aligned with Tools / DEFAULT_ITEMS where applicable. */
export function blockTypeDisplayName(type: string): string {
  switch (type) {
    case 'paragraph':
      return 'Paragraph';
    case 'heading':
      return 'Sub-heading';
    case 'partition':
      return 'Divider';
    case 'code':
      return 'Code';
    case 'image':
      return 'Image';
    case 'videoEmbed':
      return 'Video';
    case 'githubRepo':
      return 'GitHub repo';
    case 'unsplashImage':
      return 'Unsplash';
    case 'table':
      return 'Table';
    case 'mermaidDiagram':
      return 'Mermaid';
    case 'link':
      return 'Link';
    default:
      return type;
  }
}
