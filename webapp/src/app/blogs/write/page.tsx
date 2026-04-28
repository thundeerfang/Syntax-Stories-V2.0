'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useSidebar } from '@/hooks/useSidebar';
import { blogApi, pickRemoteThumbnailForApi } from '@/api/blog';
import { uploadCover, type CropArea } from '@/api/upload';
import { BlogWritePageSkeletonInner } from '@/components/skeletons';
import { Dialog } from '@/components/ui/Dialog';
import { CropperKeyboardWrapper } from '@/components/ui/CropperKeyboardWrapper';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BlogWriteDeployOverlay } from '@/components/blog/BlogWriteDeployOverlay';
import type { BlogPublishTaxonomy } from '@/lib/blogPublishTaxonomy';
import type { BlogTaxonomyRow } from '@/types/blog';
import {
  Save, Send, ChevronRight,
  Activity, Cpu, History, ListTree, Wrench,
  Globe, ShieldCheck, Image as ImageIcon, Trash2,
  Bold, Italic, Underline as UnderlineIcon,
  Link2, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight,
  FileText,
} from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getWriteEditorSessionPostId, setWriteEditorSessionPostId } from '@/lib/writeBlogSession';
import {
  blockTypeDisplayName,
  totalWorkspaceWordCount,
} from '@/lib/writeWorkspaceStats';
import {
  BlogWriteEditor,
  Block,
  createBlockInSection,
  stripLegacyGifBlocks,
  type BlockType,
} from '@/components/ui/BlogWriteEditor';
import { DEFAULT_ITEMS } from '@/components/ui/BottomToolbar';
import { motion, AnimatePresence } from 'framer-motion';

const TITLE_MAX = 150;
const SUMMARY_MAX_WORDS = 300;

function serializeWriteWorkspace(args: {
  title: string;
  summary: string;
  blocks: Block[];
  thumbnailPreviewUrl: string | null;
}): string {
  return JSON.stringify({
    title: args.title.trim(),
    summary: args.summary,
    blocks: args.blocks,
    thumbnailPreviewUrl: args.thumbnailPreviewUrl,
  });
}

