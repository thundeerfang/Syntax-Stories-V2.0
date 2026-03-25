'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useSidebar } from '@/hooks/useSidebar';
import { blogApi } from '@/api/blog';
import { uploadCover, type CropArea } from '@/api/upload';
import { TerminalLoaderPage } from '@/components/loader';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Save, Send, ChevronRight,
  Activity, Cpu, History, Wrench,
  Globe, ShieldCheck, Image as ImageIcon, Trash2,
  Bold, Italic, Underline as UnderlineIcon,
  Link2, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight,
  FileText,
} from 'lucide-react';
import { RetroAccordion } from '@/components/ui/RetroAccordion';
import Cropper, { Area } from 'react-easy-crop';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BlogWriteEditor, Block, createBlock, createBlockInSection, type BlockType } from '@/components/ui/BlogWriteEditor';
import { DEFAULT_ITEMS } from '@/components/ui/BottomToolbar';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoredDraftPayload } from '@/types/blog';

const TITLE_MAX = 150;
const SUMMARY_MAX = 200;

const BLOG_DRAFT_STORAGE_KEY = 'syntax-stories-blog-draft';

function loadDraftFromStorage(): StoredDraftPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BLOG_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredDraftPayload;
    if (!data || typeof data.title !== 'string' || typeof data.content !== 'string') return null;
    return {
      title: data.title ?? '',
      summary: typeof data.summary === 'string' ? data.summary : '',
      content: data.content,
      thumbnailPreviewUrl: typeof data.thumbnailPreviewUrl === 'string' ? data.thumbnailPreviewUrl : undefined,
      savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function saveDraftToStorage(payload: {
  title: string;
  summary: string;
  content: string;
  thumbnailPreviewUrl?: string | null;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const data: StoredDraftPayload = {
      title: payload.title,
      summary: payload.summary,
      content: payload.content,
      thumbnailPreviewUrl: payload.thumbnailPreviewUrl ?? undefined,
      savedAt: Date.now(),
    };
    localStorage.setItem(BLOG_DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function summaryTextLength(html: string): number {
  if (!html || html === '<br>') return 0;
  if (typeof document === 'undefined') return (html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').length);
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent ?? '').length;
}

/** Collapse multiple spaces (and any whitespace run) to one space in all text nodes (Medium-style) */
function collapseSpacesInElement(el: HTMLElement): void {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent && /\s{2,}/.test(node.textContent)) {
      node.textContent = node.textContent.replace(/\s+/g, ' ');
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
  const trail = text.match(/\s*$/)?.[0]?.length ?? 0;
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
const MAX_BLOCKS_PER_SECTION = 10;
const PRIMARY_SECTION_ID = 's-1';
const THUMB_ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
const THUMB_MAX_MB = 10;

function SummaryEditor({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
}) {
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
    const textLen = el.textContent?.length ?? 0;
    if (textLen > maxLength) {
      el.innerHTML = lastValidHtml.current;
      skipSync.current = true;
      return;
    }
    lastValidHtml.current = html;
    onChange(html);
  }, [onChange, maxLength]);

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
    const focusInSummary = el.contains(active);
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
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
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
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
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
    const textLen = el.textContent?.length ?? 0;
    if (textLen > maxLength) {
      el.innerHTML = lastValidHtml.current;
      skipSync.current = true;
      return;
    }
    lastValidHtml.current = html;
    onChange(html);
  }, [onChange, maxLength]);

  const applyFormat = useCallback(
    (cmd: 'bold' | 'italic' | 'underline') => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      document.execCommand(cmd, false);
      setFormatState((prev) => ({
        ...prev,
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      }));
      syncToState();
    },
    [syncToState],
  );

  const normalizeLinkInput = useCallback((v: string) => v.replace(/^https?:\/\//i, '').trim(), []);
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
        document.execCommand('createLink', false, url);
      } catch {
        document.execCommand('createLink', false, url);
      }
      savedSelectionRef.current = null;
    } else {
      document.execCommand('createLink', false, url);
    }
    const links = el.getElementsByTagName('a');
    const lastLink = links.length > 0 ? links[links.length - 1] : null;
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
      document.execCommand('insertText', false, ' ');
      syncToState();
    } else {
      syncToState();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        el.focus();
      }
    }
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
          <span>{summaryTextLength(value)}/{maxLength}</span>
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Summary"
          data-placeholder="SUMMARY_TEXT_HERE..."
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === 'a') lastKeyDownInSummaryRef.current = 0;
            else lastKeyDownInSummaryRef.current = Date.now();
            if (e.key === 'Enter') {
              e.preventDefault();
              document.execCommand('insertHTML', false, '<br>');
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
            const plain = raw.replace(/\s+/g, ' ').replace(/<[^>]*>/g, '');
            document.execCommand('insertText', false, plain);
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
        {selectionCard && typeof document !== 'undefined' && summaryTextLength(value) > 0 && (
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
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File, cropArea: CropArea) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

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

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      titleId="thumbnail-crop-title"
      panelClassName={cn(
        'pointer-events-auto w-full max-w-sm max-h-[90vh] overflow-y-auto',
        'border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]'
      )}
      contentClassName="relative p-6 pt-10"
      backdropClassName="fixed inset-0 z-50 bg-black/40"
    >
      <h2 id="thumbnail-crop-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
        <ImageIcon className="size-4 text-primary" /> Upload thumbnail
      </h2>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
        JPEG, PNG, GIF or WebP. Max {THUMB_MAX_MB}MB. Cropped on publish.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={THUMB_ACCEPT}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        className="hidden"
        aria-hidden
      />
      {!imageUrl && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            'border-border bg-muted/20 hover:bg-muted/30 cursor-pointer'
          )}
        >
          <p className="text-sm font-bold text-foreground">Drop an image or click to browse</p>
          <p className="text-[10px] text-muted-foreground mt-1 placeholder:text-muted-foreground">Thumbnail will be uploaded when you publish</p>
        </div>
      )}
      {imageUrl && (
        <div className="space-y-4">
          <div className="relative w-full h-56 rounded-lg overflow-hidden bg-muted border border-border">
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
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

export default function WriteBlogPage() {
  const { user, token, shouldBlock } = useRequireAuth();
  const { isOpen } = useSidebar();
  const [title, setTitle] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailCropArea, setThumbnailCropArea] = useState<CropArea | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [thumbnailDialogOpen, setThumbnailDialogOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [blocks, setBlocks] = useState<Block[]>(() => []);
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'draft' | 'published' | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [draftSyncStatus, setDraftSyncStatus] = useState<'idle' | 'offline' | 'local' | 'syncing' | 'synced'>('idle');
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const hasRestoredRef = useRef(false);
  const latestForSyncRef = useRef({ title: '', summary: '', blocks: [] as Block[], thumbnailPreviewUrl: null as string | null });
  const tokenRef = useRef<string | undefined>(token);
  const skipNextPopStateRef = useRef(false);
  latestForSyncRef.current = { title, summary, blocks, thumbnailPreviewUrl };
  tokenRef.current = token;

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
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
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

  const saveDraftToLocal = useCallback(() => {
    const content = JSON.stringify(blocks);
    const summaryVal = summary && summary !== '<br>' && summaryTextLength(summary) > 0 ? summary : '';
    saveDraftToStorage({
      title,
      summary: summaryVal,
      content,
      thumbnailPreviewUrl,
    });
  }, [title, summary, blocks, thumbnailPreviewUrl]);

  const restoreFromLocalDraft = useCallback(() => {
    const draft = loadDraftFromStorage();
    if (!draft) return;
    setTitle(draft.title);
    setSummary(draft.summary || '');
    try {
      const parsed = JSON.parse(draft.content) as unknown;
      if (Array.isArray(parsed) && parsed.length <= MAX_BLOCKS_PER_SECTION) {
        setBlocks(parsed as Block[]);
      }
    } catch {
      // ignore invalid content
    }
    if (draft.thumbnailPreviewUrl) {
      setThumbnailPreviewUrl(draft.thumbnailPreviewUrl);
    }
    setDraftSyncStatus('local');
  }, []);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const draft = loadDraftFromStorage();
    const isEmpty = !title.trim() && blocks.length === 0;
    if (draft && isEmpty) {
      restoreFromLocalDraft();
    }
  }, []);

  useEffect(() => {
    const hasContent = title.trim() || blocks.length > 0;
    if (!hasContent) return;
    if (!isOnline) {
      setDraftSyncStatus('offline');
      return;
    }
    if (draftSyncStatus === 'idle') setDraftSyncStatus('local');
    if (draftSyncStatus === 'synced') setDraftSyncStatus('local');
  }, [title, blocks, draftSyncStatus, isOnline]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      const { title: t, summary: s, blocks: b, thumbnailPreviewUrl: thumb } = latestForSyncRef.current;
      const hasContent = t.trim() || b.length > 0;
      if (hasContent) {
        setDraftSyncStatus('offline');
        saveDraftToStorage({
          title: t,
          summary: s && s !== '<br>' ? s : '',
          content: JSON.stringify(b),
          thumbnailPreviewUrl: thumb ?? undefined,
        });
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    history.pushState({ blogWriteGuard: true }, '', location.href);
    const onPopState = () => {
      if (skipNextPopStateRef.current) {
        skipNextPopStateRef.current = false;
        return;
      }
      setLeaveConfirmOpen(true);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent = title.trim() || blocks.length > 0;
      if (hasContent) {
        saveDraftToStorage({
          title,
          summary: summary && summary !== '<br>' ? summary : '',
          content: JSON.stringify(blocks),
          thumbnailPreviewUrl,
        });
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [title, summary, blocks, thumbnailPreviewUrl]);

  const syncDraftToServer = useCallback(() => {
    if (!navigator.onLine) return;
    const currentToken = tokenRef.current;
    if (!currentToken) return;
    const { title: t, summary: s, blocks: b } = latestForSyncRef.current;
    if (!t.trim() && b.length === 0) return;
    setDraftSyncStatus('syncing');
    const content = JSON.stringify(b);
    const summaryToSend = s && s !== '<br>' && summaryTextLength(s) > 0 ? s : undefined;
    blogApi
      .saveDraft(
        {
          title: t.trim() || 'Untitled draft',
          summary: summaryToSend,
          content,
        },
        currentToken
      )
      .then(() => {
        setDraftSyncStatus('synced');
      })
      .catch(() => {
        setDraftSyncStatus('local');
      });
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      syncDraftToServer();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [syncDraftToServer]);

  useEffect(() => {
    const handleOnline = () => {
      const { title: t, blocks: b } = latestForSyncRef.current;
      if ((t.trim() || b.length > 0) && tokenRef.current) syncDraftToServer();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncDraftToServer]);

  const handleLeaveConfirmYes = useCallback(() => {
    saveDraftToLocal();
    setLeaveConfirmOpen(false);
    skipNextPopStateRef.current = true;
    history.back();
  }, [saveDraftToLocal]);

  const handleLeaveConfirmNo = useCallback(() => {
    setLeaveConfirmOpen(false);
    history.pushState({ blogWriteGuard: true }, '', location.href);
  }, []);

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!title.trim()) { toast.error('ERROR: TITLE_REQUIRED'); return; }
    if (!token) return;
    setSubmitting(true);
    setSubmitAction(status);
    try {
      const content = JSON.stringify(blocks);
      const summaryToSend = (summary && summary !== '<br>' && summaryTextLength(summary) > 0) ? summary.trim() : undefined;

      if (status === 'draft') {
        await blogApi.saveDraft(
          { title: title.trim(), summary: summaryToSend, content },
          token
        );
        toast.success('DRAFT_SYNCED');
        setDraftSyncStatus('synced');
      } else {
        let thumbnailUrl: string | undefined;
        if (thumbnailFile && thumbnailCropArea) {
          const data = await uploadCover(token, thumbnailFile, thumbnailCropArea, () => {});
          thumbnailUrl = data.url;
          clearThumbnail();
        }
        await blogApi.createPost({ title, summary: summaryToSend, content, thumbnailUrl, status: 'published' }, token);
        toast.success('POST_LIVE');
        setTitle('');
        setSummary('');
        setBlocks([]);
        setDraftSyncStatus('idle');
        if (typeof window !== 'undefined') try { localStorage.removeItem(BLOG_DRAFT_STORAGE_KEY); } catch { /* ignore */ }
      }
    } catch (e) {
      toast.error('FATAL: UPLOAD_FAILED');
    } finally {
      setSubmitting(false);
      setSubmitAction(null);
    }
  };

  if (shouldBlock) return <TerminalLoaderPage />;

  return (
    <div className={cn(
      'ss-write-theme-transition flex flex-col h-screen bg-background font-mono text-foreground border-2 border-border shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden'
    )}>
      {/* 1. TOP SYSTEM NAV */}
      <div className="flex-shrink-0 bg-card px-4 py-2 flex items-center justify-between z-50 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
            <span>Workspace</span>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <span className="text-primary text-[9px] font-semibold">{user?.username || 'user'}</span>
            <ChevronRight className="h-3 w-3 opacity-30" />
            <span className="bg-muted px-2 border border-border truncate max-w-[200px] md:max-w-[280px]" title={title.trim() || 'new_entry.log'}>
              {title.trim() ? title.trim().replace(/\s+/g, '_') : 'new_entry.log'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setLeftSidebarOpen((o) => !o)}
            className="p-1.5 rounded border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            title={leftSidebarOpen ? 'Close left panel' : 'Open left panel'}
            aria-label={leftSidebarOpen ? 'Close left panel' : 'Open left panel'}
          >
            {leftSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setRightSidebarOpen((o) => !o)}
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
            {(title.trim() || blocks.length > 0) && (
              <span
                className={cn(
                  'text-[8px] font-medium px-1.5 py-0.5 rounded border',
                  draftSyncStatus === 'offline' && 'text-amber-600 border-amber-500/50 bg-amber-500/10',
                  draftSyncStatus === 'syncing' && 'text-amber-600 border-amber-500/50 bg-amber-500/10',
                  draftSyncStatus === 'local' && 'text-muted-foreground border-border',
                  draftSyncStatus === 'synced' && 'text-green-600 border-green-500/50 bg-green-500/10'
                )}
                title={
                  draftSyncStatus === 'offline'
                    ? 'Offline – saved locally; will sync when connection is back'
                    : draftSyncStatus === 'syncing'
                      ? 'Syncing…'
                      : draftSyncStatus === 'local'
                        ? 'Saved locally only'
                        : 'Draft synced to server'
                }
              >
                {draftSyncStatus === 'offline'
                  ? 'Offline'
                  : draftSyncStatus === 'syncing'
                    ? 'Syncing…'
                    : draftSyncStatus === 'local'
                      ? 'Local'
                      : 'Up to date'}
              </span>
            )}
          </div>
          <div className="hidden md:block text-[8px] font-medium text-muted-foreground">{currentTime}</div>
        </div>
      </div>

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
                className="flex flex-col p-4 space-y-6 min-h-0 h-full w-[280px]"
              >
                <section className="min-h-0 flex flex-col">
                  <RetroAccordion
                    label="Blocks"
                    subtitle={`${blocks.length} block${blocks.length !== 1 ? 's' : ''}`}
                    defaultOpen={true}
                    className="flex-1 min-h-0 flex flex-col"
                  >
                    <div className="space-y-0.5 overflow-y-auto max-h-[200px]">
                      {blocks.map((b) => (
                        <div key={b.id} className="text-[10px] py-0.5 px-2 text-muted-foreground truncate border-b border-border/40 last:border-b-0">
                          {b.type}
                        </div>
                      ))}
                    </div>
                  </RetroAccordion>
                </section>
                <section className="pt-6 border-t border-border/10">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase mb-3 flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5" /> Tools
                  </h3>
                  <div className="space-y-1">
                    {DEFAULT_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addBlock(item.id as BlockType)}
                          className="w-full text-left text-[11px] py-1.5 px-2 border border-transparent hover:border-border hover:bg-card cursor-pointer transition-all flex items-center gap-2 rounded"
                        >
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section className="pt-6 border-t border-border/10">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase mb-3 flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5" /> Stats
                  </h3>
                  <div className="bg-black/5 p-3 border-2 border-border space-y-2">
                    <div className="flex justify-between text-[9px]"><span>Blocks:</span> <span className="text-primary">{blocks.length}</span></div>
                    <div className="flex justify-between text-[9px]"><span>Words:</span> <span className="text-primary">~{blocks.length * 12}</span></div>
                    <div className="w-full bg-border h-1 mt-2"><div className="bg-primary h-full w-2/3"></div></div>
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
                <div className="text-[10px] font-bold text-primary shrink-0 mb-1" title={`${blocks.length} block${blocks.length !== 1 ? 's' : ''}`}>
                  {blocks.length}
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col items-center gap-0.5 min-h-0">
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
                        strokeDasharray={`${Math.min(blocks.length / 10, 1) * 88} 88`}
                        strokeLinecap="round"
                        className="text-primary transition-all duration-300"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                      {blocks.length}
                    </span>
                  </div>
                  <div className="text-[8px] text-center text-muted-foreground space-y-0.5">
                    <div className="font-semibold text-foreground">~{blocks.length * 12}</div>
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
          <div
            className={cn(
              'mx-auto transition-[max-width] duration-300',
              leftSidebarOpen && rightSidebarOpen ? 'max-w-3xl' : leftSidebarOpen || rightSidebarOpen ? 'max-w-5xl' : 'max-w-7xl',
            )}
          >
             <div className="mb-8">
               <div className="relative mb-8">
                 <span className="absolute -top-3 -left-3 bg-primary text-primary-foreground text-[8px] font-bold px-1 z-10 border border-black">H1</span>
                 <div className="flex items-center justify-end text-[10px] font-bold text-muted-foreground mb-0.5">
                   <span>{title.length}/{TITLE_MAX}</span>
                 </div>
                 <textarea
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, TITLE_MAX).replace(/\s+/g, ' ');
                    setTitle(next);
                    resizeTitleInput();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const raw = e.clipboardData.getData('text/plain') ?? '';
                    const plain = raw.replace(/\s+/g, ' ').trim();
                    const ta = titleInputRef.current;
                    if (!ta) return;
                    const start = ta.selectionStart ?? 0;
                    const end = ta.selectionEnd ?? start;
                    const before = title.slice(0, start);
                    const after = title.slice(end);
                    const maxInsert = TITLE_MAX - before.length - after.length;
                    const toInsert = plain.slice(0, Math.max(0, maxInsert));
                    const newTitle = (before + toInsert + after).replace(/\s+/g, ' ').slice(0, TITLE_MAX);
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
               <SummaryEditor value={summary} onChange={setSummary} maxLength={SUMMARY_MAX} />
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
            'flex-shrink-0 flex flex-col border-l-2 border-border bg-card overflow-hidden min-h-full',
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
                className="flex flex-col p-6 space-y-6 min-h-0 h-full w-[300px] overflow-y-auto"
              >
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border-b border-border pb-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Publish_Control
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => handleSubmit('published')}
                      disabled={submitting}
                      className="group relative bg-primary text-primary-foreground border-2 border-black p-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Send className="h-4 w-4" /> {submitAction === 'published' ? 'Deploying...' : 'Deploy_Post'}
                      </div>
                    </button>
                    <button
                      onClick={() => handleSubmit('draft')}
                      disabled={submitting}
                      className="bg-muted border-2 border-border p-3 font-black uppercase text-xs shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all hover:bg-card"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Save className="h-4 w-4" /> {submitAction === 'draft' ? 'Saving...' : 'Save_Local'}
                      </div>
                    </button>
                  </div>
                </div>
                <div className="space-y-4 pt-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border-b border-border pb-2">
                    <Globe className="h-4 w-4 text-primary" /> Asset_Configuration
                  </h3>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Thumbnail</label>
                    {!thumbnailPreviewUrl ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setThumbnailDialogOpen(true)}
                        onKeyDown={(e) => e.key === 'Enter' && setThumbnailDialogOpen(true)}
                        className={cn(
                          'aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer',
                          'bg-muted/20 hover:bg-muted/30 transition-colors'
                        )}
                      >
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase placeholder:text-muted-foreground">Upload thumbnail</span>
                        <span className="text-[9px] text-muted-foreground">JPEG, PNG, GIF, WebP. Max {THUMB_MAX_MB}MB</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="aspect-video border-2 border-border overflow-hidden rounded-lg bg-muted">
                          <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setThumbnailDialogOpen(true)}
                            className="flex-1 px-2 py-1.5 text-[10px] font-bold uppercase rounded border border-border hover:bg-muted/40"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={clearThumbnail}
                            className="px-2 py-1.5 text-[10px] font-bold uppercase rounded border border-destructive text-destructive hover:bg-destructive/10 flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <ThumbnailCropDialog
                  open={thumbnailDialogOpen}
                  onClose={() => setThumbnailDialogOpen(false)}
                  onConfirm={handleThumbnailConfirm}
                />
                <div className="mt-auto bg-muted/50 p-4 border-2 border-border border-dashed">
                  <h4 className="text-[9px] font-black uppercase mb-2 flex items-center gap-2">
                    <History className="h-3 w-3" /> Revision_History
                  </h4>
                  <div className="space-y-2 opacity-50">
                    <div className="text-[8px] flex justify-between italic"><span>v1.0.2 - Initial</span> <span>12:40</span></div>
                    <div className="text-[8px] flex justify-between italic"><span>v1.0.3 - Layout</span> <span>12:45</span></div>
                  </div>
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
                  onClick={() => handleSubmit('published')}
                  disabled={submitting}
                  title="Deploy post"
                  className="p-2 rounded border border-transparent hover:border-border hover:bg-muted text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit('draft')}
                  disabled={submitting}
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

      <ConfirmDialog
        open={leaveConfirmOpen}
        onClose={handleLeaveConfirmNo}
        title="Leave this page?"
        message="Do you want to save your blog as draft before leaving? Your work will be saved locally and synced to the server when you return."
        confirmLabel="Yes, save draft"
        cancelLabel="No"
        variant="default"
        defaultFocusConfirm={true}
        onConfirm={handleLeaveConfirmYes}
      />
    </div>
  );
}

