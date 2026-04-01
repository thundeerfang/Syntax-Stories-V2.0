import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Trash2,
  Image as ImageIcon,
  Gauge,
  Film,
  Link2,
  Camera,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AtSign,
  ExternalLink,
  X,
  Type,
  GripVertical,
  Globe,
  AlignLeft,
  Square,
  StretchHorizontal,
} from 'lucide-react';
import { GithubIcon } from '@/components/icons/SocialProviderIcons';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import { followApi, type FollowUser } from '@/api/follow';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadMedia } from '@/api/upload';
import { searchGifs, type GiphyGif } from '@/api/giphy';
import { searchUnsplashPhotos, type UnsplashPhoto } from '@/api/unsplash';
import { fetchRepoByUrl, fetchMyRepos, parseGithubRepoUrl, type GithubRepoListItem } from '@/api/github';
import type { ImageBlockLayout, ImagePayload } from '@/types/blog';

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'partition'
  | 'image'
  | 'gif'
  | 'videoEmbed'
  | 'link'
  | 'githubRepo'
  | 'unsplashImage';

export type HeadingLevel = 2 | 3;

export interface BlockBase {
  id: string;
  type: BlockType;
  sectionId?: string;
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  payload: { text: string };
}

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  payload: { text: string; level?: HeadingLevel };
}

export type Block = ParagraphBlock | HeadingBlock | (BlockBase & { payload?: any });

// Simple helper matching the older API: create a paragraph in default section "s-1"
export function createBlock(type: BlockType): Block {
  return createBlockInSection(type, 's-1');
}

export function createBlockInSection(type: BlockType, sectionId: string): Block {
  const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  if (type === 'paragraph') {
    return { id, type: 'paragraph', sectionId, payload: { text: '' } };
  }
  if (type === 'heading') {
    return { id, type: 'heading', sectionId, payload: { text: '', level: 2 as HeadingLevel } };
  }
  return { id, type, sectionId, payload: {} };
}

const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
const IMAGE_MAX_MB = 5;

const UL_ITEM_LINE = /^\s*[-*]\s+(.*)$/;
const OL_ITEM_LINE = /^\s*\d+\.\s+(.*)$/;

function richExecCommand(commandId: string, showUI = false, value?: string | null): boolean {
  return document.execCommand(commandId, showUI, value ?? undefined); // NOSONAR S1874
}

function richQueryCommandState(commandId: string): boolean {
  return document.queryCommandState(commandId); // NOSONAR S1874
}

function getBrowserSelection(): Selection | null {
  if (typeof document === 'undefined') return null;
  return document.getSelection();
}

function consumeMarkdownListBlock(
  lines: string[],
  start: number,
  pattern: RegExp,
  wrap: (inner: string) => string,
  inline: (s: string) => string,
): { html: string; next: number } | null {
  if (!pattern.exec(lines[start] ?? '')) return null;
  let i = start;
  let inner = '';
  while (i < lines.length) {
    const m = pattern.exec(lines[i] ?? '');
    if (!m) break;
    inner += '<li>' + inline(m[1] ?? '') + '</li>';
    i++;
  }
  return { html: wrap(inner), next: i };
}

/** Stored in paragraph `payload.text` (persisted in `BlogPost.content` JSON). */
const MENTION_WITH_ID_RE = /\[(@[^\]]+)\]\(mention:([a-fA-F0-9]{24})\)/g;

// Fast inline markdown: non-greedy (.+?) so "**a** ****" parses correctly. Plus lists.
function markdownToHtml(raw: string): string {
  const escape = (s: string) =>
    s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  const inline = (s: string) => {
    let t = escape(s);
    const mentionChunks: string[] = [];
    t = t.replace(MENTION_WITH_ID_RE, (_m, label: string, id: string) => {
      const i = mentionChunks.length;
      mentionChunks.push(`<span class="ss-mention" data-user-id="${id}">${label}</span>`);
      return `__SS_MENTION_PH_${i}__`;
    });
    t = t
      .replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replaceAll(/__(.+?)__/g, '<u>$1</u>')
      .replaceAll(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replaceAll(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
    t = t.replaceAll(/@(\w+)/g, '<span class="ss-mention">@$1</span>');
    for (let i = mentionChunks.length - 1; i >= 0; i--) {
      t = t.replaceAll(`__SS_MENTION_PH_${i}__`, mentionChunks[i]!);
    }
    return t;
  };
  const lines = (raw || '').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const ulBlock = consumeMarkdownListBlock(lines, i, UL_ITEM_LINE, (h) => '<ul>' + h + '</ul>', inline);
    if (ulBlock) {
      out.push(ulBlock.html);
      i = ulBlock.next;
      continue;
    }
    const olBlock = consumeMarkdownListBlock(lines, i, OL_ITEM_LINE, (h) => '<ol>' + h + '</ol>', inline);
    if (olBlock) {
      out.push(olBlock.html);
      i = olBlock.next;
      continue;
    }
    out.push(inline(lines[i] ?? '') + '<br>');
    i++;
  }
  return out.join('');
}

type HtmlToMdState = { out: string; olNum: number };

function walkElementToMarkdown(e: HTMLElement, walk: (n: Node) => void, state: HtmlToMdState): boolean {
  const tag = e.tagName?.toLowerCase();
  if (tag === 'br') {
    /* Invisible caret anchor at end of block — not an extra markdown newline */
    if (e.hasAttribute('data-ss-pad')) return true;
    state.out += '\n';
    return true;
  }
  if (tag === 'p') {
    e.childNodes.forEach((n) => walk(n));
    state.out += '\n';
    return true;
  }
  /* contenteditable Enter creates sibling <div>s; without a block boundary they collapse into one line. */
  if (tag === 'div') {
    e.childNodes.forEach((n) => walk(n));
    if (!state.out.endsWith('\n')) state.out += '\n';
    return true;
  }
  if (tag === 'a') {
    const href = e.getAttribute('href') ?? '';
    state.out += '[';
    e.childNodes.forEach((n) => walk(n));
    state.out += '](' + href + ')';
    return true;
  }
  if (tag === 'span' && e.classList?.contains('ss-mention')) {
    const uid = e.getAttribute('data-user-id')?.trim() ?? '';
    if (/^[a-fA-F0-9]{24}$/.test(uid)) {
      const label = (e.textContent ?? '').trim() || '@user';
      const bracketLabel = label.startsWith('@') ? label : `@${label}`;
      state.out += `[${bracketLabel}](mention:${uid})`;
      return true;
    }
    e.childNodes.forEach((n) => walk(n));
    return true;
  }
  if (tag === 'strong' || tag === 'b') {
    state.out += '**';
    e.childNodes.forEach((n) => walk(n));
    state.out += '**';
    return true;
  }
  if (tag === 'em' || tag === 'i') {
    state.out += '*';
    e.childNodes.forEach((n) => walk(n));
    state.out += '*';
    return true;
  }
  if (tag === 'u') {
    state.out += '__';
    e.childNodes.forEach((n) => walk(n));
    state.out += '__';
    return true;
  }
  if (tag === 'li') {
    const parent = e.parentElement?.tagName?.toLowerCase();
    if (parent === 'ol') {
      state.olNum++;
      state.out += state.olNum + '. ';
    } else {
      state.out += '- ';
    }
    e.childNodes.forEach((n) => walk(n));
    state.out += '\n';
    return true;
  }
  if (tag === 'ul') {
    state.olNum = 0;
    e.childNodes.forEach((n) => walk(n));
    return true;
  }
  if (tag === 'ol') {
    state.olNum = 0;
    e.childNodes.forEach((n) => walk(n));
    return true;
  }
  return false;
}

function htmlToMarkdown(el: HTMLElement): string {
  const state: HtmlToMdState = { out: '', olNum: 0 };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      state.out += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const e = node as HTMLElement;
    if (walkElementToMarkdown(e, walk, state)) return;
    e.childNodes.forEach((n) => walk(n));
  };
  el.childNodes.forEach((n) => walk(n));
  return state.out.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

/**
 * Inserts a real line break for the paragraph editor. When the caret is at the end of a line
 * with no node after it, browsers need a second <br data-ss-pad> so the caret can sit on a new
 * empty row; without it, extra Enters often collapse to a single blank line.
 */
function insertParagraphLineBreak(editorEl: HTMLElement): void {
  const sel = getBrowserSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editorEl.contains(range.commonAncestorContainer)) return;

  range.deleteContents();
  const br = document.createElement('br');
  range.insertNode(br);

  let newRange = document.createRange();
  if (!br.nextSibling) {
    const pad = document.createElement('br');
    pad.setAttribute('data-ss-pad', '');
    br.parentNode?.appendChild(pad);
    newRange.setStartBefore(pad);
  } else {
    newRange.setStartAfter(br);
  }
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

/** Medium-style: collapse spaces/tabs on each line only; keep newlines so blank lines survive. */
function collapseHorizontalWhitespacePreservingNewlines(s: string): string {
  return s
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' '))
    .join('\n');
}

function ParagraphBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: { text: string };
  onUpdate: (p: { text: string }) => void;
  onRemove: () => void;
}>) {
  const fieldId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const updateFromEditorRef = useRef(false);
  const text = payload?.text ?? '';

  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false, listBullet: false, listNumbered: false });
  const [linkCardOpen, setLinkCardOpen] = useState(false);
  const [mentionCardOpen, setMentionCardOpen] = useState(false);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const mentionButtonRef = useRef<HTMLButtonElement>(null);
  const savedLinkRangeRef = useRef<Range | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<FollowUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);

  const updateFormatState = useCallback(() => {
    const el = editorRef.current;
    if (!el || !document.getSelection) return;
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const inEditor = el.contains(sel.anchorNode);
    if (!inEditor) return;
    setFormatState({
      bold: richQueryCommandState('bold'),
      italic: richQueryCommandState('italic'),
      underline: richQueryCommandState('underline'),
      listBullet: richQueryCommandState('insertUnorderedList'),
      listNumbered: richQueryCommandState('insertOrderedList'),
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateFormatState);
    return () => document.removeEventListener('selectionchange', updateFormatState);
  }, [updateFormatState]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (updateFromEditorRef.current) {
      updateFromEditorRef.current = false;
      return;
    }
    // Never overwrite DOM while user is focused in this editor — prevents caret jumping to left
    if (document.activeElement && el.contains(document.activeElement)) return;
    // Use length, not trim(): newline-only buffers must re-render as multiple breaks
    if (text.length > 0) {
      el.innerHTML = markdownToHtml(text);
    } else {
      el.innerHTML = '<br>';
    }
  }, [text]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    let newText = collapseHorizontalWhitespacePreservingNewlines(htmlToMarkdown(el));
    /* Only the initial empty placeholder `<br>` — not `\n` from a real line break */
    const htmlCompact = el.innerHTML
      .replaceAll(/&nbsp;/gi, ' ')
      .replaceAll(/\s+/g, '')
      .toLowerCase();
    if (htmlCompact === '<br>' || htmlCompact === '') newText = '';
    onUpdate({ text: newText });
    updateFromEditorRef.current = true;
  }, [onUpdate]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const raw = e.clipboardData.getData('text/plain') ?? '';
      const plain = collapseHorizontalWhitespacePreservingNewlines(raw);
      richExecCommand('insertText', false, plain);
      const el = editorRef.current;
      if (el) {
        let newText = collapseHorizontalWhitespacePreservingNewlines(htmlToMarkdown(el));
        onUpdate({ text: newText });
        updateFromEditorRef.current = true;
      }
    },
    [onUpdate],
  );

  const applyFormat = useCallback(
    (command: 'bold' | 'italic' | 'underline') => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      richExecCommand(command, false);
      const newText = collapseHorizontalWhitespacePreservingNewlines(htmlToMarkdown(el));
      onUpdate({ text: newText });
      updateFromEditorRef.current = true;
      setTimeout(updateFormatState, 0);
    },
    [onUpdate, updateFormatState],
  );

  const applyList = useCallback(
    (type: 'bullet' | 'numbered') => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      richExecCommand(type === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList', false);
      const newText = collapseHorizontalWhitespacePreservingNewlines(htmlToMarkdown(el));
      onUpdate({ text: newText });
      updateFromEditorRef.current = true;
      setTimeout(updateFormatState, 0);
    },
    [onUpdate, updateFormatState],
  );

  const openLinkCard = useCallback(() => {
    const el = editorRef.current;
    const sel = getBrowserSelection();
    if (el && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        savedLinkRangeRef.current = range.cloneRange();
      } else {
        savedLinkRangeRef.current = null;
      }
    } else {
      savedLinkRangeRef.current = null;
    }
    setMentionCardOpen(false);
    setLinkUrl('');
    setLinkText('');
    setLinkCardOpen(true);
  }, []);

  const normalizeLinkUrl = useCallback((v: string) => v.replace(/^https?:\/\//i, '').trim(), []);

  const openMentionCard = useCallback(() => {
    setLinkCardOpen(false);
    setMentionSearchQuery('');
    setMentionResults([]);
    setMentionCardOpen(true);
  }, []);

  const applyLinkFromCard = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const raw = linkUrl.trim();
    if (!raw) return;
    const href = `https://${raw.replace(/^https?:\/\//i, '')}`;
    const text = linkText.trim() || raw.replace(/^https?:\/\//i, '').replace(/\/$/, '') || 'Link';
    el.focus();
    const sel = document.getSelection();
    if (sel && savedLinkRangeRef.current) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedLinkRangeRef.current);
      } catch {
        /* range may be invalid after DOM changes */
      }
      savedLinkRangeRef.current = null;
    }
    const safeHref = href.replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const safeText = text.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const anchor = sel?.anchorNode;
    const cursorInsideExistingLink = !!(
      anchor &&
      el.contains(anchor) &&
      (anchor.nodeType === Node.TEXT_NODE
        ? (anchor as Text).parentElement?.closest?.('a')
        : (anchor as Element).closest?.('a'))
    );
    const prefix = cursorInsideExistingLink ? ' ' : '';
    const linkHtml =
      '<a class="ss-newlink-temp" href="' + safeHref + '" target="_blank" rel="noopener noreferrer">' + safeText + '</a>';
    richExecCommand('insertHTML', false, prefix + linkHtml);
    const newLink = el.querySelector('a.ss-newlink-temp');
    if (newLink && sel) {
      try {
        const range = document.createRange();
        range.setStartAfter(newLink);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        richExecCommand('insertText', false, ' ');
        newLink.classList.remove('ss-newlink-temp');
      } catch {
        newLink.classList.remove('ss-newlink-temp');
      }
    }
    const newText = collapseHorizontalWhitespacePreservingNewlines(htmlToMarkdown(el));
    onUpdate({ text: newText });
    updateFromEditorRef.current = true;
    setLinkCardOpen(false);
  }, [onUpdate, linkUrl, linkText]);

  const applyMentionFromCard = useCallback(
    (user: FollowUser) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const u = user.username.trim();
      const id = user.id.trim();
      const token =
        u && /^[a-fA-F0-9]{24}$/.test(id) ? `[@${u}](mention:${id})` : u ? `@${u}` : '@';
      richExecCommand('insertText', false, token);
      const newText = collapseHorizontalWhitespacePreservingNewlines(htmlToMarkdown(el));
      onUpdate({ text: newText });
      updateFromEditorRef.current = true;
      setMentionCardOpen(false);
    },
    [onUpdate],
  );

  const [linkCardPos, setLinkCardPos] = useState({ top: 0, left: 0 });
  const [mentionCardPos, setMentionCardPos] = useState({ top: 0, left: 0 });

  const LINK_CARD_EST_HEIGHT = 320;
  const updateLinkCardPosition = useCallback(() => {
    const viewportPadding = 16;
    const setPos = (anchorBottom: number, anchorTop: number, left: number) => {
      const spaceBelow =
        globalThis.window === undefined
          ? 0
          : globalThis.window.innerHeight - anchorBottom - viewportPadding;
      const spaceAbove = anchorTop - viewportPadding;
      if (spaceBelow < LINK_CARD_EST_HEIGHT && spaceAbove >= LINK_CARD_EST_HEIGHT) {
        setLinkCardPos({ top: anchorTop - LINK_CARD_EST_HEIGHT - 8, left });
      } else {
        setLinkCardPos({ top: anchorBottom + 6, left });
      }
    };
    const applyRect = (rect: DOMRect) => {
      if (rect.width <= 0 && rect.height <= 0) return false;
      setPos(rect.bottom, rect.top, rect.left);
      return true;
    };
    const saved = savedLinkRangeRef.current;
    if (saved) {
      try {
        if (applyRect(saved.getBoundingClientRect())) return;
      } catch {
        /* range may be invalid */
      }
    }
    const editor = editorRef.current;
    const sel = getBrowserSelection();
    if (editor && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer) && applyRect(range.getBoundingClientRect())) return;
    }
    if (editor) {
      const r = editor.getBoundingClientRect();
      setPos(r.top + 80, r.top, r.left);
      return;
    }
    if (linkButtonRef.current) {
      const r = linkButtonRef.current.getBoundingClientRect();
      setPos(r.bottom, r.top, r.left);
    }
  }, []);

  useEffect(() => {
    if (!linkCardOpen) return;
    const t = requestAnimationFrame(() => {
      updateLinkCardPosition();
    });
    return () => cancelAnimationFrame(t);
  }, [linkCardOpen, updateLinkCardPosition]);

  useEffect(() => {
    if (mentionCardOpen && mentionButtonRef.current) {
      const editor = editorRef.current;
      const sel = getBrowserSelection();
      if (editor && sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            setMentionCardPos({ top: rect.bottom + 6, left: rect.left });
            return;
          }
        }
      }
      const r = mentionButtonRef.current.getBoundingClientRect();
      setMentionCardPos({ top: r.bottom + 6, left: r.left });
    }
  }, [mentionCardOpen]);

  useEffect(() => {
    if (!mentionCardOpen) return;
    const q = mentionSearchQuery.trim();
    if (!q) {
      setMentionResults([]);
      setMentionLoading(false);
      return;
    }
    setMentionLoading(true);
    const t = setTimeout(() => {
      followApi
        .searchUsers(q)
        .then((res) => {
          setMentionResults(res.list ?? []);
        })
        .catch(() => setMentionResults([]))
        .finally(() => setMentionLoading(false));
    }, 280);
    return () => clearTimeout(t);
  }, [mentionCardOpen, mentionSearchQuery]);

  useEffect(() => {
    if (!linkCardOpen && !mentionCardOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLinkCardOpen(false);
        setMentionCardOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [linkCardOpen, mentionCardOpen]);

  useEffect(() => {
    if (!linkCardOpen && !mentionCardOpen) return;
    const closeBoth = (e: Event) => {
      const el = e.target as Node | null;
      if (el && el instanceof Element) {
        const insideDialog = el.closest?.('[data-ss-link-dialog], [data-ss-mention-dialog]');
        if (insideDialog) return;
      }
      setLinkCardOpen(false);
      setMentionCardOpen(false);
    };
    document.addEventListener('scroll', closeBoth, true);
    return () => document.removeEventListener('scroll', closeBoth, true);
  }, [linkCardOpen, mentionCardOpen]);

  const cardPanelClass = 'fixed z-[100] w-[560px] border-2 border-border bg-card text-card-foreground shadow-[4px_4px_0px_0px_var(--border)] rounded-none overflow-hidden';
  const mentionCardPanelClass = 'fixed z-[100] w-[280px] border-2 border-border bg-card text-card-foreground shadow-[4px_4px_0px_0px_var(--border)] rounded-none overflow-hidden';
  const cardMotionProps = {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  };

  const toggleBtn = (active: boolean) =>
    cn(
      'p-1.5 rounded border focus:outline-none focus:ring-2 focus:ring-primary',
      active ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-muted/30 hover:bg-muted/60',
    );

  return (
    <div className="border-2 border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        <span className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5" /> Markdown_Buffer
        </span>
        <button
          type="button"
          className="text-destructive hover:text-destructive/80 p-1 rounded focus:outline-none focus:ring-2 focus:ring-destructive/50"
          onClick={onRemove}
          aria-label="Remove paragraph block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1 pb-2 border-b border-border/60 relative">
        <button type="button" onClick={() => applyFormat('bold')} className={toggleBtn(formatState.bold)} title="Bold" aria-label="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => applyFormat('italic')} className={toggleBtn(formatState.italic)} title="Italic" aria-label="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => applyFormat('underline')} className={toggleBtn(formatState.underline)} title="Underline" aria-label="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => applyList('bullet')} className={toggleBtn(formatState.listBullet)} title="Unordered list" aria-label="Unordered list">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => applyList('numbered')} className={toggleBtn(formatState.listNumbered)} title="Ordered list" aria-label="Ordered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          ref={linkButtonRef}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={openLinkCard}
          className={toggleBtn(linkCardOpen)}
          title="Link"
          aria-label="Link"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button ref={mentionButtonRef} type="button" onClick={openMentionCard} className={toggleBtn(mentionCardOpen)} title="Mention" aria-label="Mention">
          <AtSign className="h-3.5 w-3.5" />
        </button>
      </div>

      {typeof document !== 'undefined' &&
        linkCardOpen &&
        createPortal(
          <div data-ss-link-dialog className="contents">
            <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setLinkCardOpen(false)} />
            <motion.div
              {...cardMotionProps}
              className={cardPanelClass}
              style={{ top: linkCardPos.top, left: linkCardPos.left }}
              role="dialog"
              aria-label="Insert link"
            >
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-primary" /> Link
              </span>
              <button type="button" onClick={() => setLinkCardOpen(false)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex p-3 gap-3 min-h-[220px]">
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <div>
                  <label htmlFor={`${fieldId}-link-url`} className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                    URL (https only)
                  </label>
                  <input
                    id={`${fieldId}-link-url`}
                    type="text"
                    inputMode="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(normalizeLinkUrl(e.target.value))}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = (e.clipboardData.getData('text/plain') ?? '').trim();
                      setLinkUrl((prev) => normalizeLinkUrl(prev + pasted));
                    }}
                    placeholder="medium.com or www.example.com"
                    className="w-full border-2 border-border bg-background text-foreground p-2 text-xs rounded focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor={`${fieldId}-link-text`} className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                    Display text (optional)
                  </label>
                  <input
                    id={`${fieldId}-link-text`}
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Link text"
                    className="w-full border-2 border-border bg-background text-foreground p-2 text-xs rounded focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-auto">
                  <button type="button" onClick={() => setLinkCardOpen(false)} className="px-3 py-1.5 text-[10px] font-bold uppercase border-2 border-border rounded hover:bg-muted/50 text-foreground">
                    Cancel
                  </button>
                  <button type="button" onClick={applyLinkFromCard} className="px-3 py-1.5 text-[10px] font-bold uppercase border-2 border-border bg-primary text-primary-foreground rounded shadow-[2px_2px_0px_0px_var(--border)] hover:brightness-110 flex items-center gap-1.5">
                    <ExternalLink className="h-3 w-3" /> Insert link
                  </button>
                </div>
              </div>
              <div className="w-[240px] shrink-0 border-2 border-border rounded overflow-hidden bg-muted/10 flex flex-col min-h-[200px]">
                {linkUrl.trim() ? (
                  <LinkPreviewCardContent domain={linkUrl.trim()} title={linkText.trim() || undefined} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[10px] font-bold uppercase text-muted-foreground p-4 text-center">
                    <Globe className="h-10 w-10 shrink-0 opacity-60" aria-hidden />
                    <span>Enter URL to see preview</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          </div>,
          document.body
        )}

      {typeof document !== 'undefined' &&
        mentionCardOpen &&
        createPortal(
          <div data-ss-mention-dialog className="contents">
            <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setMentionCardOpen(false)} />
            <motion.div
              {...cardMotionProps}
              className={mentionCardPanelClass}
              style={{ top: mentionCardPos.top, left: mentionCardPos.left }}
              role="dialog"
              aria-label="Insert mention"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <AtSign className="h-3.5 w-3.5 text-primary" /> Mention user
                </span>
                <button type="button" onClick={() => setMentionCardOpen(false)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-2">
                <label htmlFor={`${fieldId}-mention`} className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                  Search by username or name
                </label>
                <input
                  id={`${fieldId}-mention`}
                  type="text"
                  value={mentionSearchQuery}
                  onChange={(e) => setMentionSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full border-2 border-border bg-background text-foreground p-2 text-xs rounded focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                  autoComplete="off"
                />
                <div className="mt-2 border border-border rounded overflow-hidden bg-muted/10 max-h-[220px] overflow-y-auto">
                  {mentionLoading && (
                    <div className="p-3 text-center text-[10px] font-bold text-muted-foreground uppercase">
                      Searching…
                    </div>
                  )}
                  {!mentionLoading && mentionSearchQuery.trim() && mentionResults.length === 0 && (
                    <div className="p-3 text-center text-[10px] font-bold text-muted-foreground uppercase">
                      No users found
                    </div>
                  )}
                  {!mentionLoading && mentionResults.length > 0 && (
                    <ul className="py-1">
                      {mentionResults.map((user) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            onClick={() => applyMentionFromCard(user)}
                            className="w-full flex items-center gap-2 px-2 py-2 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                          >
                            <img
                              src={user.profileImg || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                              alt=""
                              className="size-8 rounded-full shrink-0 object-cover border border-border"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-black truncate">{user.fullName || user.username}</p>
                              <p className="text-[9px] font-bold text-muted-foreground truncate">@{user.username}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex justify-end mt-2">
                  <button type="button" onClick={() => setMentionCardOpen(false)} className="px-2 py-1 text-[10px] font-bold uppercase border-2 border-border rounded hover:bg-muted/50 text-foreground">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

      <div className="relative">
        {/* Rich-text contentEditable; not replaceable by textarea without losing inline markdown. */}
        <div // NOSONAR S6848 — intentional contentEditable host for markdown
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          tabIndex={0} // NOSONAR S6845 — editing host must be in sequential focus order
          aria-label="Markdown content"
          aria-multiline
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            const el = editorRef.current;
            const sel = document.getSelection();
            if (!el || !sel || sel.rangeCount === 0) return;
            const anchor = sel.anchorNode;
            if (!anchor || !el.contains(anchor)) return;
            /* Enter outside lists: insert <br> so blank lines round-trip; default Enter uses <div> and broke htmlToMarkdown */
            if (e.key === 'Enter' && !e.shiftKey) {
              const li =
                anchor.nodeType === Node.TEXT_NODE
                  ? (anchor as Text).parentElement?.closest?.('li')
                  : (anchor as Element).closest?.('li');
              const inList = !!(li && el.contains(li));
              if (!inList) {
                e.preventDefault();
                insertParagraphLineBreak(el);
                queueMicrotask(() => handleInput());
                return;
              }
            }
            const link = anchor.nodeType === Node.TEXT_NODE ? (anchor as Text).parentElement?.closest?.('a') : (anchor as Element).closest?.('a');
            const atEndOfLink = link && (() => {
              const r = sel.getRangeAt(0).cloneRange();
              r.setStart(link, 0);
              r.setEnd(anchor, sel.anchorOffset);
              const offset = r.toString().length;
              const total = link.textContent?.length ?? 0;
              return offset >= total;
            })();
            const atStartOfLink = link && (() => {
              const r = sel.getRangeAt(0).cloneRange();
              r.setStart(link, 0);
              r.setEnd(anchor, sel.anchorOffset);
              return r.toString().length <= 0;
            })();
            if (link && atEndOfLink && (e.key === 'ArrowRight' || e.key === ' ')) {
              e.preventDefault();
              const range = document.createRange();
              range.setStartAfter(link);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              if (e.key === ' ') {
                richExecCommand('insertText', false, ' ');
                handleInput();
              }
              return;
            }
            if (link && atStartOfLink && e.key === 'ArrowLeft') {
              e.preventDefault();
              const range = document.createRange();
              range.setStartBefore(link);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              return;
            }
            if (e.key === ' ') {
              const range = document.createRange();
              range.setStart(el, 0);
              range.setEnd(anchor, sel.anchorOffset);
              if (/\s/.test(range.toString().slice(-1))) e.preventDefault();
            }
          }}
          onFocus={updateFormatState}
          className={cn(
            'min-h-[150px] w-full p-3 border border-border rounded bg-muted/20 focus:outline-none focus:border-primary font-medium text-sm resize-none',
            '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:list-item [&_strong]:font-bold [&_em]:italic [&_u]:underline ss-markdown-links [&_a]:bg-primary [&_a]:text-white [&_a]:no-underline [&_a]:px-1 [&_a]:py-0.5 [&_a]:rounded [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1 [&_.ss-mention]:bg-primary/25 [&_.ss-mention]:text-primary [&_.ss-mention]:font-bold [&_.ss-mention]:px-1.5 [&_.ss-mention]:py-0.5 [&_.ss-mention]:rounded [&_.ss-mention]:inline-flex [&_.ss-mention]:items-center [&_.ss-mention]:border [&_.ss-mention]:border-primary/50',
          )}
        />
        {text.length === 0 && (
          <div
            className="absolute left-3 top-3 pointer-events-none text-sm text-muted-foreground italic select-none"
            aria-hidden
          >
            Type here...
          </div>
        )}
      </div>
    </div>
  );
}

function HeadingBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: { text: string; level?: HeadingLevel };
  onUpdate: (p: { text: string; level?: HeadingLevel }) => void;
  onRemove: () => void;
}>) {
  const text = payload?.text ?? '';
  const level = (payload?.level === 3 ? 3 : 2) as HeadingLevel;
  const sizeClass = {
    2: 'text-2xl md:text-3xl font-black',
    3: 'text-xl md:text-2xl font-bold',
  }[level];

  return (
    <div className="border-2 border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        <span className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5" /> Sub-heading
        </span>
        <div className="flex items-center gap-1">
          {([2, 3] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onUpdate({ ...payload, level: l })}
              className={cn(
                'px-1.5 py-0.5 text-[9px] font-black uppercase rounded border',
                level === l ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground',
              )}
            >
              H{l}
            </button>
          ))}
          <button
            type="button"
            className="text-destructive hover:text-destructive/80 p-1 rounded focus:outline-none focus:ring-2 focus:ring-destructive/50 ml-1"
            onClick={onRemove}
            aria-label="Remove heading block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => onUpdate({ ...payload, text: e.target.value })}
        placeholder="Heading text..."
        className={cn('w-full bg-transparent border-b-2 border-border focus:outline-none focus:border-primary placeholder:text-muted-foreground', sizeClass)}
      />
    </div>
  );
}

function BlockCard({
  title,
  icon: Icon,
  onRemove,
  children,
}: Readonly<{
  title: string;
  icon: React.ElementType;
  onRemove: () => void;
  children: React.ReactNode;
}>) {
  return (
    <div className="border-2 border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" /> {title}
        </span>
        <button
          type="button"
          className="text-destructive hover:text-destructive/80 p-1 rounded"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function coerceImageLayout(raw: ImagePayload['layout']): ImageBlockLayout {
  if (raw === 'landscape' || raw === 'square' || raw === 'fullWidth') return raw;
  if (raw === 'natural' || raw === 'center') return 'landscape';
  return 'landscape';
}

type ImagePayloadWithLegacy = ImagePayload & { altText?: string };

function imageBlockCaption(p: ImagePayloadWithLegacy): string {
  const t = p.title?.trim();
  if (t) return t;
  return p.altText?.trim() ?? '';
}

function patchImagePayload(p: ImagePayloadWithLegacy, patch: Partial<ImagePayload>): ImagePayload {
  const { altText: _legacy, ...rest } = p;
  return { ...rest, ...patch };
}

const IMAGE_LAYOUT_OPTIONS: ReadonlyArray<{
  id: ImageBlockLayout;
  label: string;
  icon: typeof AlignLeft;
}> = [
  { id: 'landscape', label: 'Landscape', icon: AlignLeft },
  { id: 'square', label: 'Square', icon: Square },
  { id: 'fullWidth', label: 'Full width', icon: StretchHorizontal },
];

function ImageLayoutTitlePanel({
  layout,
  onLayout,
  title,
  onTitleChange,
  fieldId,
  titleInputSuffix = '',
  className,
}: Readonly<{
  layout: ImageBlockLayout;
  onLayout: (next: ImageBlockLayout) => void;
  title: string;
  onTitleChange: (value: string) => void;
  fieldId: string;
  titleInputSuffix?: string;
  className?: string;
}>) {
  const titleInputId = `${fieldId}-img-title${titleInputSuffix}`;
  return (
    <div className={cn('rounded-md border border-border bg-card/95 p-2 shadow-sm backdrop-blur-sm space-y-2', className)}>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Layout</p>
      <div className="flex gap-1">
        {IMAGE_LAYOUT_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onLayout(id)}
            className={cn(
              'flex-1 rounded border px-1 py-1.5 transition-colors',
              layout === id ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted/80 text-muted-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 mx-auto" strokeWidth={2} />
            <span className="text-[8px] font-bold block text-center mt-0.5 leading-tight">{label}</span>
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <label htmlFor={titleInputId} className="text-[9px] font-bold text-muted-foreground uppercase">
          Title
        </label>
        <input
          id={titleInputId}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Optional — shown as caption; also used as image description for accessibility"
          className="w-full bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

function ImageBlockEditor({
  blockId: _blockId,
  payload,
  token,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: ImagePayload;
  token: string | null;
  onUpdate: (p: ImagePayload) => void;
  onRemove: () => void;
}>) {
  const fieldId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const p = payload as ImagePayloadWithLegacy;
  const { url, layout: layoutRaw } = p;
  const layout = coerceImageLayout(layoutRaw);
  const caption = imageBlockCaption(p);
  const altForImg = caption || 'Blog image';

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || !token) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image (JPEG, PNG, GIF, WebP).');
        return;
      }
      if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
        toast.error(`Image must be under ${IMAGE_MAX_MB}MB.`);
        return;
      }
      setUploading(true);
      try {
        const data = await uploadMedia(token, file, undefined, () => {});
        if (data.url) onUpdate(patchImagePayload(p, { url: data.url }));
      } catch {
        toast.error('Upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [token, p, onUpdate],
  );

  const renderImagePreview = () => {
    if (!url) return null;
    if (layout === 'fullWidth') {
      return (
        <div className="min-w-0 w-full rounded-lg overflow-hidden border border-border bg-muted">
          <div className="flex w-full min-w-0 items-center justify-center bg-muted/80 p-1">
            <img
              src={url}
              alt={altForImg}
              className="h-auto w-full min-w-0 max-h-[min(48rem,88vh)] object-contain"
            />
          </div>
        </div>
      );
    }
    if (layout === 'square') {
      return (
        <div className="rounded-lg border border-border bg-muted flex justify-center p-3">
          {/* Fixed square viewport so “Square” is always 1:1 crop, not “bigger square when the card is wide”. */}
          <div className="size-52 shrink-0 overflow-hidden rounded-md bg-background ring-1 ring-border/80">
            <img src={url} alt={altForImg} className="h-full w-full object-cover object-center" />
          </div>
        </div>
      );
    }
    return (
      <div className="min-w-0 w-full rounded-lg overflow-hidden border border-border bg-muted">
        <div className="flex min-h-[8rem] w-full min-w-0 items-center justify-center p-2 sm:p-3">
          {/*
            Tall max-height (not max-h-64) so wide screenshots scale to the full block width first.
            A low max-height forces object-contain to shrink width and leaves empty side gutters.
          */}
          <img
            src={url}
            alt={altForImg}
            className="h-auto w-full min-w-0 max-h-[min(40rem,82vh)] object-contain object-center"
          />
        </div>
      </div>
    );
  };

  return (
    <BlockCard title="Image" icon={ImageIcon} onRemove={onRemove}>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {url ? (
        <div className="min-w-0 w-full space-y-2">
          {renderImagePreview()}

          <ImageLayoutTitlePanel
            layout={layout}
            onLayout={(next) => onUpdate(patchImagePayload(p, { layout: next }))}
            title={caption}
            onTitleChange={(value) => onUpdate(patchImagePayload(p, { title: value }))}
            fieldId={fieldId}
            className="bg-muted/40 border-dashed"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[10px] font-bold uppercase text-primary hover:underline"
          >
            Replace image
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'w-full border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer',
            'hover:bg-muted/20 transition-colors',
            uploading && 'pointer-events-none opacity-70',
          )}
        >
          {uploading ? (
            <span className="text-[11px] text-muted-foreground">Uploading…</span>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <span className="text-[11px] font-bold text-muted-foreground">Upload image</span>
            </>
          )}
        </button>
      )}
    </BlockCard>
  );
}

function GifBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: { url?: string; caption?: string };
  onUpdate: (p: { url?: string; caption?: string }) => void;
  onRemove: () => void;
}>) {
  const { url = '' } = payload;
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GiphyGif[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const hasGiphyKey = !!process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchGifs(searchQuery, { limit: 20 });
      setResults(res.data ?? []);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectGif = useCallback(
    (gif: GiphyGif) => {
      const imageUrl = gif.images?.original?.url || gif.images?.fixed_height?.url || '';
      if (imageUrl) onUpdate({ url: imageUrl });
      setResults([]);
      setSearchQuery('');
    },
    [onUpdate],
  );

  return (
    <BlockCard title="GIF" icon={Gauge} onRemove={onRemove}>
      <div className="space-y-3">
        {hasGiphyKey ? (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search GIFs..."
                className="flex-1 bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {searching ? '…' : 'Search'}
              </button>
            </div>
            {searchError && (
              <p className="text-[10px] text-destructive">{searchError}</p>
            )}
            {results.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto rounded border border-border p-1.5 bg-muted/20">
                {results.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => selectGif(gif)}
                    className="aspect-square rounded overflow-hidden border border-border hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={gif.images?.fixed_height?.url ?? gif.images?.original?.url}
                      alt={gif.title || 'GIF'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Add <code className="bg-muted px-1 rounded">NEXT_PUBLIC_GIPHY_API_KEY</code> to .env.local to search GIFs.
          </p>
        )}
        {url && (
          <div className="rounded-lg overflow-hidden border border-border bg-muted">
            <img src={url} alt="GIF" className="w-full max-h-48 object-contain" />
          </div>
        )}
      </div>
    </BlockCard>
  );
}

function VideoEmbedBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: { url?: string };
  onUpdate: (p: { url?: string }) => void;
  onRemove: () => void;
}>) {
  const fieldId = useId();
  const { url = '' } = payload;
  return (
    <BlockCard title="Video embed" icon={Film} onRemove={onRemove}>
      <div className="space-y-2">
        <label htmlFor={`${fieldId}-video-url`} className="text-[9px] font-bold text-muted-foreground uppercase">
          Embed URL
        </label>
        <input
          id={`${fieldId}-video-url`}
          type="url"
          value={url}
          onChange={(e) => onUpdate({ url: e.target.value })}
          placeholder="https://www.youtube.com/embed/... or Loom/Vimeo embed URL"
          className="w-full bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary font-mono"
        />
        {url && (
          <div className="aspect-video rounded-lg overflow-hidden border border-border bg-black">
            <iframe
              src={url}
              title="Video embed"
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </BlockCard>
  );
}

export type GithubRepoPayload = {
  owner?: string;
  repo?: string;
  url?: string;
  description?: string;
  avatarUrl?: string;
  name?: string;
};

function GithubRepoBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
  token,
  hasGithubLinked,
}: Readonly<{
  blockId: string;
  payload: GithubRepoPayload;
  onUpdate: (p: GithubRepoPayload) => void;
  onRemove: () => void;
  token: string | null;
  hasGithubLinked?: boolean;
}>) {
  const { owner = '', repo = '', url = '', description = '', avatarUrl = '', name: repoName = '' } = payload;
  const displayUrl = url || (owner && repo ? `https://github.com/${owner}/${repo}` : '');
  const isSelected = !!(displayUrl || (owner && repo));

  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [myRepos, setMyRepos] = useState<GithubRepoListItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const handleFetchByUrl = useCallback(async () => {
    const toFetch = urlInput.trim();
    if (!toFetch) return;
    if (!parseGithubRepoUrl(toFetch)) {
      setFetchError('Enter a valid GitHub repo URL (e.g. https://github.com/owner/repo)');
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const info = await fetchRepoByUrl(toFetch);
      onUpdate({
        owner: info.owner,
        repo: info.name,
        url: info.html_url,
        description: info.description,
        avatarUrl: info.avatar_url ?? '',
        name: info.name,
      });
      setUrlInput('');
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to fetch repo');
    } finally {
      setFetching(false);
    }
  }, [urlInput, onUpdate]);

  const loadMyRepos = useCallback(async () => {
    if (!token || !hasGithubLinked) return;
    setLoadingRepos(true);
    try {
      const repos = await fetchMyRepos(token);
      setMyRepos(repos);
    } catch {
      setMyRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }, [token, hasGithubLinked]);

  const selectRepo = useCallback(
    (r: GithubRepoListItem) => {
      onUpdate({
        owner: r.owner?.login ?? '',
        repo: r.name,
        url: r.html_url,
        description: r.description ?? '',
        avatarUrl: r.owner?.avatar_url ?? '',
        name: r.name,
      });
      setMyRepos([]);
    },
    [onUpdate],
  );

  // Selected: show only the GitHub card (avatar, repo name, owner, description, link)
  if (isSelected) {
    const title = repoName || repo || 'Repository';
    const by = owner || 'GitHub';
    return (
      <div className="relative group w-full rounded-lg border-2 border-border bg-card overflow-hidden">
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full border border-border object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full border-2 border-border bg-muted flex items-center justify-center">
              <GithubIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{by}</p>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded border border-border bg-card text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Remove repo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Picker: URL input + optional "Your repos"
  return (
    <BlockCard title="GitHub repo" icon={GithubIcon} onRemove={onRemove}>
      <div className="space-y-3">
        <div>
          <label htmlFor="github-repo-url-input" className="text-[9px] font-bold text-muted-foreground uppercase">
            Repo URL
          </label>
          <div className="flex gap-2 mt-1">
            <input
              id="github-repo-url-input"
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setFetchError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchByUrl()}
              placeholder="https://github.com/owner/repo"
              className="flex-1 bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={handleFetchByUrl}
              disabled={fetching || !urlInput.trim()}
              className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {fetching ? '…' : 'Fetch'}
            </button>
          </div>
          {fetchError && <p className="text-[10px] text-destructive mt-1">{fetchError}</p>}
        </div>

        {hasGithubLinked && token && (
          <>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Or</p>
            <div>
              <button
                type="button"
                onClick={loadMyRepos}
                disabled={loadingRepos}
                className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-muted hover:bg-muted/80 disabled:opacity-50"
              >
                {loadingRepos ? 'Loading…' : 'Your repos'}
              </button>
              {myRepos.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border p-1.5 bg-muted/20 space-y-1">
                  {myRepos.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectRepo(r)}
                      className="w-full flex items-center gap-2 p-2 rounded border border-transparent hover:border-primary hover:bg-muted/50 text-left"
                    >
                      {r.owner?.avatar_url ? (
                        <img src={r.owner.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <GithubIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-mono truncate flex-1">{r.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </BlockCard>
  );
}

function UnsplashBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: { url?: string; photographer?: string; caption?: string };
  onUpdate: (p: { url?: string; photographer?: string; caption?: string }) => void;
  onRemove: () => void;
}>) {
  const { url = '', photographer = '' } = payload;
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const hasUnsplashKey = !!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchUnsplashPhotos(searchQuery, { per_page: 20 });
      setResults(res.results ?? []);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectPhoto = useCallback(
    (photo: UnsplashPhoto) => {
      const imageUrl = photo.urls?.regular || photo.urls?.full || photo.urls?.small || '';
      const credit = photo.user?.name ? `Photo by ${photo.user.name} on Unsplash` : '';
      if (imageUrl) onUpdate({ url: imageUrl, photographer: photographer || credit });
      setResults([]);
      setSearchQuery('');
    },
    [onUpdate, photographer],
  );

  // Image selected: show only the image card (no Unsplash block UI), full-width landscape like Medium
  if (url) {
    return (
      <div className="relative group w-full">
        <div className="w-full overflow-hidden rounded-lg border border-border bg-muted">
          <img
            src={url}
            alt="Unsplash"
            className="w-full aspect-video object-cover"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <input
            type="text"
            value={photographer}
            onChange={(e) => onUpdate({ ...payload, photographer: e.target.value })}
            placeholder="Photo by …"
            className="inline-flex items-center px-2.5 py-1 text-xs rounded-full border-2 border-border bg-muted/50 text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground min-w-[140px]"
          />
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded border border-border bg-card text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-primary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // No image yet: show Unsplash search block
  return (
    <BlockCard title="Unsplash" icon={Camera} onRemove={onRemove}>
      <div className="space-y-3">
        {hasUnsplashKey ? (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search photos..."
                className="flex-1 bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {searching ? '…' : 'Search'}
              </button>
            </div>
            {searchError && (
              <p className="text-[10px] text-destructive">{searchError}</p>
            )}
            {results.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto rounded border border-border p-1.5 bg-muted/20">
                {results.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => selectPhoto(photo)}
                    onKeyDown={(e) => e.key === 'Enter' && selectPhoto(photo)}
                    className="aspect-square rounded overflow-hidden border border-border hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={photo.urls?.small ?? photo.urls?.thumb}
                      alt={photo.alt_description ?? 'Unsplash'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Add <code className="bg-muted px-1 rounded">NEXT_PUBLIC_UNSPLASH_ACCESS_KEY</code> to .env.local to search photos.
          </p>
        )}
      </div>
    </BlockCard>
  );
}

export interface BlogWriteEditorProps {
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  token: string | null;
  currentUserUsername?: string;
  currentUserHasGithub?: boolean;
  isSidebarOpen: boolean;
  maxWidthClassName?: string;
  activeSectionId: string;
}

export function BlogWriteEditor({
  blocks,
  onBlocksChange,
  token,
  currentUserUsername,
  currentUserHasGithub,
  isSidebarOpen,
  maxWidthClassName = 'max-w-3xl',
  activeSectionId,
}: Readonly<BlogWriteEditorProps>) {
  const updateBlock = useCallback(
    (id: string, payload: any) => {
      onBlocksChange(
        blocks.map((b) => (b.id === id ? { ...b, payload } : b)),
      );
    },
    [blocks, onBlocksChange],
  );

  const removeBlock = useCallback(
    (id: string) => {
      const next = blocks.filter((b) => b.id !== id);
      onBlocksChange(next);
    },
    [blocks, onBlocksChange],
  );

  const visibleBlocks = blocks.filter(
    (b) => (b.sectionId ?? activeSectionId) === activeSectionId,
  );

  /** Global index to insert *before* (equals `blocks.length` to append after last block in doc). */
  const appendSlotIndex = useMemo(() => {
    if (visibleBlocks.length === 0) return blocks.length;
    const last = visibleBlocks[visibleBlocks.length - 1];
    const lastGlobal = blocks.findIndex((b) => b.id === last.id);
    return lastGlobal >= 0 ? lastGlobal + 1 : blocks.length;
  }, [visibleBlocks, blocks]);

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex < 0 || fromIndex >= blocks.length) return;
      if (toIndex < 0 || toIndex > blocks.length) return;
      if (fromIndex === toIndex) return;
      const reordered = [...blocks];
      const [removed] = reordered.splice(fromIndex, 1);
      let insertAt = toIndex;
      if (fromIndex < toIndex) insertAt -= 1;
      insertAt = Math.max(0, Math.min(insertAt, reordered.length));
      reordered.splice(insertAt, 0, removed);
      onBlocksChange(reordered);
    },
    [blocks, onBlocksChange],
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const dropTargetIndexRef = useRef<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
    setDropTargetIndex(null);
    dropTargetIndexRef.current = null;
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    dropTargetIndexRef.current = null;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, overIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex === null) return;
      if (overIndex === draggedIndex) return;
      dropTargetIndexRef.current = overIndex;
      setDropTargetIndex(overIndex);
    },
    [draggedIndex],
  );

  const handleDragOverAppendZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex === null) return;
      dropTargetIndexRef.current = appendSlotIndex;
      setDropTargetIndex(appendSlotIndex);
    },
    [draggedIndex, appendSlotIndex],
  );

  const handleDropOnRow = useCallback(
    (e: React.DragEvent, rowInsertBeforeIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      const fromIndex = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (Number.isNaN(fromIndex)) return;
      const toIndex = dropTargetIndexRef.current ?? rowInsertBeforeIndex;
      dropTargetIndexRef.current = null;
      setDraggedIndex(null);
      setDropTargetIndex(null);
      moveBlock(fromIndex, toIndex);
    },
    [moveBlock],
  );

  const handleDropOnAppendZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const fromIndex = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (Number.isNaN(fromIndex)) return;
      dropTargetIndexRef.current = null;
      setDraggedIndex(null);
      setDropTargetIndex(null);
      moveBlock(fromIndex, appendSlotIndex);
    },
    [moveBlock, appendSlotIndex],
  );

  const blockListDropRef = useRef<HTMLDivElement>(null);

  if (visibleBlocks.length === 0) {
    return (
      <div className="pb-16 flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-lg bg-muted/20">
        <p className="text-sm font-medium text-muted-foreground text-center">
          Please insert a block from the left panel.
        </p>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Use the Tools section to add paragraphs, images, embeds, and more.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={blockListDropRef}
      className="pb-16 selection:bg-primary selection:text-primary-foreground"
    >
      <ul className="mb-6 list-none space-y-4 p-0">
        {visibleBlocks.map((block) => {
          const blockIndex = blocks.findIndex((b) => b.id === block.id);
          const isDragging = draggedIndex === blockIndex;
          const isDropTarget = dropTargetIndex === blockIndex && !isDragging;
          let blockContent: React.ReactNode;
          if (block.type === 'paragraph') {
            blockContent = (
              <ParagraphBlockEditor
                blockId={block.id}
                payload={{ text: block.payload?.text ?? '' }}
                onUpdate={(p) => updateBlock(block.id, p)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'heading') {
            blockContent = (
              <HeadingBlockEditor
                blockId={block.id}
                payload={{ text: block.payload?.text ?? '', level: block.payload?.level ?? 2 }}
                onUpdate={(p) => updateBlock(block.id, p)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'partition') {
            blockContent = (
              <div className="group flex items-center gap-2 py-2">
                <div className="flex-1 border-t border-dashed border-border" />
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/80 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeBlock(block.id)}
                  aria-label="Remove divider"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          } else if (block.type === 'image') {
            blockContent = (
              <ImageBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                token={token}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'gif') {
            blockContent = (
              <GifBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'videoEmbed') {
            blockContent = (
              <VideoEmbedBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'githubRepo') {
            blockContent = (
              <GithubRepoBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
                token={token}
                hasGithubLinked={currentUserHasGithub}
              />
            );
          } else if (block.type === 'unsplashImage') {
            blockContent = (
              <UnsplashBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else {
            blockContent = (
              <div className="border border-dashed border-border bg-card p-3 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Block: {block.type}</span>
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/80 p-1 rounded focus:outline-none focus:ring-2 focus:ring-destructive/50"
                  onClick={() => removeBlock(block.id)}
                  aria-label="Remove block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }
          return (
            <li
              key={block.id}
              onDragOver={(e) => handleDragOver(e, blockIndex)}
              onDrop={(e) => handleDropOnRow(e, blockIndex)}
              className={cn(
                'relative list-none flex items-start gap-2 group/drag rounded-md transition-all duration-150',
                isDragging && 'opacity-50',
              )}
            >
              {isDropTarget && (
                <div
                  className="absolute left-0 right-0 -top-2 z-10 h-0.5 rounded-full bg-primary pointer-events-none"
                  aria-hidden
                />
              )}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, blockIndex)}
                onDragEnd={handleDragEnd}
                className="mt-2 shrink-0 p-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-none select-none"
                aria-label="Drag to reorder"
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4 pointer-events-none" />
              </div>
              <div className="flex-1 min-w-0" draggable={false} onDragStart={(ev) => ev.preventDefault()}>
                {blockContent}
              </div>
            </li>
          );
        })}
      </ul>
      <div
        className={cn(
          'min-h-14 rounded-md border-2 border-dashed transition-colors',
          dropTargetIndex === appendSlotIndex ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border/70',
        )}
        onDragOver={handleDragOverAppendZone}
        onDrop={handleDropOnAppendZone}
        role="presentation"
      >
        <p className="pointer-events-none py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Drop here to place at end of section
        </p>
      </div>
    </div>
  );
}