function summaryWordCount(html: string): number {
  if (!html || html === '<br>') return 0;
  let text: string;
  if (typeof document === 'undefined') {
    text = html.replaceAll(/<[^>]*>/g, ' ').replaceAll('&nbsp;', ' ');
  } else {
    const div = document.createElement('div');
    div.innerHTML = html;
    text = div.textContent ?? '';
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function escapeHtmlPlain(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/** Rich `contentEditable` formatting; deprecated DOM APIs remain the practical cross-browser path. */
function richExecCommand(commandId: string, showUI = false, value?: string | null): boolean {
  return document.execCommand(commandId, showUI, value ?? undefined); // NOSONAR S1874
}

function richQueryCommandState(commandId: string): boolean {
  return document.queryCommandState(commandId); // NOSONAR S1874
}

/** Collapse multiple spaces (and any whitespace run) to one space in all text nodes (Medium-style) */
function collapseSpacesInElement(el: HTMLElement): void {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent && /\s{2,}/.test(node.textContent)) {
      node.textContent = node.textContent.replaceAll(/\s+/g, ' ');
    }
  }
}

/** Get (node, offset) for the position that is `charOffset` characters from the start of the range */
function getRangePositionAtOffset(range: Range, charOffset: number): { node: Node; offset: number } | null {
  if (charOffset <= 0) return { node: range.startContainer, offset: range.startOffset };
  const totalLen = range.toString().length;
  if (charOffset >= totalLen) return { node: range.endContainer, offset: range.endOffset };
  const sc = range.startContainer;
  const so = range.startOffset;
  const ec = range.endContainer;
  const eo = range.endOffset;
  let count = 0;
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
  let node: Text | null = walker.nextNode() as Text | null;
  while (node) {
    if (!range.intersectsNode(node)) {
      node = walker.nextNode() as Text | null;
      continue;
    }
    const nStart = node === sc ? so : 0;
    const nEnd = node === ec ? eo : node.length;
    const len = nEnd - nStart;
    if (count + len > charOffset)
      return { node, offset: nStart + (charOffset - count) };
    count += len;
    node = walker.nextNode() as Text | null;
  }
  return { node: ec, offset: eo };
}

/** Trim range in place: move start past leading whitespace and end before trailing whitespace */
function trimSelectionRange(range: Range): void {
  const text = range.toString();
  if (!text || !/\S/.test(text)) return;
  const lead = text.search(/\S/);
  const trailMatch = /\s*$/.exec(text);
  const trail = trailMatch?.[0]?.length ?? 0;
  const trimEndChar = text.length - trail;
  if (lead >= trimEndChar) return;
  const startPos = getRangePositionAtOffset(range, lead);
  const endPos = getRangePositionAtOffset(range, trimEndChar);
  if (startPos && endPos) {
    try {
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
    } catch {
      // ignore
    }
  }
}

/** Get character offset of selection start from the start of el */
function getSelectionStartOffset(el: HTMLElement): number {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const startRange = document.createRange();
  startRange.selectNodeContents(el);
  startRange.setEnd(range.startContainer, range.startOffset);
  return startRange.toString().length;
}

/** Set selection to a single cursor at the given character offset from the start of el */
function setSelectionToOffset(el: HTMLElement, offset: number): void {
  const sel = document.getSelection();
  if (!sel) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null = walker.nextNode() as Text | null;
  let count = 0;
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (count + len >= offset) {
      const offsetInNode = offset - count;
      const range = document.createRange();
      range.setStart(node, offsetInNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    count += len;
    node = walker.nextNode() as Text | null;
  }
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function finalizeSummaryLinkInsertion(el: HTMLElement, sel: Selection | null, syncToState: () => void): void {
  const links = el.getElementsByTagName('a');
  const lastLink = links.length > 0 ? links.item(links.length - 1) : null;
  if (lastLink && el.contains(lastLink)) {
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(lastLink);
    r.collapse(false);
    const s = document.getSelection();
    if (s) {
      s.removeAllRanges();
      s.addRange(r);
    }
    richExecCommand('insertText', false, ' ');
    syncToState();
    return;
  }
  syncToState();
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    el.focus();
  }
}

type DraftSyncUi = 'idle' | 'offline' | 'local' | 'syncing' | 'synced';

function draftSyncBadgeTitle(status: DraftSyncUi): string {
  switch (status) {
    case 'offline':
      return 'Offline – changes will sync when you are back online';
    case 'syncing':
      return 'Syncing…';
    case 'local':
      return 'Unsaved changes (not synced yet)';
    case 'synced':
    case 'idle':
      return 'Synced to server';
    default:
      return '';
  }
}

function draftSyncBadgeLabel(status: DraftSyncUi): string {
  switch (status) {
    case 'offline':
      return 'Offline';
    case 'syncing':
      return 'Syncing…';
    case 'local':
      return 'Local';
    case 'synced':
    case 'idle':
      return 'Up to date';
    default:
      return '';
  }
}

const MAX_BLOCKS_PER_SECTION = 20;

type RevisionKind = 'initial' | 'opened' | 'draft_saved' | 'autosynced' | 'edited' | 'published';

type RevisionEntry = {
  id: string;
  kind: RevisionKind;
  label: string;
  at: number;
};

function formatRevisionWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function revisionKindBadgeClass(kind: RevisionKind): string {
  switch (kind) {
    case 'initial':
    case 'opened':
      return 'border-primary/50 bg-primary/10 text-primary';
    case 'draft_saved':
    case 'autosynced':
      return 'border-border bg-card text-foreground';
    case 'edited':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100';
    case 'published':
      return 'border-green-500/50 bg-green-500/10 text-green-900 dark:text-green-100';
    default:
      return 'border-border bg-muted text-foreground';
  }
}
const PRIMARY_SECTION_ID = 's-1';
const THUMB_ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
const THUMB_MAX_MB = 10;
const REVISIONS_SIDEBAR_VISIBLE = 10;

function formatThumbFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function SummaryEditor({
  value,
  onChange,
  maxWords,
  onFocusCapture,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  maxWords: number;
  onFocusCapture?: () => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const skipSync = useRef(false);
  const lastValidHtml = useRef(value || '');
  const savedSelectionRef = useRef<Range | null>(null);
  const closeCardAfterLinkRef = useRef(false);
  const lastKeyDownInSummaryRef = useRef(0);
  const [selectionCard, setSelectionCard] = useState<{ top: number; left: number } | null>(null);
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false });
  const [linkMode, setLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);
  const syncToState = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    if (summaryWordCount(html) > maxWords) {
      el.innerHTML = lastValidHtml.current;
      skipSync.current = true;
      return;
    }
    lastValidHtml.current = html;
    onChange(html);
  }, [onChange, maxWords]);

  const updateSelectionCard = useCallback(() => {
    if (closeCardAfterLinkRef.current) {
      closeCardAfterLinkRef.current = false;
      setSelectionCard(null);
      return;
    }
    const el = ref.current;
    const sel = document.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const collapsed = sel.isCollapsed;
    const active = document.activeElement;
    const focusInCard = cardRef.current?.contains(active);

    if (collapsed) {
      if (focusInCard) return;
      setSelectionCard(null);
      return;
    }

    // Support both left-to-right and right-to-left selection (anchor may be at start or end)
    const anchorInEl = el.contains(sel.anchorNode);
    const focusInEl = el.contains(sel.focusNode);
    if (!anchorInEl && !focusInEl) {
      setSelectionCard(null);
      return;
    }
    const range = sel.getRangeAt(0);
    // Show card for Ctrl+A (select all): don't suppress when selection spans the whole summary
    const fullRange = document.createRange();
    fullRange.selectNodeContents(el);
    const fullLen = fullRange.toString().length;
    const selLen = range.toString().length;
    const isSelectAll = fullLen > 0 && selLen >= fullLen - 1;
    if (!isSelectAll && Date.now() - lastKeyDownInSummaryRef.current < 400) {
      return;
    }
    const rangeForSave = range.cloneRange();
    trimSelectionRange(rangeForSave);
    const selectedText = rangeForSave.toString();
    if (!selectedText || !/\S/.test(selectedText)) {
      setSelectionCard(null);
      return;
    }
    try {
      savedSelectionRef.current = rangeForSave;
    } catch {
      savedSelectionRef.current = null;
    }
    setFormatState({
      bold: richQueryCommandState('bold'),
      italic: richQueryCommandState('italic'),
      underline: richQueryCommandState('underline'),
    });
    try {
      const rect = range.getBoundingClientRect();
      setSelectionCard({ top: rect.top - 8, left: rect.left });
    } catch {
      setSelectionCard(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateSelectionCard);
    return () => document.removeEventListener('selectionchange', updateSelectionCard);
  }, [updateSelectionCard]);

  useEffect(() => {
    if (!selectionCard) {
      setLinkMode(false);
      savedSelectionRef.current = null;
    }
  }, [selectionCard]);

  useEffect(() => {
    const closeOnScroll = () => setSelectionCard(null);
    globalThis.addEventListener('scroll', closeOnScroll, true);
    return () => globalThis.removeEventListener('scroll', closeOnScroll, true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (document.activeElement && el.contains(document.activeElement)) return;
    if (value && value !== '<br>') {
      el.innerHTML = value;
      collapseSpacesInElement(el);
      el.classList.remove('ss-editor-empty');
    } else {
      el.innerHTML = '<br>';
      el.classList.add('ss-editor-empty');
    }
    lastValidHtml.current = el.innerHTML;
  }, [value]);

  const handleInput = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const isFocused = document.activeElement && el.contains(document.activeElement);
    const savedOffset = isFocused ? getSelectionStartOffset(el) : -1;
    collapseSpacesInElement(el);
    if (savedOffset >= 0) setSelectionToOffset(el, Math.min(savedOffset, (el.textContent ?? '').length));
    let html = el.innerHTML;
    if (html === '\n' || (el.childNodes.length === 1 && el.querySelector('br'))) html = '';
    if (summaryWordCount(html) > maxWords) {
      el.innerHTML = lastValidHtml.current;
      skipSync.current = true;
      return;
    }
    lastValidHtml.current = html;
    onChange(html);
  }, [onChange, maxWords]);

  const applyFormat = useCallback(
    (cmd: 'bold' | 'italic' | 'underline') => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      richExecCommand(cmd, false);
      setFormatState((prev) => ({
        ...prev,
        bold: richQueryCommandState('bold'),
        italic: richQueryCommandState('italic'),
        underline: richQueryCommandState('underline'),
      }));
      syncToState();
    },
    [syncToState],
  );

  const normalizeLinkInput = useCallback((v: string) => v.replaceAll(/^https?:\/\//gi, '').trim(), []);
  const applyLink = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    linkInputRef.current?.blur();
    closeCardAfterLinkRef.current = true;
    setLinkInput('');
    setLinkMode(false);
    setSelectionCard(null);
    const rest = normalizeLinkInput(linkInput);
    const url = rest ? `https://${rest}` : 'https://';
    el.focus();
    const sel = document.getSelection();
    const range = savedSelectionRef.current;
    if (sel && range && el.contains(range.startContainer)) {
      try {
        sel.removeAllRanges();
        sel.addRange(range);
        richExecCommand('createLink', false, url);
      } catch {
        richExecCommand('createLink', false, url);
      }
      savedSelectionRef.current = null;
    } else {
      richExecCommand('createLink', false, url);
    }
    finalizeSummaryLinkInsertion(el, sel, syncToState);
  }, [linkInput, normalizeLinkInput, syncToState]);

  useEffect(() => {
    if (linkMode) linkInputRef.current?.focus();
  }, [linkMode]);

  const toggleBtn = (active: boolean) =>
    cn(
      'p-2 rounded-none border-2 focus:outline-none focus:ring-2 focus:ring-primary/30',
      active ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50',
    );

  return (
    <>
      <div className="relative">
        <span className="absolute -top-3 -left-3 bg-primary text-primary-foreground text-[8px] font-bold px-1 z-10 border border-black">P1</span>
        <div className="flex items-center justify-end text-[10px] font-bold text-muted-foreground mb-0.5">
          <span>
            {summaryWordCount(value)}/{maxWords} words
          </span>
        </div>
        {/* Rich summary: contentEditable; native textarea cannot express inline formatting. */}
        <div // NOSONAR S6848 — contentEditable summary; not replaceable by textarea
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onFocusCapture={onFocusCapture}
          tabIndex={0} // NOSONAR S6845 — editing host must be in sequential focus order
          aria-label="Summary"
          aria-multiline
          data-placeholder="SUMMARY_TEXT_HERE..."
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'a') lastKeyDownInSummaryRef.current = 0;
            else lastKeyDownInSummaryRef.current = Date.now();
            if (e.key === 'Enter') {
              e.preventDefault();
              richExecCommand('insertHTML', false, '<br>');
              handleInput();
              return;
            }
            if (e.key === ' ') {
              const sel = document.getSelection();
              const anchor = sel?.anchorNode;
              if (sel && sel.rangeCount > 0 && ref.current && anchor && ref.current.contains(anchor)) {
                const startRange = document.createRange();
                startRange.selectNodeContents(ref.current);
                startRange.setEnd(anchor, sel.anchorOffset);
                const textBefore = startRange.toString();
                if (/\s/.test(textBefore.slice(-1))) {
                  e.preventDefault();
                }
              }
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const raw = e.clipboardData.getData('text/plain') ?? '';
            const lines = raw.replace(/\r\n/g, '\n').split('\n');
            const htmlPaste = lines.map((line) => (line.length ? escapeHtmlPlain(line) : '')).join('<br>');
            richExecCommand('insertHTML', false, htmlPaste || '<br>');
            handleInput();
          }}
          className={cn(
            'w-full bg-transparent border-b-2 border-border py-3 text-base font-medium focus:outline-none focus:border-primary ss-summary-editor',
            (!value || value === '<br>') && 'ss-editor-empty',
            'ss-editor-empty:before:content-[attr(data-placeholder)] ss-editor-empty:before:text-muted-foreground ss-editor-empty:before:uppercase ss-editor-empty:before:tracking-tighter',
            '[&_strong]:font-bold [&_em]:italic [&_u]:underline',
          )}
        />
      </div>

      <AnimatePresence>
        {selectionCard && typeof document !== 'undefined' && summaryWordCount(value) > 0 && (
          <motion.div
            ref={cardRef}
            data-ss-summary-toolbar
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-[100] w-fit max-w-[90vw] border-2 border-border bg-card text-card-foreground shadow-[4px_4px_0px_0px_var(--border)] rounded-none overflow-hidden"
            style={{ top: selectionCard.top - 52, left: Math.max(8, selectionCard.left) }}
          >
            {linkMode ? (
              <div className="flex items-center gap-2 px-2 py-1.5 min-w-[200px]">
                <span className="flex items-center justify-center w-7 h-7 rounded-none border-2 border-border bg-primary text-primary-foreground shrink-0" aria-hidden>
                  <Link2 className="h-3.5 w-3.5" />
                </span>
                <div className="flex flex-1 items-center border-2 border-border overflow-hidden bg-muted/30 focus-within:border-primary min-w-0">
                  <span className="flex items-center px-1.5 py-1.5 text-[9px] font-bold text-muted-foreground bg-muted/50 border-r-2 border-border shrink-0 pointer-events-none">https://</span>
                  <input
                    ref={linkInputRef}
                    type="text"
                    value={linkInput}
                    onChange={(e) => setLinkInput(normalizeLinkInput(e.target.value))}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = (e.clipboardData.getData('text/plain') ?? '').replace(/^https?:\/\//i, '').trim();
                      setLinkInput((prev) => normalizeLinkInput(prev + pasted));
                    }}
                    placeholder="example.com"
                    className="flex-1 min-w-0 px-1.5 py-1.5 text-xs bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                      if (e.key === 'Escape') { setLinkMode(false); setLinkInput(''); }
                    }}
                  />
                </div>
                <button type="button" onClick={applyLink} className="shrink-0 h-7 px-2 border-2 border-primary bg-primary text-primary-foreground font-bold text-[9px] uppercase tracking-wider hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50" title="Insert link" aria-label="Insert link">
                  Apply
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">Format</span>
                <button type="button" onClick={() => applyFormat('bold')} className={toggleBtn(formatState.bold)} title="Bold" aria-label="Bold">
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => applyFormat('italic')} className={toggleBtn(formatState.italic)} title="Italic" aria-label="Italic">
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => applyFormat('underline')} className={toggleBtn(formatState.underline)} title="Underline" aria-label="Underline">
                  <UnderlineIcon className="h-3.5 w-3.5" />
                </button>
                <span className="w-px h-5 bg-border mx-0.5 shrink-0" aria-hidden />
                <button type="button" onClick={() => { setLinkMode(true); setLinkInput(''); }} className="p-1.5 rounded-none border-2 border-border hover:bg-muted/50 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30" title="Link" aria-label="Link">
                  <Link2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ThumbnailCropDialog({
  open,
  onClose,
  onConfirm,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File, cropArea: CropArea) => void;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setNaturalSize(null);
      return;
    }
    setNaturalSize(null);
    const img = new Image();
    const url = imageUrl;
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [imageUrl]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please select an image (JPEG, PNG, GIF, WebP).');
      return;
    }
    if (f.size > THUMB_MAX_MB * 1024 * 1024) {
      toast.error(`Image must be under ${THUMB_MAX_MB}MB.`);
      return;
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const onCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = () => {
    if (!file || !croppedAreaPixels) {
      toast.error('Select an area to crop.');
      return;
    }
    onConfirm(file, {
      x: croppedAreaPixels.x,
      y: croppedAreaPixels.y,
      width: croppedAreaPixels.width,
      height: croppedAreaPixels.height,
    });
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    onClose();
  };

  const handleCancel = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    onClose();
  };

  const thumbDescription = `JPEG, PNG, GIF, or WebP · max ${THUMB_MAX_MB} MB`;

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      titleId="thumbnail-crop-title"
      title="Upload thumbnail"
      titleIcon={<ImageIcon className="size-5" strokeWidth={2} aria-hidden />}
      description={thumbDescription}
      panelClassName={cn(
        'pointer-events-auto w-full max-w-md max-h-[90vh]',
        'border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]',
      )}
      contentClassName="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 sm:p-8"
      backdropClassName="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
    >
      <label htmlFor="thumbnail-crop-file-input" className="sr-only">
        Choose thumbnail image file
      </label>
      <input
        id="thumbnail-crop-file-input"
        ref={inputRef}
        type="file"
        accept={THUMB_ACCEPT}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      {!imageUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            'border-border bg-muted/20 hover:bg-muted/30 cursor-pointer'
          )}
        >
          <p className="text-sm font-bold text-foreground">Drop an image or click to browse</p>
          <p className="text-[10px] text-muted-foreground mt-1 placeholder:text-muted-foreground">Thumbnail will be uploaded when you publish</p>
        </button>
      )}
      {imageUrl && (
        <div className="space-y-4">
          {file ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-border/60 bg-muted/25 px-3 py-2.5 text-[10px]">
              <dt className="font-bold uppercase tracking-wide text-muted-foreground">File</dt>
              <dd className="min-w-0 truncate font-mono text-foreground" title={file.name}>
                {file.name}
              </dd>
              <dt className="font-bold uppercase tracking-wide text-muted-foreground">Size</dt>
              <dd className="font-mono text-foreground">{formatThumbFileSize(file.size)}</dd>
              <dt className="font-bold uppercase tracking-wide text-muted-foreground">Type</dt>
              <dd className="font-mono text-foreground">{file.type || '—'}</dd>
              {naturalSize ? (
                <>
                  <dt className="font-bold uppercase tracking-wide text-muted-foreground">Dimensions</dt>
                  <dd className="font-mono text-foreground">
                    {naturalSize.w}×{naturalSize.h}px
                  </dd>
                </>
              ) : null}
              <dt className="font-bold uppercase tracking-wide text-muted-foreground">Aspect</dt>
              <dd className="text-foreground">16:9 (thumbnail frame)</dd>
            </dl>
          ) : null}
          <CropperKeyboardWrapper imageReady={!!imageUrl} className="w-full h-56 rounded-lg overflow-hidden bg-muted border border-border">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </CropperKeyboardWrapper>
          <div className="flex items-center justify-between gap-4">
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-[10px] font-bold text-muted-foreground w-16 text-right">{zoom.toFixed(1)}x</span>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            Tip: focus the crop frame (click it), then arrow keys to pan. Hold Shift for smaller steps.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border border-border text-muted-foreground hover:bg-muted/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_var(--border)] hover:brightness-110"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function resolveCentreMaxWidthClass(leftSidebarOpen: boolean, rightSidebarOpen: boolean): string {
  if (leftSidebarOpen && rightSidebarOpen) return 'max-w-3xl';
  if (leftSidebarOpen || rightSidebarOpen) return 'max-w-5xl';
  return 'max-w-7xl';
}

type BlogWriteSyncRefs = {
  latestForSyncRef: { current: {
    title: string;
    summary: string;
    blocks: Block[];
    thumbnailPreviewUrl: string | null;
  } };
  tokenRef: { current: string | null | undefined };
  skipNextPopStateRef: { current: boolean };
};

type BlogWritePageSyncEffectsInput = Readonly<{
  title: string;
  summary: string;
  blocks: Block[];
  thumbnailPreviewUrl: string | null;
  isOnline: boolean;
  draftSyncStatus: DraftSyncUi;
  isDirty: boolean;
  setIsOnline: (v: boolean) => void;
  setDraftSyncStatus: React.Dispatch<React.SetStateAction<DraftSyncUi>>;
  setLeaveConfirmOpen: (v: boolean) => void;
  syncDraftToServer: () => Promise<void>;
  refs: BlogWriteSyncRefs;
}>;

function useBlogWritePageSyncEffects(input: BlogWritePageSyncEffectsInput): void {
  const {
    title,
    summary,
    blocks,
    thumbnailPreviewUrl,
    isOnline,
    draftSyncStatus,
    isDirty,
    setIsOnline,
    setDraftSyncStatus,
    setLeaveConfirmOpen,
    syncDraftToServer,
    refs: { latestForSyncRef, tokenRef, skipNextPopStateRef },
  } = input;

  const hadDirtyHistoryGuard = useRef(false);

  useEffect(() => {
    const hasContent = title.trim() || blocks.length > 0;
    if (!hasContent) return;
    if (!isOnline) {
      setDraftSyncStatus('offline');
      return;
    }
    if (draftSyncStatus === 'idle') setDraftSyncStatus('local');
    if (draftSyncStatus === 'synced') setDraftSyncStatus('local');
  }, [title, blocks, draftSyncStatus, isOnline, setDraftSyncStatus]);

  useEffect(() => {
    setIsOnline(globalThis.navigator?.onLine ?? true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      const { title: t, blocks: b } = latestForSyncRef.current;
      if (t.trim() || b.length > 0) setDraftSyncStatus('offline');
    };
    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);
    return () => {
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    };
  }, [latestForSyncRef, setDraftSyncStatus, setIsOnline]);

  useEffect(() => {
    if (isDirty && !hadDirtyHistoryGuard.current) {
      hadDirtyHistoryGuard.current = true;
      history.pushState({ blogWriteGuard: true }, '', location.href);
    }
    if (!isDirty) hadDirtyHistoryGuard.current = false;
  }, [isDirty]);

  useEffect(() => {
    const onPopState = () => {
      if (skipNextPopStateRef.current) {
        skipNextPopStateRef.current = false;
        return;
      }
      if (!isDirty) return;
      setLeaveConfirmOpen(true);
    };
    globalThis.addEventListener('popstate', onPopState);
    return () => globalThis.removeEventListener('popstate', onPopState);
  }, [skipNextPopStateRef, setLeaveConfirmOpen, isDirty]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // NOSONAR typescript:S1874 — legacy beforeunload confirmation in Chromium
      }
    };
    globalThis.addEventListener('beforeunload', onBeforeUnload);
    return () => globalThis.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      void syncDraftToServer();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [syncDraftToServer]);

  useEffect(() => {
    const handleOnline = () => {
      const { title: t, blocks: b } = latestForSyncRef.current;
      if ((t.trim() || b.length > 0) && tokenRef.current) void syncDraftToServer();
    };
    globalThis.addEventListener('online', handleOnline);
    return () => globalThis.removeEventListener('online', handleOnline);
  }, [latestForSyncRef, syncDraftToServer, tokenRef]);
}

