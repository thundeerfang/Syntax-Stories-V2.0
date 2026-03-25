import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Trash2, Minus, Image as ImageIcon, Gauge, Film, Link2, Github, Camera, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, AtSign, ExternalLink, X, Type, GripVertical, Globe } from 'lucide-react';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import { followApi, type FollowUser } from '@/api/follow';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadMedia } from '@/api/upload';
import { searchGifs, type GiphyGif } from '@/api/giphy';
import { searchUnsplashPhotos, type UnsplashPhoto } from '@/api/unsplash';
import { fetchRepoByUrl, fetchMyRepos, parseGithubRepoUrl, type GithubRepoInfo, type GithubRepoListItem } from '@/api/github';

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

// Fast inline markdown: non-greedy (.+?) so "**a** ****" parses correctly. Plus lists.
function markdownToHtml(raw: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inline = (s: string) => {
    let t = escape(s);
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<u>$1</u>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
    t = t.replace(/@([a-zA-Z0-9_]+)/g, '<span class="ss-mention">@$1</span>');
    return t;
  };
  const lines = (raw || '').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ulMatch) {
      let ulContent = '';
      while (i < lines.length && lines[i].match(/^\s*[-*]\s+(.*)$/)) {
        const m = lines[i].match(/^\s*[-*]\s+(.*)$/);
        if (m) ulContent += '<li>' + inline(m[1]) + '</li>';
        i++;
      }
      out.push('<ul>' + ulContent + '</ul>');
      continue;
    }
    if (olMatch) {
      let olContent = '';
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+(.*)$/)) {
        const m = lines[i].match(/^\s*\d+\.\s+(.*)$/);
        if (m) olContent += '<li>' + inline(m[1]) + '</li>';
        i++;
      }
      out.push('<ol>' + olContent + '</ol>');
      continue;
    }
    out.push(inline(line) + '<br>');
    i++;
  }
  return out.join('');
}

function htmlToMarkdown(el: HTMLElement): string {
  let out = '';
  let olNum = 0;
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const e = node as HTMLElement;
    const tag = e.tagName?.toLowerCase();
    if (tag === 'br') {
      out += '\n';
      return;
    }
    if (tag === 'p') {
      e.childNodes.forEach((n) => walk(n));
      out += '\n';
      return;
    }
    if (tag === 'a') {
      const href = e.getAttribute('href') ?? '';
      out += '[';
      e.childNodes.forEach((n) => walk(n));
      out += '](' + href + ')';
      return;
    }
    if (tag === 'span' && e.classList?.contains('ss-mention')) {
      e.childNodes.forEach((n) => walk(n));
      return;
    }
    if (tag === 'strong' || tag === 'b') {
      out += '**';
      e.childNodes.forEach((n) => walk(n));
      out += '**';
      return;
    }
    if (tag === 'em' || tag === 'i') {
      out += '*';
      e.childNodes.forEach((n) => walk(n));
      out += '*';
      return;
    }
    if (tag === 'u') {
      out += '__';
      e.childNodes.forEach((n) => walk(n));
      out += '__';
      return;
    }
    if (tag === 'li') {
      const parent = e.parentElement?.tagName?.toLowerCase();
      if (parent === 'ol') {
        olNum++;
        out += olNum + '. ';
      } else {
        out += '- ';
      }
      e.childNodes.forEach((n) => walk(n));
      out += '\n';
      return;
    }
    if (tag === 'ul') {
      olNum = 0;
      e.childNodes.forEach((n) => walk(n));
      return;
    }
    if (tag === 'ol') {
      olNum = 0;
      e.childNodes.forEach((n) => walk(n));
      return;
    }
    e.childNodes.forEach((n) => walk(n));
  };
  el.childNodes.forEach((n) => walk(n));
  return out.replace(/\n{2,}/g, '\n').trim();
}

function ParagraphBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: {
  blockId: string;
  payload: { text: string };
  onUpdate: (p: { text: string }) => void;
  onRemove: () => void;
}) {
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
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      listBullet: document.queryCommandState('insertUnorderedList'),
      listNumbered: document.queryCommandState('insertOrderedList'),
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
    if (text.trim()) {
      el.innerHTML = markdownToHtml(text);
    } else {
      el.innerHTML = '<br>';
    }
  }, [text]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    let newText = htmlToMarkdown(el);
    if (newText === '\n') newText = '';
    newText = newText.replace(/\s+/g, ' ');
    onUpdate({ text: newText });
    updateFromEditorRef.current = true;
  }, [onUpdate]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const raw = e.clipboardData.getData('text/plain') ?? '';
      const plain = raw.replace(/\s+/g, ' ');
      document.execCommand('insertText', false, plain);
      const el = editorRef.current;
      if (el) {
        let newText = htmlToMarkdown(el).replace(/\s+/g, ' ');
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
      document.execCommand(command, false);
      const newText = htmlToMarkdown(el).replace(/\s+/g, ' ');
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
      document.execCommand(type === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList', false);
      const newText = htmlToMarkdown(el).replace(/\s+/g, ' ');
      onUpdate({ text: newText });
      updateFromEditorRef.current = true;
      setTimeout(updateFormatState, 0);
    },
    [onUpdate, updateFormatState],
  );

  const openLinkCard = useCallback(() => {
    const el = editorRef.current;
    const sel = typeof document !== 'undefined' ? document.getSelection() : null;
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
    const safeHref = href.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const anchor = sel?.anchorNode;
    const cursorInsideExistingLink = !!(
      anchor &&
      el.contains(anchor) &&
      (anchor.nodeType === Node.TEXT_NODE
        ? (anchor as Text).parentElement?.closest?.('a')
        : (anchor as Element).closest?.('a'))
    );
    const prefix = cursorInsideExistingLink ? ' ' : '';
    const linkHtml = '<a href="' + safeHref + '" target="_blank" rel="noopener noreferrer" data-ss-newlink>' + safeText + '</a>';
    document.execCommand('insertHTML', false, prefix + linkHtml);
    const newLink = el.querySelector('a[data-ss-newlink]');
    if (newLink && sel) {
      try {
        const range = document.createRange();
        range.setStartAfter(newLink);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('insertText', false, ' ');
        newLink.removeAttribute('data-ss-newlink');
      } catch {
        newLink.removeAttribute('data-ss-newlink');
      }
    }
    const newText = htmlToMarkdown(el).replace(/\s+/g, ' ');
    onUpdate({ text: newText });
    updateFromEditorRef.current = true;
    setLinkCardOpen(false);
  }, [onUpdate, linkUrl, linkText]);

  const applyMentionFromCard = useCallback(
    (username: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      document.execCommand('insertText', false, username.trim() ? `@${username.trim()}` : '@');
      const newText = htmlToMarkdown(el).replace(/\s+/g, ' ');
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
      const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - anchorBottom - viewportPadding : 0;
      const spaceAbove = anchorTop - viewportPadding;
      if (spaceBelow < LINK_CARD_EST_HEIGHT && spaceAbove >= LINK_CARD_EST_HEIGHT) {
        setLinkCardPos({ top: anchorTop - LINK_CARD_EST_HEIGHT - 8, left });
      } else {
        setLinkCardPos({ top: anchorBottom + 6, left });
      }
    };
    if (savedLinkRangeRef.current) {
      try {
        const rect = savedLinkRangeRef.current.getBoundingClientRect();
        if (rect && (rect.width > 0 || rect.height > 0)) {
          setPos(rect.bottom, rect.top, rect.left);
          return;
        }
      } catch {
        /* range may be invalid */
      }
    }
    const editor = editorRef.current;
    const sel = typeof document !== 'undefined' ? document.getSelection() : null;
    if (editor && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          setPos(rect.bottom, rect.top, rect.left);
          return;
        }
      }
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
      const sel = typeof document !== 'undefined' ? document.getSelection() : null;
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
                  <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">URL (https only)</label>
                  <input
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
                  <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">Display text (optional)</label>
                  <input
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
                <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">Search by username or name</label>
                <input
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
                            onClick={() => applyMentionFromCard(user.username)}
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
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Markdown content"
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            const el = editorRef.current;
            const sel = document.getSelection();
            if (!el || !sel || sel.rangeCount === 0) return;
            const anchor = sel.anchorNode;
            if (!anchor || !el.contains(anchor)) return;
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
                document.execCommand('insertText', false, ' ');
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
        {!text.trim() && (
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
  payload,
  onUpdate,
  onRemove,
}: {
  blockId: string;
  payload: { text: string; level?: HeadingLevel };
  onUpdate: (p: { text: string; level?: HeadingLevel }) => void;
  onRemove: () => void;
}) {
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
}: {
  title: string;
  icon: React.ElementType;
  onRemove: () => void;
  children: React.ReactNode;
}) {
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

function ImageBlockEditor({
  blockId: _blockId,
  payload,
  token,
  onUpdate,
  onRemove,
}: {
  blockId: string;
  payload: { url?: string; altText?: string; caption?: string };
  token: string | null;
  onUpdate: (p: { url?: string; altText?: string; caption?: string }) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { url, altText = '', caption = '' } = payload;

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
        if (data.url) onUpdate({ ...payload, url: data.url });
      } catch {
        toast.error('Upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [token, payload, onUpdate],
  );

  return (
    <BlockCard title="Image" icon={ImageIcon} onRemove={onRemove}>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {!url ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer',
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
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden border border-border bg-muted">
            <img src={url} alt={altText || 'Uploaded'} className="w-full max-h-64 object-contain" />
          </div>
          <div className="grid gap-2">
            <label className="text-[9px] font-bold text-muted-foreground uppercase">Alt text</label>
            <input
              type="text"
              value={altText}
              onChange={(e) => onUpdate({ ...payload, altText: e.target.value })}
              placeholder="Describe the image"
              className="w-full bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary"
            />
            <label className="text-[9px] font-bold text-muted-foreground uppercase">Caption (optional)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => onUpdate({ ...payload, caption: e.target.value })}
              placeholder="Caption"
              className="w-full bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[10px] font-bold uppercase text-primary hover:underline"
          >
            Replace image
          </button>
        </div>
      )}
    </BlockCard>
  );
}

function GifBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: {
  blockId: string;
  payload: { url?: string; caption?: string };
  onUpdate: (p: { url?: string; caption?: string }) => void;
  onRemove: () => void;
}) {
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
}: {
  blockId: string;
  payload: { url?: string };
  onUpdate: (p: { url?: string }) => void;
  onRemove: () => void;
}) {
  const { url = '' } = payload;
  return (
    <BlockCard title="Video embed" icon={Film} onRemove={onRemove}>
      <div className="space-y-2">
        <label className="text-[9px] font-bold text-muted-foreground uppercase">Embed URL</label>
        <input
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
}: {
  blockId: string;
  payload: GithubRepoPayload;
  onUpdate: (p: GithubRepoPayload) => void;
  onRemove: () => void;
  token: string | null;
  hasGithubLinked?: boolean;
}) {
  const { owner = '', repo = '', url = '', description = '', avatarUrl = '', name: repoName = '' } = payload;
  const displayUrl = url || (owner && repo ? `https://github.com/${owner}/${repo}` : '');
  const isSelected = !!(displayUrl || (owner && repo));

  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [myRepos, setMyRepos] = useState<GithubRepoListItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [hoverCard, setHoverCard] = useState(false);

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
      <div
        className="relative group w-full rounded-lg border-2 border-border bg-card overflow-hidden"
        onMouseEnter={() => setHoverCard(true)}
        onMouseLeave={() => setHoverCard(false)}
      >
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
              <Github className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{by}</p>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
        {hoverCard && (
          <div className="absolute top-2 right-2">
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded border border-border bg-card text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Remove repo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Picker: URL input + optional "Your repos"
  return (
    <BlockCard title="GitHub repo" icon={Github} onRemove={onRemove}>
      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-bold text-muted-foreground uppercase">Repo URL</label>
          <div className="flex gap-2 mt-1">
            <input
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
                        <Github className="h-5 w-5 text-muted-foreground shrink-0" />
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
}: {
  blockId: string;
  payload: { url?: string; photographer?: string; caption?: string };
  onUpdate: (p: { url?: string; photographer?: string; caption?: string }) => void;
  onRemove: () => void;
}) {
  const { url = '', photographer = '' } = payload;
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hoverImage, setHoverImage] = useState(false);
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
      <div
        className="relative group w-full"
        onMouseEnter={() => setHoverImage(true)}
        onMouseLeave={() => setHoverImage(false)}
      >
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
          {hoverImage && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded border border-border bg-card text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Remove image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
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
}: BlogWriteEditorProps) {
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

  const addBlock = useCallback(
    (type: BlockType) => {
      const inSectionCount = blocks.filter(
        (b) => (b.sectionId ?? activeSectionId) === activeSectionId,
      ).length;
      if (inSectionCount >= 10) {
        toast.error('Section limit reached (10 blocks)');
        return;
      }
      onBlocksChange([
        ...blocks,
        createBlockInSection(type, activeSectionId),
      ]);
    },
    [blocks, onBlocksChange, activeSectionId],
  );

  const visibleBlocks = blocks.filter(
    (b) => (b.sectionId ?? activeSectionId) === activeSectionId,
  );

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length || toIndex >= blocks.length) return;
      const reordered = [...blocks];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);
      onBlocksChange(reordered);
    },
    [blocks, onBlocksChange],
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
    setDropTargetIndex(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && overIndex !== draggedIndex) {
      setDropTargetIndex(overIndex);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTargetIndex(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (Number.isNaN(fromIndex)) return;
      setDraggedIndex(null);
      setDropTargetIndex(null);
      moveBlock(fromIndex, toIndex);
    },
    [moveBlock],
  );

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
    <div className="pb-16 selection:bg-primary selection:text-primary-foreground" onDragLeave={handleDragLeave}>
      <div className="space-y-4 mb-6">
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
            <div key={block.id} className="relative">
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
                onDragOver={(e) => handleDragOver(e, blockIndex)}
                onDrop={(e) => handleDrop(e, blockIndex)}
                className={cn(
                  'flex items-start gap-2 group/drag rounded-md transition-all duration-150',
                  isDragging && 'opacity-50',
                )}
              >
                <div
                  className="mt-2 p-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-none"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">{blockContent}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