function taxonomyApiFields(t: BlogPublishTaxonomy): { category: string; tags: string[]; language: string } {
  const cat = t.category
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^\w-]/g, '')
    .slice(0, 48);
  return {
    category: cat,
    tags: t.tags.slice(0, 20),
    language: (t.language || 'en').toLowerCase().replaceAll(/[^a-z-]/g, '').slice(0, 12) || 'en',
  };
}

function taxonomyPayload(t: BlogPublishTaxonomy): { category: string; tags: string[]; language: string } {
  const tf = taxonomyApiFields(t);
  return {
    category: tf.category || '',
    tags: tf.tags.length ? tf.tags : [],
    language: tf.language,
  };
}

async function runBlogWriteSubmit(args: Readonly<{
  status: 'draft' | 'published';
  token: string;
  title: string;
  summary: string;
  blocks: Block[];
  thumbnailFile: File | null;
  thumbnailCropArea: CropArea | null;
  thumbnailPreviewUrl: string | null;
  clearThumbnail: () => void;
  activePostId: string | null;
  setActivePostId: React.Dispatch<React.SetStateAction<string | null>>;
  setLoadedPostStatus: React.Dispatch<React.SetStateAction<'draft' | 'published' | null>>;
  setDraftSyncStatus: React.Dispatch<React.SetStateAction<DraftSyncUi>>;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  setSummary: React.Dispatch<React.SetStateAction<string>>;
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  /** When set on draft saves, persists category/tags/language. Omit on autosync paths. */
  taxonomy?: BlogPublishTaxonomy | null;
}>): Promise<void> {
  const {
    status,
    token,
    title,
    summary,
    blocks,
    thumbnailFile,
    thumbnailCropArea,
    thumbnailPreviewUrl,
    clearThumbnail,
    activePostId,
    setActivePostId,
    setLoadedPostStatus,
    setDraftSyncStatus,
    setTitle,
    setSummary,
    setBlocks,
    taxonomy,
  } = args;
  const content = JSON.stringify(stripLegacyGifBlocks(blocks));
  const summaryToSend =
    summary && summary !== '<br>' && summaryWordCount(summary) > 0 ? summary.trim() : undefined;
  const taxBody = taxonomy == null ? {} : taxonomyPayload(taxonomy);

  if (status === 'draft') {
    const thumbRemote = pickRemoteThumbnailForApi(thumbnailPreviewUrl);
    if (activePostId) {
      const { post, forkedFromPublished } = await blogApi.updatePost(
        activePostId,
        {
          title: title.trim() || 'Untitled draft',
          summary: summaryToSend,
          content,
          thumbnailUrl: thumbRemote,
          status: 'draft',
          ...taxBody,
        },
        token,
      );
      setActivePostId(post._id);
      setLoadedPostStatus('draft');
      setWriteEditorSessionPostId(post._id);
      if (forkedFromPublished) {
        toast.success('New draft saved — published post unchanged on the site.');
      } else {
        toast.success('DRAFT_SYNCED');
      }
    } else {
      const { post } = await blogApi.saveDraft(
        {
          title: title.trim() || 'Untitled draft',
          summary: summaryToSend,
          content,
          thumbnailUrl: thumbRemote,
          ...taxBody,
        },
        token,
      );
      setActivePostId(post._id);
      setLoadedPostStatus('draft');
      setWriteEditorSessionPostId(post._id);
      toast.success('DRAFT_SYNCED');
    }
    setDraftSyncStatus('synced');
    return;
  }

  let thumbnailUrl: string | undefined;
  if (thumbnailFile && thumbnailCropArea) {
    const data = await uploadCover(token, thumbnailFile, thumbnailCropArea, () => {});
    thumbnailUrl = data.url;
    clearThumbnail();
  } else {
    thumbnailUrl = pickRemoteThumbnailForApi(thumbnailPreviewUrl);
  }

  const publishTax = taxonomyPayload(taxonomy ?? { category: '', tags: [], language: 'en' });

  if (activePostId) {
    await blogApi.updatePost(
      activePostId,
      {
        title: title.trim(),
        summary: summaryToSend,
        content,
        thumbnailUrl,
        status: 'published',
        ...publishTax,
      },
      token,
    );
  } else {
    await blogApi.createPost(
      {
        title,
        summary: summaryToSend,
        content,
        thumbnailUrl,
        status: 'published',
        ...publishTax,
      },
      token,
    );
  }
  toast.success('POST_LIVE');
  setWriteEditorSessionPostId(null);
  setTitle('');
  setSummary('');
  setBlocks([]);
  setActivePostId(null);
  setLoadedPostStatus(null);
  setDraftSyncStatus('idle');
}

type BlogWriteDraftRefs = Readonly<{
  latestForSyncRef: { current: {
    title: string;
    summary: string;
    blocks: Block[];
    thumbnailPreviewUrl: string | null;
  } };
  tokenRef: { current: string | null | undefined };
}>;

type BlogWriteDraftHandlersInput = Readonly<{
  setDraftSyncStatus: React.Dispatch<React.SetStateAction<DraftSyncUi>>;
  setActivePostId: React.Dispatch<React.SetStateAction<string | null>>;
  setLoadedPostStatus: React.Dispatch<React.SetStateAction<'draft' | 'published' | null>>;
  activePostId: string | null;
  loadedPostStatus: 'draft' | 'published' | null;
  refs: BlogWriteDraftRefs;
}>;

function useBlogWriteServerDraftSync(input: BlogWriteDraftHandlersInput): { syncDraftToServer: () => Promise<void> } {
  const {
    setDraftSyncStatus,
    setActivePostId,
    setLoadedPostStatus,
    activePostId,
    loadedPostStatus,
    refs: { latestForSyncRef, tokenRef },
  } = input;

  const activePostIdRef = useRef(activePostId);
  const loadedPostStatusRef = useRef(loadedPostStatus);
  activePostIdRef.current = activePostId;
  loadedPostStatusRef.current = loadedPostStatus;

  const syncDraftToServer = useCallback((): Promise<void> => {
    if (!navigator.onLine) return Promise.resolve();
    const currentToken = tokenRef.current;
    if (!currentToken) return Promise.resolve();
    const { title: t, summary: s, blocks: b, thumbnailPreviewUrl: thumb } = latestForSyncRef.current;
    if (!t.trim() && b.length === 0) return Promise.resolve();
    setDraftSyncStatus('syncing');
    const content = JSON.stringify(stripLegacyGifBlocks(b));
    const summaryToSend = s && s !== '<br>' && summaryWordCount(s) > 0 ? s : undefined;
    const titleSend = t.trim() || 'Untitled draft';
    const thumbUrl = pickRemoteThumbnailForApi(thumb ?? null);
    const pid = activePostIdRef.current;
    const st = loadedPostStatusRef.current;

    const onErr = () => {
      setDraftSyncStatus('local');
    };

    if (pid) {
      const statusForApi: 'draft' | 'published' = st === 'published' ? 'published' : 'draft';
      return blogApi
        .updatePost(
          pid,
          {
            title: titleSend,
            summary: summaryToSend,
            content,
            thumbnailUrl: thumbUrl,
            status: statusForApi,
            silent: true,
          },
          currentToken,
        )
        .then(() => {
          setDraftSyncStatus('synced');
        })
        .catch(() => {
          onErr();
        });
    }

    return blogApi
      .saveDraft(
        {
          title: titleSend,
          summary: summaryToSend,
          content,
          thumbnailUrl: thumbUrl,
        },
        currentToken,
      )
      .then((res) => {
        setActivePostId(res.post._id);
        setLoadedPostStatus('draft');
        setDraftSyncStatus('synced');
      })
      .catch(() => {
        onErr();
      });
  }, [latestForSyncRef, tokenRef, setDraftSyncStatus, setActivePostId, setLoadedPostStatus]);

  return { syncDraftToServer };
}

type WriteFocusChrome = 'title' | 'summary' | 'body' | null;

type BlogWriteTopNavProps = Readonly<{
  username: string;
  title: string;
  focusChrome: WriteFocusChrome;
  activeBodyBlock: Block | null;
  hasDraftContent: boolean;
  loadedPostStatus: 'draft' | 'published' | null;
  leftSidebarOpen: boolean;
  onToggleLeft: () => void;
  rightSidebarOpen: boolean;
  onToggleRight: () => void;
  draftSyncStatus: DraftSyncUi;
  currentTime: string;
}>;

function focusContextLabel(chrome: WriteFocusChrome, bodyBlock: Block | null): string {
  if (chrome === 'title') return 'Title';
  if (chrome === 'summary') return 'Summary';
  if (chrome === 'body' && bodyBlock) return blockTypeDisplayName(bodyBlock.type);
  if (chrome === 'body') return 'Body';
  return '—';
}

function BlogWriteTopNav({
  username,
  title,
  focusChrome,
  activeBodyBlock,
  hasDraftContent,
  loadedPostStatus,
  leftSidebarOpen,
  onToggleLeft,
  rightSidebarOpen,
  onToggleRight,
  draftSyncStatus,
  currentTime,
}: BlogWriteTopNavProps) {
  const activeLabel = focusContextLabel(focusChrome, activeBodyBlock);
  return (
    <div className="flex-shrink-0 bg-card px-4 py-2 flex items-center gap-3 z-50 border-b border-border min-w-0">
      <div className="flex items-center gap-4 shrink-0 min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter min-w-0">
          <FileText className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
          <span className="shrink-0">Workspace</span>
          <ChevronRight className="h-3 w-3 opacity-30 shrink-0" />
          <span className="text-primary text-[9px] font-semibold shrink-0">{username}</span>
          <ChevronRight className="h-3 w-3 opacity-30 shrink-0" />
          <span className="bg-muted px-2 border border-border truncate max-w-[120px] sm:max-w-[200px] md:max-w-[280px]" title={title.trim() || 'new_entry.log'}>
            {title.trim() ? title.trim().replaceAll(/\s+/g, '_') : 'new_entry.log'}
          </span>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 flex-col gap-0.5 border-l border-border pl-3 sm:flex">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Active</span>
          <span className="min-w-0 truncate text-[10px] font-bold text-foreground" title={activeLabel}>
            {activeLabel}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onToggleLeft}
          className="p-1.5 rounded border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title={leftSidebarOpen ? 'Close left panel' : 'Open left panel'}
          aria-label={leftSidebarOpen ? 'Close left panel' : 'Open left panel'}
        >
          {leftSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onToggleRight}
          className="p-1.5 rounded border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title={rightSidebarOpen ? 'Close right panel' : 'Open right panel'}
          aria-label={rightSidebarOpen ? 'Close right panel' : 'Open right panel'}
        >
          {rightSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[8px] font-medium text-muted-foreground">
            <Activity className="h-2.5 w-2.5 text-green-500 animate-pulse" />
            <span>Uptime: 99.9%</span>
          </div>
          {hasDraftContent ? (
            loadedPostStatus === 'published' ? (
              <span
                className="rounded border border-green-500/50 bg-green-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-green-800 dark:text-green-200"
                title="This post is live. Autosave updates the published version on the server."
              >
                Live
              </span>
            ) : (
              <span
                className={cn(
                  'text-[8px] font-medium px-1.5 py-0.5 rounded border',
                  draftSyncStatus === 'offline' && 'text-amber-600 border-amber-500/50 bg-amber-500/10',
                  draftSyncStatus === 'syncing' && 'text-amber-600 border-amber-500/50 bg-amber-500/10',
                  draftSyncStatus === 'local' && 'text-muted-foreground border-border',
                  draftSyncStatus === 'synced' && 'text-green-600 border-green-500/50 bg-green-500/10',
                )}
                title={draftSyncBadgeTitle(draftSyncStatus)}
              >
                {draftSyncBadgeLabel(draftSyncStatus)}
              </span>
            )
          ) : null}
        </div>
        <div className="hidden min-w-[5.5rem] tabular-nums md:block text-[8px] font-medium text-muted-foreground">
          {currentTime || '\u00a0'}
        </div>
      </div>
    </div>
  );
}

export default function WriteBlogPage() {
  const { user, token, shouldBlock } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen } = useSidebar();
  const [title, setTitle] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailCropArea, setThumbnailCropArea] = useState<CropArea | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [thumbnailDialogOpen, setThumbnailDialogOpen] = useState(false);
  const [postCategory, setPostCategory] = useState('');
  const [postTags, setPostTags] = useState<string[]>([]);
  const [postLanguage, setPostLanguage] = useState('en');
  const [taxonomyCategories, setTaxonomyCategories] = useState<BlogTaxonomyRow[]>([]);
  const [taxonomyTags, setTaxonomyTags] = useState<BlogTaxonomyRow[]>([]);
  const [deployOverlayOpen, setDeployOverlayOpen] = useState(false);
  const [publishDialogSnapshot, setPublishDialogSnapshot] = useState<BlogPublishTaxonomy>({
    category: '',
    tags: [],
    language: 'en',
  });
  const [summary, setSummary] = useState('');
  const [blocks, setBlocks] = useState<Block[]>(() => []);
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'published' | 'metadata' | null>(null);
  /** Empty until client mount — avoids SSR/client `toLocaleTimeString()` mismatch. */
  const [currentTime, setCurrentTime] = useState('');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [draftSyncStatus, setDraftSyncStatus] = useState<'idle' | 'offline' | 'local' | 'syncing' | 'synced'>('idle');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [loadedPostStatus, setLoadedPostStatus] = useState<'draft' | 'published' | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [contentBaseline, setContentBaseline] = useState<string | null>(null);
  const [focusChrome, setFocusChrome] = useState<WriteFocusChrome>(null);
  const [activeBodyBlock, setActiveBodyBlock] = useState<Block | null>(null);
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [revisionHistoryOpen, setRevisionHistoryOpen] = useState(false);
  const revisionDialogScrollRef = useRef<HTMLDivElement>(null);
  const revisionHistorySectionRef = useRef<HTMLDivElement>(null);
  const prevRightSidebarOpenRef = useRef(true);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const latestForSyncRef = useRef({ title: '', summary: '', blocks: [] as Block[], thumbnailPreviewUrl: null as string | null });
  const tokenRef = useRef<string | undefined>(token);
  const skipNextPopStateRef = useRef(false);
  const autosyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRevisionSessionKeyRef = useRef<string | null>(null);
  const prevDraftSyncForRevisionRef = useRef<DraftSyncUi>('idle');
  const lastAutosyncRevisionAtRef = useRef(0);
  const idleEditRevisionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEditedRevisionAtRef = useRef(0);
  latestForSyncRef.current = { title, summary, blocks, thumbnailPreviewUrl };
  tokenRef.current = token;

  useEffect(() => {
    let cancelled = false;
    void blogApi
      .getTaxonomy()
      .then((r) => {
        if (cancelled) return;
        setTaxonomyCategories(r.categories);
        setTaxonomyTags(r.tags);
      })
      .catch(() => {
        // suggestions optional
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!revisionHistoryOpen) return;
    const el = revisionDialogScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = 0;
    });
  }, [revisionHistoryOpen]);

  useEffect(() => {
    if (rightSidebarOpen) {
      const wasClosed = !prevRightSidebarOpenRef.current;
      if (wasClosed) {
        requestAnimationFrame(() => {
          revisionHistorySectionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      }
    }
    prevRightSidebarOpenRef.current = rightSidebarOpen;
  }, [rightSidebarOpen]);

  const appendRevision = useCallback((entry: Omit<RevisionEntry, 'id'>) => {
    const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setRevisions((prev) => [{ id, ...entry }, ...prev].slice(0, 500));
  }, []);

  const revisionSessionKey = `${token ?? 'anon'}:${activePostId ?? 'scratch'}:${loadedPostStatus ?? 'none'}`;

  const primarySectionBlocks = useMemo(
    () => blocks.filter((b) => (b.sectionId ?? PRIMARY_SECTION_ID) === PRIMARY_SECTION_ID),
    [blocks],
  );

  const totalWords = useMemo(
    () => totalWorkspaceWordCount({ title, summaryHtml: summary, blocks }),
    [title, summary, blocks],
  );

  const handleBodyActiveBlock = useCallback((b: Block | null) => {
    setFocusChrome('body');
    setActiveBodyBlock(b);
  }, []);

  const captureBaseline = useCallback(() => {
    setContentBaseline(serializeWriteWorkspace({ title, summary, blocks, thumbnailPreviewUrl }));
  }, [title, summary, blocks, thumbnailPreviewUrl]);

  const isDirty = useMemo(() => {
    if (!workspaceReady || contentBaseline === null) return false;
    return (
      contentBaseline !== serializeWriteWorkspace({ title, summary, blocks, thumbnailPreviewUrl })
    );
  }, [workspaceReady, contentBaseline, title, summary, blocks, thumbnailPreviewUrl]);

  const saveDisabledNoEdits = activePostId !== null && !isDirty;

  const { syncDraftToServer } = useBlogWriteServerDraftSync({
    setDraftSyncStatus,
    setActivePostId,
    setLoadedPostStatus,
    activePostId,
    loadedPostStatus,
    refs: { latestForSyncRef, tokenRef },
  });

  useEffect(() => {
    if (!workspaceReady || !token) return;
    if (lastRevisionSessionKeyRef.current === revisionSessionKey) return;
    lastRevisionSessionKeyRef.current = revisionSessionKey;
    const at = Date.now();
    const id = `r-${at}-boot`;
    const first: RevisionEntry = activePostId
      ? {
          id,
          kind: 'opened',
          label:
            loadedPostStatus === 'published'
              ? 'Published post opened from server'
              : 'Draft opened from server',
          at,
        }
      : { id, kind: 'initial', label: 'Initial blog', at };
    setRevisions([first]);
    prevDraftSyncForRevisionRef.current = draftSyncStatus;
  }, [workspaceReady, token, revisionSessionKey, activePostId, loadedPostStatus]);

  useEffect(() => {
    if (!workspaceReady) return;
    const prev = prevDraftSyncForRevisionRef.current;
    prevDraftSyncForRevisionRef.current = draftSyncStatus;
    if (prev !== 'syncing' || draftSyncStatus !== 'synced') return;
    const now = Date.now();
    if (now - lastAutosyncRevisionAtRef.current < 90_000) return;
    lastAutosyncRevisionAtRef.current = now;
    appendRevision({ kind: 'autosynced', label: 'Draft synced to server', at: now });
  }, [draftSyncStatus, workspaceReady, appendRevision]);

  useEffect(() => {
    if (!workspaceReady || !isDirty) return;
    if (idleEditRevisionTimerRef.current) clearTimeout(idleEditRevisionTimerRef.current);
    idleEditRevisionTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastEditedRevisionAtRef.current < 4 * 60 * 1000) return;
      lastEditedRevisionAtRef.current = now;
      appendRevision({ kind: 'edited', label: 'Content updated', at: now });
    }, 8000);
    return () => {
      if (idleEditRevisionTimerRef.current) clearTimeout(idleEditRevisionTimerRef.current);
    };
  }, [title, summary, blocks, isDirty, workspaceReady, appendRevision]);

  useEffect(() => {
    try {
      globalThis.localStorage?.removeItem('syntax-stories-blog-draft');
    } catch {
      // ignore
    }
  }, []);

  /** Legacy `?postId=` → sessionStorage only (id never stays in the address bar). */
  useEffect(() => {
    const legacy = searchParams.get('postId');
    if (!legacy) return;
    setWriteEditorSessionPostId(legacy);
    router.replace('/blogs/write', { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (!token) {
      setContentBaseline(null);
      setWorkspaceReady(true);
      return;
    }
    let cancelled = false;
    setWorkspaceReady(false);
    setContentBaseline(null);
    lastRevisionSessionKeyRef.current = null;
    (async () => {
      try {
        const targetId = getWriteEditorSessionPostId();
        if (targetId) {
          const { post } = await blogApi.getMyPost(targetId, token);
          if (cancelled) return;
          let nextBlocks: Block[] = [];
          try {
            const parsed = JSON.parse(post.content) as unknown;
            if (Array.isArray(parsed)) nextBlocks = stripLegacyGifBlocks(parsed as Block[]);
          } catch {
            nextBlocks = [];
          }
          const nextTitle = post.title || '';
          const nextSummary = post.summary || '';
          const nextThumb = post.thumbnailUrl?.startsWith('http') ? post.thumbnailUrl : null;
          setTitle(nextTitle);
          setSummary(nextSummary);
          setBlocks(nextBlocks);
          setThumbnailPreviewUrl(nextThumb);
          setThumbnailFile(null);
          setThumbnailCropArea(null);
          setPostCategory(post.category ?? '');
          setPostTags(Array.isArray(post.tags) ? post.tags : []);
          setPostLanguage(post.language ?? 'en');
          setActivePostId(post._id);
          setLoadedPostStatus(post.status);
          setDraftSyncStatus('synced');
          setWriteEditorSessionPostId(post._id);
          setContentBaseline(
            serializeWriteWorkspace({
              title: nextTitle,
              summary: nextSummary,
              blocks: nextBlocks,
              thumbnailPreviewUrl: nextThumb,
            }),
          );
        } else {
          setActivePostId(null);
          setLoadedPostStatus(null);
          const { draft } = await blogApi.getDraft(token);
          if (cancelled) return;
          if (draft) {
            let nextBlocks: Block[] = [];
            try {
              const parsed = JSON.parse(draft.content) as unknown;
              if (Array.isArray(parsed)) nextBlocks = stripLegacyGifBlocks(parsed as Block[]);
            } catch {
              nextBlocks = [];
            }
            const nextTitle = draft.title || '';
            const nextSummary = draft.summary || '';
            const nextThumb = draft.thumbnailUrl?.startsWith('http') ? draft.thumbnailUrl : null;
            setTitle(nextTitle);
            setSummary(nextSummary);
            setBlocks(nextBlocks);
            setThumbnailPreviewUrl(nextThumb);
            setThumbnailFile(null);
            setThumbnailCropArea(null);
            setPostCategory(draft.category ?? '');
            setPostTags(Array.isArray(draft.tags) ? draft.tags : []);
            setPostLanguage(draft.language ?? 'en');
            setActivePostId(draft._id);
            setLoadedPostStatus('draft');
            setDraftSyncStatus('synced');
            setWriteEditorSessionPostId(draft._id);
            setContentBaseline(
              serializeWriteWorkspace({
                title: nextTitle,
                summary: nextSummary,
                blocks: nextBlocks,
                thumbnailPreviewUrl: nextThumb,
              }),
            );
          } else {
            setTitle('');
            setSummary('');
            setBlocks([]);
            setPostCategory('');
            setPostTags([]);
            setPostLanguage('en');
            setThumbnailPreviewUrl(null);
            setThumbnailFile(null);
            setThumbnailCropArea(null);
            setDraftSyncStatus('idle');
            setWriteEditorSessionPostId(null);
            setContentBaseline(
              serializeWriteWorkspace({
                title: '',
                summary: '',
                blocks: [],
                thumbnailPreviewUrl: null,
              }),
            );
          }
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Could not load editor');
      } finally {
        if (!cancelled) setWorkspaceReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !workspaceReady) return;
    const hasContent = title.trim() || blocks.length > 0;
    if (!hasContent || !navigator.onLine) return;
    if (autosyncTimerRef.current) clearTimeout(autosyncTimerRef.current);
    autosyncTimerRef.current = setTimeout(() => {
      void syncDraftToServer();
    }, 2800);
    return () => {
      if (autosyncTimerRef.current) clearTimeout(autosyncTimerRef.current);
    };
  }, [token, workspaceReady, title, summary, blocks, thumbnailPreviewUrl, syncDraftToServer]);

  const resizeTitleInput = useCallback(() => {
    const el = titleInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resizeTitleInput();
  }, [title, resizeTitleInput]);

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleThumbnailConfirm = useCallback((file: File, cropArea: CropArea) => {
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailFile(file);
    setThumbnailCropArea(cropArea);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  }, [thumbnailPreviewUrl]);

  const clearThumbnail = useCallback(() => {
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailFile(null);
    setThumbnailCropArea(null);
    setThumbnailPreviewUrl(null);
  }, [thumbnailPreviewUrl]);

  const addBlock = useCallback(
    (type: BlockType) => {
      const count = blocks.filter(
        (b) => (b.sectionId ?? PRIMARY_SECTION_ID) === PRIMARY_SECTION_ID,
      ).length;
      if (count >= MAX_BLOCKS_PER_SECTION) {
        toast.error(`Limit reached (${MAX_BLOCKS_PER_SECTION} blocks)`);
        return;
      }
      setBlocks((prev) => [...prev, createBlockInSection(type, PRIMARY_SECTION_ID)]);
    },
    [blocks],
  );

  useBlogWritePageSyncEffects({
    title,
    summary,
    blocks,
    thumbnailPreviewUrl,
    isOnline,
    draftSyncStatus,
    isDirty,
    setIsOnline,
    setDraftSyncStatus,
    setLeaveConfirmOpen,
    syncDraftToServer,
    refs: {
      latestForSyncRef,
      tokenRef,
      skipNextPopStateRef,
    },
  });

  const handleLeaveConfirmYes = useCallback(() => {
    setLeaveConfirmOpen(false);
    skipNextPopStateRef.current = true;
    void (async () => {
      try {
        await syncDraftToServer();
      } catch {
        // sync errors already reflected in badge
      }
      history.back();
    })();
  }, [syncDraftToServer]);

  const handleLeaveConfirmNo = useCallback(() => {
    setLeaveConfirmOpen(false);
    history.pushState({ blogWriteGuard: true }, '', location.href);
  }, []);

  const openDeployOverlay = useCallback(() => {
    if (!title.trim()) {
      toast.error('ERROR: TITLE_REQUIRED');
      return;
    }
    setPublishDialogSnapshot({
      category: postCategory,
      tags: [...postTags],
      language: postLanguage,
    });
    setDeployOverlayOpen(true);
  }, [title, postCategory, postTags, postLanguage]);

  const executePublish = useCallback(
    async (taxonomy: BlogPublishTaxonomy) => {
      if (!title.trim()) {
        toast.error('ERROR: TITLE_REQUIRED');
        return;
      }
      if (!token) return;
      setDeployOverlayOpen(false);
      setSubmitting(true);
      setSubmitAction('published');
      try {
        await runBlogWriteSubmit({
          status: 'published',
          token,
          title,
          summary,
          blocks,
          thumbnailFile,
          thumbnailCropArea,
          thumbnailPreviewUrl,
          clearThumbnail,
          activePostId,
          setActivePostId,
          setLoadedPostStatus,
          setDraftSyncStatus,
          setTitle,
          setSummary,
          setBlocks,
          taxonomy,
        });
        appendRevision({ kind: 'published', label: 'Post published', at: Date.now() });
        setContentBaseline(null);
        setPostCategory('');
        setPostTags([]);
        setPostLanguage('en');
      } catch (e) {
        console.error(e);
        toast.error('FATAL: UPLOAD_FAILED');
      } finally {
        setSubmitting(false);
        setSubmitAction(null);
      }
    },
    [
      title,
      token,
      summary,
      blocks,
      thumbnailFile,
      thumbnailCropArea,
      thumbnailPreviewUrl,
      clearThumbnail,
      activePostId,
      setDraftSyncStatus,
      appendRevision,
      setContentBaseline,
      setPostCategory,
      setPostTags,
      setPostLanguage,
    ],
  );

  const handleSavePostDetailsFromDialog = useCallback(
    async (tax: BlogPublishTaxonomy) => {
      if (!token) return;
      setPostCategory(tax.category);
      setPostTags(tax.tags);
      setPostLanguage(tax.language);
      setSubmitting(true);
      setSubmitAction('metadata');
      try {
        const content = JSON.stringify(stripLegacyGifBlocks(blocks));
        const summaryToSend =
          summary && summary !== '<br>' && summaryWordCount(summary) > 0 ? summary.trim() : undefined;
        const tr = taxonomyPayload(tax);
        const thumbUrl = pickRemoteThumbnailForApi(thumbnailPreviewUrl);
        if (activePostId) {
          const st = loadedPostStatus === 'published' ? 'published' : 'draft';
          await blogApi.updatePost(
            activePostId,
            {
              title: title.trim() || 'Untitled draft',
              summary: summaryToSend,
              content,
              thumbnailUrl: thumbUrl,
              status: st,
              category: tr.category || '',
              tags: tr.tags,
              language: tr.language,
            },
            token,
          );
        } else {
          const { post } = await blogApi.saveDraft(
            {
              title: title.trim() || 'Untitled draft',
              summary: summaryToSend,
              content,
              thumbnailUrl: thumbUrl,
              category: tr.category || '',
              tags: tr.tags,
              language: tr.language,
            },
            token,
          );
          setActivePostId(post._id);
          setLoadedPostStatus('draft');
          setWriteEditorSessionPostId(post._id);
        }
        toast.success('Classification saved to draft');
        appendRevision({ kind: 'draft_saved', label: 'Details updated', at: Date.now() });
      } catch (e) {
        console.error(e);
        toast.error(e instanceof Error ? e.message : 'Could not save details');
      } finally {
        setSubmitting(false);
        setSubmitAction(null);
      }
    },
    [
      token,
      blocks,
      summary,
      title,
      thumbnailPreviewUrl,
      activePostId,
      loadedPostStatus,
      appendRevision,
      setActivePostId,
      setLoadedPostStatus,
    ],
  );

  const handleSaveDraft = useCallback(
    async () => {
      if (!title.trim()) {
        toast.error('ERROR: TITLE_REQUIRED');
        return;
      }
      if (!token) return;
      setSubmitting(true);
      setSubmitAction('draft');
      try {
        await runBlogWriteSubmit({
          status: 'draft',
          token,
          title,
          summary,
          blocks,
          thumbnailFile,
          thumbnailCropArea,
          thumbnailPreviewUrl,
          clearThumbnail,
          activePostId,
          setActivePostId,
          setLoadedPostStatus,
          setDraftSyncStatus,
          setTitle,
          setSummary,
          setBlocks,
          taxonomy: { category: postCategory, tags: postTags, language: postLanguage },
        });
        appendRevision({ kind: 'draft_saved', label: 'Draft saved', at: Date.now() });
        captureBaseline();
      } catch (e) {
        console.error(e);
        toast.error('FATAL: UPLOAD_FAILED');
      } finally {
        setSubmitting(false);
        setSubmitAction(null);
      }
    },
    [
      title,
      token,
      summary,
      blocks,
      thumbnailFile,
      thumbnailCropArea,
      thumbnailPreviewUrl,
      clearThumbnail,
      setDraftSyncStatus,
      activePostId,
      captureBaseline,
      appendRevision,
      postCategory,
      postTags,
      postLanguage,
    ],
  );

  if (shouldBlock) return <BlogWritePageSkeletonInner />;
  if (token && !workspaceReady) return <BlogWritePageSkeletonInner />;

  const centreMaxWidthClass = resolveCentreMaxWidthClass(leftSidebarOpen, rightSidebarOpen);

  return (
    <div
      className={cn(
        'ss-write-theme-transition flex h-screen max-h-screen w-full flex-col overflow-hidden border-2 border-border bg-background font-mono text-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)]',
      )}
    >
      <BlogWriteTopNav
        username={user?.username || 'user'}
        title={title}
        focusChrome={focusChrome}
        activeBodyBlock={activeBodyBlock}
        hasDraftContent={Boolean(title.trim() || blocks.length > 0)}
        loadedPostStatus={loadedPostStatus}
        leftSidebarOpen={leftSidebarOpen}
        onToggleLeft={() => setLeftSidebarOpen((o) => !o)}
        rightSidebarOpen={rightSidebarOpen}
        onToggleRight={() => setRightSidebarOpen((o) => !o)}
        draftSyncStatus={draftSyncStatus}
        currentTime={currentTime}
      />

      {/* 2. MAIN WORKBENCH - flex so centre expands when sidebars collapse */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT SIDEBAR: animated width, icon strip when collapsed */}
        <motion.div
          initial={false}
          animate={{ width: leftSidebarOpen ? 280 : 56 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'flex-shrink-0 flex flex-col border-r-2 border-border bg-muted/20 overflow-hidden min-h-full',
            'hidden lg:flex',
          )}
        >
          <AnimatePresence mode="wait">
            {leftSidebarOpen ? (
              <motion.div
                key="left-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex h-full min-h-0 w-[280px] flex-col p-4"
              >
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" /> Tools
                  </h3>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                    {DEFAULT_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addBlock(item.id as BlockType)}
                          className="flex w-full cursor-pointer items-center gap-2 rounded border border-transparent px-2 py-1.5 text-left text-[11px] transition-all hover:border-border hover:bg-card"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section className="mt-auto shrink-0 border-t border-border/40 pt-4">
                  <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                    <Cpu className="h-3.5 w-3.5" /> Stats
                  </h3>
                  <div className="space-y-2 border-2 border-border bg-black/5 p-3">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-muted-foreground">Blocks (body)</span>
                      <span className="font-mono font-bold text-primary">
                        {primarySectionBlocks.length}/{MAX_BLOCKS_PER_SECTION}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-border">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (primarySectionBlocks.length / MAX_BLOCKS_PER_SECTION) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between gap-2 text-[9px]">
                      <span className="text-muted-foreground">Words (workspace)</span>
                      <span className="shrink-0 font-mono font-bold text-primary">{totalWords.toLocaleString()}</span>
                    </div>
                    <p className="text-[8px] leading-snug text-muted-foreground">
                      Title, summary, and every block (paragraphs, headings, code, tables, captions, …).
                    </p>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="left-icons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center py-3 gap-1 w-14 min-h-0 flex-1"
              >
                <div className="flex-1 overflow-y-auto flex flex-col items-center gap-0.5 min-h-0 pt-1">
                  {DEFAULT_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addBlock(item.id as BlockType)}
                        title={item.label}
                        className="p-2 rounded border border-transparent hover:border-border hover:bg-card text-muted-foreground hover:text-primary transition-all shrink-0"
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
                <div className="shrink-0 mt-2 pt-2 border-t border-border/50 w-full flex flex-col items-center gap-1.5">
                  <div className="relative w-9 h-9">
                    <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
                      <circle
                        cx="18" cy="18" r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${Math.min(primarySectionBlocks.length / MAX_BLOCKS_PER_SECTION, 1) * 88} 88`}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-300"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                      {primarySectionBlocks.length}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-center text-[8px] text-muted-foreground">
                    <div className="font-semibold text-foreground">{totalWords.toLocaleString()}</div>
                    <div>words</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* CENTRE: expands to fill space */}
        <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 ss-center-scroll">
          <div className={cn('mx-auto transition-[max-width] duration-300', centreMaxWidthClass)}>
             <div className="mb-8">
               <div className="relative mb-8">
                 <span className="absolute -top-3 -left-3 bg-primary text-primary-foreground text-[8px] font-bold px-1 z-10 border border-black">H1</span>
                 <div className="flex items-center justify-end text-[10px] font-bold text-muted-foreground mb-0.5">
                   <span>{title.length}/{TITLE_MAX}</span>
                 </div>
                 <textarea
                  ref={titleInputRef}
                  value={title}
                  onFocus={() => {
                    setFocusChrome('title');
                    setActiveBodyBlock(null);
                  }}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, TITLE_MAX).replaceAll(/\s+/g, ' ');
                    setTitle(next);
                    resizeTitleInput();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const raw = e.clipboardData.getData('text/plain') ?? '';
                    const plain = raw.replaceAll(/\s+/g, ' ').trim();
                    const ta = titleInputRef.current;
                    if (!ta) return;
                    const start = ta.selectionStart ?? 0;
                    const end = ta.selectionEnd ?? start;
                    const before = title.slice(0, start);
                    const after = title.slice(end);
                    const maxInsert = TITLE_MAX - before.length - after.length;
                    const toInsert = plain.slice(0, Math.max(0, maxInsert));
                    const newTitle = (before + toInsert + after).replaceAll(/\s+/g, ' ').slice(0, TITLE_MAX);
                    setTitle(newTitle);
                    requestAnimationFrame(() => {
                      resizeTitleInput();
                      const newPos = Math.min(before.length + toInsert.length, newTitle.length);
                      ta.setSelectionRange(newPos, newPos);
                    });
                  }}
                  placeholder="INPUT_TITLE_HERE..."
                  className="w-full min-h-[3rem] overflow-hidden bg-transparent border-b-2 border-border text-4xl md:text-5xl font-black uppercase tracking-tighter focus:outline-none focus:border-primary placeholder:text-muted-foreground py-4 resize-none"
                  rows={1}
                 />
               </div>
               <SummaryEditor
                 value={summary}
                 onChange={setSummary}
                 maxWords={SUMMARY_MAX_WORDS}
                 onFocusCapture={() => {
                   setFocusChrome('summary');
                   setActiveBodyBlock(null);
                 }}
               />
             </div>

             <BlogWriteEditor
               blocks={blocks}
               onBlocksChange={setBlocks}
               token={token ?? null}
               currentUserUsername={user?.username}
               currentUserHasGithub={user?.isGitAccount}
               isSidebarOpen={isOpen}
               maxWidthClassName="max-w-full"
               activeSectionId={PRIMARY_SECTION_ID}
               onActiveBlockChange={handleBodyActiveBlock}
             />
          </div>
        </div>
        </div>

        {/* RIGHT SIDEBAR: animated width, icon strip when collapsed */}
        <motion.div
          initial={false}
          animate={{ width: rightSidebarOpen ? 300 : 56 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={cn(
            'flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-l-2 border-border bg-card',
            'hidden lg:flex',
          )}
        >
          <AnimatePresence mode="wait">
            {rightSidebarOpen ? (
              <motion.div
                key="right-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex h-full min-h-0 w-[300px] flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain p-6 [scrollbar-width:thin]"
              >
                <div className="shrink-0 space-y-4">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Publish_Control
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={openDeployOverlay}
                      disabled={submitting || !title.trim()}
                      className="group relative bg-primary text-primary-foreground border-2 border-black p-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Send className="h-4 w-4" /> {submitAction === 'published' ? 'Deploying...' : 'Deploy_Post'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveDraft()}
                      disabled={submitting || saveDisabledNoEdits}
                      className="bg-muted border-2 border-border p-3 font-black uppercase text-xs shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all hover:bg-card disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Save className="h-4 w-4" /> {submitAction === 'draft' ? 'Saving...' : 'Save_Draft'}
                      </div>
                    </button>
                  </div>
                </div>
                <div className="mb-6 shrink-0 space-y-4 border-t border-border/40 pt-6">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <Globe className="h-4 w-4 text-primary" /> Asset_Configuration
                  </h3>
                  <div>
                   
                    {thumbnailPreviewUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-video overflow-hidden bg-muted ring-1 ring-border/40">
                          <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setThumbnailDialogOpen(true)}
                            className="flex-1 px-2 py-1.5 text-[10px] font-bold uppercase border-0 bg-muted/50 ring-1 ring-border/40 hover:bg-muted/70"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={clearThumbnail}
                            className="px-2 py-1.5 text-[10px] font-bold uppercase rounded-md border-0 bg-destructive/10 text-destructive ring-1 ring-destructive/30 hover:bg-destructive/15 flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id="write-blog-thumbnail-trigger"
                        onClick={() => setThumbnailDialogOpen(true)}
                        className={cn(
                          'w-full aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]  border border-dashed border-border ',
                          'hover:bg-muted/35 transition-colors text-left',
                        )}
                      >
                        <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Upload thumbnail</span>
                        <span className="text-[9px] text-muted-foreground">JPEG, PNG, GIF, WebP · max {THUMB_MAX_MB}MB</span>
                      </button>
                    )}
                  </div>
                </div>
                <div
                  ref={revisionHistorySectionRef}
                  className="mt-auto flex min-h-0 flex-1 flex-col border-t border-border/50 pt-6 scroll-mt-6"
                >
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wide text-foreground">
                      <History className="h-3.5 w-3.5 shrink-0 text-primary" /> Revision history
                    </h4>
                    {revisions.length > 0 ? (
                      <span className="shrink-0 font-mono text-[8px] text-muted-foreground">{revisions.length}</span>
                    ) : null}
                  </div>
                  <ul className="min-h-0 max-h-[min(42vh,15rem)] flex-1 space-y-2.5 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1 [scrollbar-width:thin]">
                    {revisions.slice(0, REVISIONS_SIDEBAR_VISIBLE).map((r) => (
                      <li
                        key={r.id}
                        className="flex gap-2 border-l-2 border-primary/50 pl-2.5 text-[9px] leading-snug"
                      >
                        <span
                          className={cn(
                            'mt-0.5 shrink-0 rounded border px-1 py-0.5 text-[7px] font-black uppercase tracking-wider',
                            revisionKindBadgeClass(r.kind),
                          )}
                        >
                          {r.kind.replaceAll('_', ' ')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground">{r.label}</div>
                          <div className="mt-0.5 font-mono text-[8px] text-muted-foreground">{formatRevisionWhen(r.at)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {revisions.length > REVISIONS_SIDEBAR_VISIBLE ? (
                    <button
                      type="button"
                      onClick={() => setRevisionHistoryOpen(true)}
                      className="mt-3 flex w-full shrink-0 items-center justify-center gap-2 border-2 border-border bg-muted/30 px-2 py-2 text-[9px] font-black uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                    >
                      <ListTree className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      View all ({revisions.length})
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="right-icons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center py-3 gap-1 w-14"
              >
                <button
                  type="button"
                  onClick={openDeployOverlay}
                  disabled={submitting || !title.trim()}
                  title="Deploy post"
                  className="p-2 rounded border border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveDraft()}
                  disabled={submitting || saveDisabledNoEdits}
                  title="Save draft"
                  className="p-2 rounded border border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailDialogOpen(true)}
                  title="Thumbnail"
                  className="p-2 rounded border border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-primary transition-all"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
                <div className="mt-2 pt-2 border-t border-border/50">
                  <span className="text-muted-foreground" title="Revision history">
                    <History className="h-4 w-4" />
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <ThumbnailCropDialog
        open={thumbnailDialogOpen}
        onClose={() => setThumbnailDialogOpen(false)}
        onConfirm={handleThumbnailConfirm}
      />

      <BlogWriteDeployOverlay
        open={deployOverlayOpen}
        onClose={() => !submitting && setDeployOverlayOpen(false)}
        snapshot={publishDialogSnapshot}
        taxonomyCategories={taxonomyCategories}
        taxonomyTags={taxonomyTags}
        title={title}
        summaryHtml={summary}
        thumbnailPreviewUrl={thumbnailPreviewUrl}
        deploying={submitting && submitAction === 'published'}
        savingClassification={submitting && submitAction === 'metadata'}
        onSaveClassification={(t) => void handleSavePostDetailsFromDialog(t)}
        onDeploy={(t) => void executePublish(t)}
      />

      <Dialog
        open={revisionHistoryOpen}
        onClose={() => setRevisionHistoryOpen(false)}
        titleId="revision-history-all-title"
        panelClassName={cn(
          'pointer-events-auto flex h-[min(90vh,560px)] max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden',
          'border-2 border-border bg-card shadow-[6px_6px_0px_0px_var(--border)]',
        )}
        contentClassName="relative flex h-full min-h-0 flex-1 flex-col p-0"
      >
        <div className="shrink-0 border-b-2 border-border px-5 py-4 sm:px-6">
          <h2 id="revision-history-all-title" className="text-sm font-black uppercase tracking-widest">
            All revision history
          </h2>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {revisions.length} {revisions.length === 1 ? 'entry' : 'entries'} · newest first
          </p>
        </div>
        <div
          ref={revisionDialogScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 py-4 sm:px-6 [scrollbar-width:thin]"
        >
          <ul className="space-y-3">
            {revisions.map((r) => (
              <li
                key={r.id}
                className="flex gap-2 border-l-2 border-primary/50 pl-2.5 text-[10px] leading-snug"
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider',
                    revisionKindBadgeClass(r.kind),
                  )}
                >
                  {r.kind.replaceAll('_', ' ')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{r.label}</div>
                  <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">{formatRevisionWhen(r.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="shrink-0 border-t-2 border-border bg-muted/15 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setRevisionHistoryOpen(false)}
            className="w-full border-2 border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-wide hover:bg-muted/50"
          >
            Close
          </button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={leaveConfirmOpen}
        onClose={handleLeaveConfirmNo}
        title="Leave this page?"
        message="Save your draft to the server before leaving? Unsaved changes may be lost if you skip saving."
        confirmLabel="Yes, save draft"
        cancelLabel="No"
        variant="default"
        defaultFocusConfirm={true}
        onConfirm={handleLeaveConfirmYes}
      />
    </div>
  );
}

