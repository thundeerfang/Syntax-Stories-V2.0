'use client';

import React, { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Extension, Node as TipTapNode, mergeAttributes } from '@tiptap/core';
import type { Editor, JSONContent } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { Node as PMNode, Fragment, Slice } from '@tiptap/pm/model';
import type { Mark, ResolvedPos, NodeType, Schema } from '@tiptap/pm/model';
import { canSplit } from '@tiptap/pm/transform';
import { joinTextblockBackward } from '@tiptap/pm/commands';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link2,
  AtSign,
  Image as ImageIcon,
  Search,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeHoverCardPositionAuto,
  estimateGifPopoverDimensions,
  motionAxisOffset,
  HOVER_CARD_Z_INDEX,
  type HoverCardSide,
} from '@/components/ui/HoverCard';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import { MentionPopoverCard } from '@/components/ui/MentionPopoverCard';
import { GifPopoverCard } from '@/components/ui/GifPopoverCard';
import { searchGifs, type GiphyGif } from '@/api/giphy';
import { followApi, type FollowUser } from '@/api/follow';
import type { RichTextDoc } from '@/types/blog';

/** Default Link sets `inclusive` from `autolink`, so with autolink on new typing stays inside the link. Force non-inclusive so Space/new text after a link exits the mark (matches user expectation). */
const LinkMark = Link.extend({
  inclusive: false,
});

export interface RichParagraphEditorProps {
  initialDoc?: RichTextDoc;
  legacyText?: string;
  /** Omitted when `readOnly` (e.g. public blog view). */
  onChange?: (doc: RichTextDoc) => void;
  /** Collapse multiple spaces, duplicate line breaks, and consecutive empty paragraphs (default true). */
  normalizeContent?: boolean;
  /** No toolbar; links open on click. */
  readOnly?: boolean;
  /** When set, hovering `a.ss-link` in read-only mode shows this preview (e.g. `LinkPreviewCardContent`). */
  readOnlyLinkPreview?: (href: string) => React.ReactNode;
  className?: string;
}

const READONLY_LINK_SEL = 'a.ss-link';
const READONLY_MENTION_SEL = '[data-mention="true"]';
const READONLY_GIF_SEL = '[data-inline-gif="true"]';
const READONLY_LINK_EXIT_MS = 180;

function ReadOnlyRichLinkHoverLayer({
  editor,
  renderPreview,
}: Readonly<{
  editor: Editor;
  renderPreview: (href: string) => React.ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [resolvedSide, setResolvedSide] = useState<HoverCardSide>('bottom');
  const [href, setHref] = useState<string | null>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const root = editor.view.dom;

    const scheduleOpen = (a: HTMLAnchorElement) => {
      clearTimers();
      openTimerRef.current = setTimeout(() => {
        anchorRef.current = a;
        const rect = a.getBoundingClientRect();
        const { top, left, side } = computeHoverCardPositionAuto(rect, 'bottom', 'center', 160);
        setPosition({ top, left });
        setResolvedSide(side);
        setHref(a.href);
        setOpen(true);
        setIsClosing(false);
        openTimerRef.current = null;
      }, 200);
    };

    const onMouseOver = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest(READONLY_LINK_SEL) as HTMLAnchorElement | null;
      if (!a?.href) return;
      if (activeLinkRef.current === a) return;
      activeLinkRef.current = a;
      scheduleOpen(a);
    };

    const onMouseOut = (e: MouseEvent) => {
      const from = (e.target as HTMLElement | null)?.closest(READONLY_LINK_SEL) as HTMLAnchorElement | null;
      if (!from) return;
      const related = e.relatedTarget as Node | null;
      if (related && from.contains(related)) return;
      if (related && portalRef.current?.contains(related)) return;
      activeLinkRef.current = null;
      anchorRef.current = null;
      clearTimers();
      closeTimerRef.current = setTimeout(() => {
        setIsClosing(true);
        setOpen(false);
        closeTimerRef.current = null;
        exitTimerRef.current = setTimeout(() => {
          setIsClosing(false);
          setHref(null);
          exitTimerRef.current = null;
        }, READONLY_LINK_EXIT_MS);
      }, 100);
    };

    root.addEventListener('mouseover', onMouseOver);
    root.addEventListener('mouseout', onMouseOut);
    return () => {
      root.removeEventListener('mouseover', onMouseOver);
      root.removeEventListener('mouseout', onMouseOut);
      clearTimers();
    };
  }, [editor, clearTimers]);

  const cancelClose = useCallback(() => {
    setIsClosing(false);
    clearTimers();
    setOpen(true);
  }, [clearTimers]);

  const handlePortalLeave = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(true);
      setOpen(false);
      closeTimerRef.current = null;
      activeLinkRef.current = null;
      anchorRef.current = null;
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        setHref(null);
        exitTimerRef.current = null;
      }, READONLY_LINK_EXIT_MS);
    }, 100);
  }, [clearTimers]);

  useEffect(() => {
    if (!open || isClosing) return;
    const onResize = () => {
      const a = anchorRef.current;
      if (!a) return;
      const rect = a.getBoundingClientRect();
      const { top, left, side } = computeHoverCardPositionAuto(rect, 'bottom', 'center', 160);
      setPosition({ top, left });
      setResolvedSide(side);
    };
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, [open, isClosing]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      clearTimers();
      setIsClosing(true);
      setOpen(false);
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        setHref(null);
        exitTimerRef.current = null;
      }, READONLY_LINK_EXIT_MS);
    };
    globalThis.addEventListener('scroll', handleScroll, true);
    return () => globalThis.removeEventListener('scroll', handleScroll, true);
  }, [open, clearTimers]);

  const showPortal = open || isClosing;
  const axis = motionAxisOffset(resolvedSide);
  const cardEl =
    showPortal &&
    href &&
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            key="readonly-link-hover"
            ref={portalRef}
            initial={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed w-[280px] min-h-[80px] max-h-[320px] overflow-hidden border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] pointer-events-auto p-0"
            style={{ top: position.top, left: position.left, zIndex: HOVER_CARD_Z_INDEX }}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={handlePortalLeave}
          >
            {renderPreview(href)}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  return <>{cardEl}</>;
}

function ReadOnlyMentionHoverLayer({
  editor,
}: Readonly<{
  editor: Editor;
}>) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [resolvedSide, setResolvedSide] = useState<HoverCardSide>('bottom');
  const [mention, setMention] = useState<{
    username: string;
    fullName?: string;
    profileImg?: string;
  } | null>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMentionRef = useRef<HTMLElement | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const root = editor.view.dom;

    const scheduleOpen = (el: HTMLElement) => {
      clearTimers();
      openTimerRef.current = setTimeout(() => {
        anchorRef.current = el;
        const rect = el.getBoundingClientRect();
        const { top, left, side } = computeHoverCardPositionAuto(rect, 'bottom', 'center', 155);
        setPosition({ top, left });
        setResolvedSide(side);
        const username = el.dataset.username?.trim() ?? '';
        if (!username) {
          openTimerRef.current = null;
          return;
        }
        setMention({
          username,
          fullName: el.dataset.fullName?.trim(),
          profileImg: el.dataset.profileImg?.trim(),
        });
        setOpen(true);
        setIsClosing(false);
        openTimerRef.current = null;
      }, 200);
    };

    const onMouseOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(READONLY_MENTION_SEL) as HTMLElement | null;
      if (!el) return;
      if (activeMentionRef.current === el) return;
      activeMentionRef.current = el;
      scheduleOpen(el);
    };

    const onMouseOut = (e: MouseEvent) => {
      const from = (e.target as HTMLElement | null)?.closest(READONLY_MENTION_SEL) as HTMLElement | null;
      if (!from) return;
      const related = e.relatedTarget as Node | null;
      if (related && from.contains(related)) return;
      if (related && portalRef.current?.contains(related)) return;
      activeMentionRef.current = null;
      anchorRef.current = null;
      clearTimers();
      closeTimerRef.current = setTimeout(() => {
        setIsClosing(true);
        setOpen(false);
        closeTimerRef.current = null;
        exitTimerRef.current = setTimeout(() => {
          setIsClosing(false);
          setMention(null);
          exitTimerRef.current = null;
        }, READONLY_LINK_EXIT_MS);
      }, 100);
    };

    root.addEventListener('mouseover', onMouseOver);
    root.addEventListener('mouseout', onMouseOut);
    return () => {
      root.removeEventListener('mouseover', onMouseOver);
      root.removeEventListener('mouseout', onMouseOut);
      clearTimers();
    };
  }, [editor, clearTimers]);

  const cancelClose = useCallback(() => {
    setIsClosing(false);
    clearTimers();
    setOpen(true);
  }, [clearTimers]);

  const handlePortalLeave = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(true);
      setOpen(false);
      closeTimerRef.current = null;
      activeMentionRef.current = null;
      anchorRef.current = null;
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        setMention(null);
        exitTimerRef.current = null;
      }, READONLY_LINK_EXIT_MS);
    }, 100);
  }, [clearTimers]);

  useEffect(() => {
    if (!open || isClosing) return;
    const onResize = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const { top, left, side } = computeHoverCardPositionAuto(rect, 'bottom', 'center', 155);
      setPosition({ top, left });
      setResolvedSide(side);
    };
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, [open, isClosing]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      clearTimers();
      setIsClosing(true);
      setOpen(false);
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        setMention(null);
        exitTimerRef.current = null;
      }, READONLY_LINK_EXIT_MS);
    };
    globalThis.addEventListener('scroll', handleScroll, true);
    return () => globalThis.removeEventListener('scroll', handleScroll, true);
  }, [open, clearTimers]);

  const showPortal = open || isClosing;
  const axis = motionAxisOffset(resolvedSide);
  const cardEl =
    showPortal &&
    mention &&
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            key="readonly-mention-hover"
            ref={portalRef}
            initial={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed w-[260px] overflow-visible border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] pointer-events-auto p-0"
            style={{ top: position.top, left: position.left, zIndex: HOVER_CARD_Z_INDEX }}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={handlePortalLeave}
          >
            <MentionPopoverCard
              username={mention.username}
              initialFullName={mention.fullName}
              initialProfileImg={mention.profileImg}
            />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  return <>{cardEl}</>;
}

function ReadOnlyGifHoverLayer({
  editor,
}: Readonly<{
  editor: Editor;
}>) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [resolvedSide, setResolvedSide] = useState<HoverCardSide>('bottom');
  const [gif, setGif] = useState<{ url: string } | null>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeGifRef = useRef<HTMLElement | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const measureGifPopoverPosition = useCallback(() => {
    const el = anchorRef.current;
    const card = portalRef.current;
    if (!el || !card) return;
    const rect = el.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    if (cr.width < 2 || cr.height < 2) return;
    const { top, left, side } = computeHoverCardPositionAuto(
      rect,
      'bottom',
      'center',
      cr.height,
      cr.width,
    );
    setPosition({ top, left });
    setResolvedSide(side);
  }, []);

  useLayoutEffect(() => {
    if (!open || !gif) return;
    measureGifPopoverPosition();
  }, [open, gif, measureGifPopoverPosition]);

  useEffect(() => {
    const root = editor.view.dom;

    const scheduleOpen = (el: HTMLElement) => {
      clearTimers();
      openTimerRef.current = setTimeout(() => {
        anchorRef.current = el;
        const rect = el.getBoundingClientRect();
        const img = el.querySelector('img');
        const url = img?.getAttribute('src')?.trim() ?? '';
        if (!url) {
          openTimerRef.current = null;
          return;
        }
        const nw = img?.naturalWidth ?? 0;
        const nh = img?.naturalHeight ?? 0;
        const { width: estW, height: estH } = estimateGifPopoverDimensions(nw, nh);
        const { top, left, side } = computeHoverCardPositionAuto(
          rect,
          'bottom',
          'center',
          estH,
          estW,
        );
        setPosition({ top, left });
        setResolvedSide(side);
        setGif({ url });
        setOpen(true);
        setIsClosing(false);
        openTimerRef.current = null;
      }, 200);
    };

    const onMouseOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(READONLY_GIF_SEL) as HTMLElement | null;
      if (!el) return;
      if (activeGifRef.current === el) return;
      activeGifRef.current = el;
      scheduleOpen(el);
    };

    const onMouseOut = (e: MouseEvent) => {
      const from = (e.target as HTMLElement | null)?.closest(READONLY_GIF_SEL) as HTMLElement | null;
      if (!from) return;
      const related = e.relatedTarget as Node | null;
      if (related && from.contains(related)) return;
      if (related && portalRef.current?.contains(related)) return;
      activeGifRef.current = null;
      anchorRef.current = null;
      clearTimers();
      closeTimerRef.current = setTimeout(() => {
        setIsClosing(true);
        setOpen(false);
        closeTimerRef.current = null;
        exitTimerRef.current = setTimeout(() => {
          setIsClosing(false);
          setGif(null);
          exitTimerRef.current = null;
        }, READONLY_LINK_EXIT_MS);
      }, 100);
    };

    root.addEventListener('mouseover', onMouseOver);
    root.addEventListener('mouseout', onMouseOut);
    return () => {
      root.removeEventListener('mouseover', onMouseOver);
      root.removeEventListener('mouseout', onMouseOut);
      clearTimers();
    };
  }, [editor, clearTimers]);

  const cancelClose = useCallback(() => {
    setIsClosing(false);
    clearTimers();
    setOpen(true);
  }, [clearTimers]);

  const handlePortalLeave = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(true);
      setOpen(false);
      closeTimerRef.current = null;
      activeGifRef.current = null;
      anchorRef.current = null;
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        setGif(null);
        exitTimerRef.current = null;
      }, READONLY_LINK_EXIT_MS);
    }, 100);
  }, [clearTimers]);

  useEffect(() => {
    if (!open || isClosing) return;
    const onResize = () => {
      measureGifPopoverPosition();
    };
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, [open, isClosing, measureGifPopoverPosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      clearTimers();
      setIsClosing(true);
      setOpen(false);
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        setGif(null);
        exitTimerRef.current = null;
      }, READONLY_LINK_EXIT_MS);
    };
    globalThis.addEventListener('scroll', handleScroll, true);
    return () => globalThis.removeEventListener('scroll', handleScroll, true);
  }, [open, clearTimers]);

  const showPortal = open || isClosing;
  const axis = motionAxisOffset(resolvedSide);
  const cardEl =
    showPortal &&
    gif &&
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            key="readonly-gif-hover"
            ref={portalRef}
            initial={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed w-fit max-w-[min(340px,92vw)] overflow-hidden border-2 border-border bg-muted leading-none shadow-[4px_4px_0px_0px_var(--border)] pointer-events-auto p-0"
            style={{ top: position.top, left: position.left, zIndex: HOVER_CARD_Z_INDEX }}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={handlePortalLeave}
          >
            <GifPopoverCard url={gif.url} onLoad={measureGifPopoverPosition} />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  return <>{cardEl}</>;
}

const paragraphNormalizeKey = new PluginKey('ssParagraphNormalize');

function hasInlineAtomInParagraph(n: PMNode): boolean {
  let found = false;
  n.descendants((ch) => {
    if (ch.type.name === 'inlineGif' || ch.type.name === 'mention') found = true;
  });
  return found;
}

/** Plain text only (ignores hard breaks). */
function paragraphPlainText(n: PMNode): string {
  let s = '';
  n.descendants((ch) => {
    if (ch.isText && ch.text) s += ch.text;
  });
  return s;
}

/** Empty, whitespace-only, hard-break-only, or spaces + breaks only — no GIF/mention. */
function isEffectivelyEmptyParagraph(n: PMNode): boolean {
  if (n.type.name !== 'paragraph') return false;
  if (hasInlineAtomInParagraph(n)) return false;
  if (n.content.size === 0) return true;
  return paragraphPlainText(n).trim() === '';
}

function inCodeBlock($pos: ResolvedPos): boolean {
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type.name === 'codeBlock') return true;
  }
  return false;
}

/** Open only http(s) links from editor content in a new tab. */
function safeOpenLinkHref(raw: string | null | undefined): boolean {
  const s = raw?.trim();
  if (!s) return false;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    try {
      url = new URL(`https://${s}`);
    } catch {
      return false;
    }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
  return true;
}

function collectConsecutiveEmptyParagraphDeletes(doc: PMNode): { from: number; to: number }[] {
  const dels: { from: number; to: number }[] = [];

  function walk(parent: PMNode, parentPos: number) {
    const children: { node: PMNode; pos: number }[] = [];
    parent.forEach((child, offset) => {
      children.push({ node: child, pos: parentPos + 1 + offset });
    });

    let i = 0;
    while (i < children.length) {
      const ch = children[i]!;
      if (isEffectivelyEmptyParagraph(ch.node)) {
        let j = i + 1;
        while (j < children.length && isEffectivelyEmptyParagraph(children[j]!.node)) j++;
        if (j > i + 1) {
          for (let k = i + 1; k < j; k++) {
            const s = children[k]!;
            dels.push({ from: s.pos, to: s.pos + s.node.nodeSize });
          }
        }
        i = j;
      } else {
        const n = ch.node;
        const p = ch.pos;
        if (n.type.name === 'bulletList' || n.type.name === 'orderedList') {
          n.forEach((li, off) => walk(li, p + 1 + off));
        } else if (n.type.name === 'listItem') {
          walk(n, p);
        } else if (n.type.name === 'blockquote') {
          walk(n, p);
        }
        i++;
      }
    }
  }

  walk(doc, 0);
  return dels;
}

/** Keep the first top-level empty paragraph (doc order); delete any other top-level empty paragraphs. */
function collectTopLevelGlobalExtraEmptyParagraphDeletes(doc: PMNode): { from: number; to: number }[] {
  const items: { pos: number; from: number; to: number }[] = [];
  doc.forEach((child, offset) => {
    const pos = offset + 1;
    if (child.type.name === 'paragraph' && isEffectivelyEmptyParagraph(child)) {
      items.push({ pos, from: pos, to: pos + child.nodeSize });
    }
  });
  if (items.length <= 1) return [];
  items.sort((a, b) => a.pos - b.pos);
  const [, ...rest] = items;
  return rest.map((e) => ({ from: e.from, to: e.to }));
}

/** Whitespace / hard-break–only paragraphs still have content; strip to true empty before merging. */
function collectEffectiveEmptyParagraphInnerDeletes(doc: PMNode): { from: number; to: number }[] {
  const dels: { from: number; to: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return true;
    if (!isEffectivelyEmptyParagraph(node)) return true;
    if (node.content.size === 0) return false;
    const innerFrom = pos + 1;
    const innerTo = pos + node.nodeSize - 1;
    if (innerFrom < innerTo) dels.push({ from: innerFrom, to: innerTo });
    return false;
  });
  return dels;
}

function collectDuplicateHardBreakDeletes(doc: PMNode): { from: number; to: number }[] {
  const dels: { from: number; to: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return true;
    const parts: { name: string; pos: number; size: number }[] = [];
    node.forEach((ch, off) => {
      parts.push({ name: ch.type.name, pos: pos + 1 + off, size: ch.nodeSize });
    });
    for (let i = 1; i < parts.length; i++) {
      if (parts[i]!.name === 'hardBreak' && parts[i - 1]!.name === 'hardBreak') {
        dels.push({ from: parts[i]!.pos, to: parts[i]!.pos + parts[i]!.size });
      }
    }
    return false;
  });
  return dels;
}

function docMaxPos(doc: PMNode): number {
  return doc.content.size;
}

function safeDeleteRange(tr: Transaction, doc: PMNode, from: number, to: number): boolean {
  const max = docMaxPos(doc);
  if (from < 0 || to > max || from >= to) return false;
  tr.delete(from, to);
  return true;
}

function buildNormalizeTransaction(state: EditorState): Transaction | null {
  const { schema } = state;
  const tr = state.tr;
  let changed = false;

  const textOps: { from: number; to: number; text: string; marks: readonly Mark[] }[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const $pos = state.doc.resolve(pos + 1);
    if (inCodeBlock($pos)) return true;
    const normalized = node.text.replace(/[ \t\u00a0]+/g, ' ');
    if (normalized !== node.text) {
      textOps.push({ from: pos, to: pos + node.nodeSize, text: normalized, marks: node.marks });
    }
    return true;
  });
  textOps.sort((a, b) => b.from - a.from);
  for (const op of textOps) {
    if (op.from >= 0 && op.to <= docMaxPos(tr.doc) && op.from < op.to) {
      tr.replaceWith(op.from, op.to, schema.text(op.text, op.marks));
      changed = true;
    }
  }

  let guard = 0;
  while (guard++ < 48) {
    const innerDels = collectEffectiveEmptyParagraphInnerDeletes(tr.doc);
    if (innerDels.length === 0) break;
    innerDels.sort((a, b) => b.from - a.from);
    const d = innerDels[0]!;
    if (safeDeleteRange(tr, tr.doc, d.from, d.to)) changed = true;
    else break;
  }

  // One delete per loop: positions must be recomputed from tr.doc after each step (fixes stale ranges).
  guard = 0;
  while (guard++ < 48) {
    const hb = collectDuplicateHardBreakDeletes(tr.doc);
    if (hb.length === 0) break;
    hb.sort((a, b) => b.from - a.from);
    const d = hb[0]!;
    if (safeDeleteRange(tr, tr.doc, d.from, d.to)) changed = true;
    else break;
  }

  guard = 0;
  while (guard++ < 48) {
    const emptyDels = collectConsecutiveEmptyParagraphDeletes(tr.doc);
    if (emptyDels.length === 0) break;
    emptyDels.sort((a, b) => b.from - a.from);
    const d = emptyDels[0]!;
    if (safeDeleteRange(tr, tr.doc, d.from, d.to)) changed = true;
    else break;
  }

  guard = 0;
  while (guard++ < 48) {
    const globalDels = collectTopLevelGlobalExtraEmptyParagraphDeletes(tr.doc);
    if (globalDels.length === 0) break;
    globalDels.sort((a, b) => b.from - a.from);
    const d = globalDels[0]!;
    if (safeDeleteRange(tr, tr.doc, d.from, d.to)) changed = true;
    else break;
  }

  return changed ? tr : null;
}

function createParagraphNormalizeExtension() {
  return Extension.create({
    name: 'paragraphNormalize',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: paragraphNormalizeKey,
          appendTransaction(transactions, _oldState, newState) {
            if (!transactions.some((t) => t.docChanged)) return null;
            if (transactions.some((t) => t.getMeta(paragraphNormalizeKey))) return null;
            const next = buildNormalizeTransaction(newState);
            if (!next || next.steps.length === 0) return null;
            next.setMeta(paragraphNormalizeKey, true);
            return next;
          },
        }),
      ];
    },
  });
}

/**
 * Swallow Enter in a top-level empty paragraph when another top-level empty paragraph already exists.
 * Prevents stacking blank lines before normalize runs.
 */
function createParagraphEnterGuardExtension() {
  return Extension.create({
    name: 'paragraphEnterGuard',
    priority: 95,
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          const { state } = this.editor;
          const { selection } = state;
          if (!selection.empty) return false;
          const { $from } = selection;
          if ($from.parent.type.name !== 'paragraph') return false;
          for (let d = 1; d <= $from.depth; d++) {
            if ($from.node(d).type.name === 'listItem') return false;
          }
          if ($from.depth !== 1) return false;
          if (!isEffectivelyEmptyParagraph($from.parent)) return false;
          const doc = state.doc;
          const paraStart = $from.before(1);
          let otherTopLevelEmpty = 0;
          doc.forEach((child, offset) => {
            const pos = offset + 1;
            if (child.type.name !== 'paragraph') return;
            if (!isEffectivelyEmptyParagraph(child)) return;
            if (pos === paraStart) return;
            otherTopLevelEmpty++;
          });
          return otherTopLevelEmpty >= 1;
        },
      };
    },
  });
}

/** Matches TipTap core `getSplittedAttributes` (keepOnSplit attrs only). */
function getSplittedAttributesForListSplit(
  extensionAttributes: { type: string; name: string; attribute: { keepOnSplit: boolean } }[],
  typeName: string,
  attributes: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(attributes).filter(([name]) => {
      const extensionAttribute = extensionAttributes.find(
        (item) => item.type === typeName && item.name === name,
      );
      if (!extensionAttribute) return false;
      return extensionAttribute.attribute.keepOnSplit;
    }),
  );
}

function getListItemNodeType(nameOrType: string | NodeType, schema: Schema): NodeType {
  if (typeof nameOrType === 'string') {
    const n = schema.nodes[nameOrType];
    if (!n) {
      throw new Error(`There is no node type named '${nameOrType}'. Maybe you forgot to add the extension?`);
    }
    return n;
  }
  return nameOrType;
}

/**
 * TipTap's default `splitListItem` ends with `tr.scrollIntoView()`, which scrolls the viewport on Enter
 * and feels like the list jumps to the "next screen". Register the same behavior without forced scroll.
 */
function createSplitListItemWithoutScrollExtension() {
  return Extension.create({
    name: 'splitListItemWithoutScroll',
    addCommands() {
      return {
        splitListItem:
          (typeOrName: string | NodeType, overrideAttrs: Record<string, unknown> = {}) =>
          ({ tr, state, dispatch, editor }) => {
            const type = getListItemNodeType(typeOrName, state.schema);
            const { $from, $to } = state.selection;
            const selNode = state.selection as { node?: PMNode };
            const node = selNode.node;
            if ((node && node.isBlock) || $from.depth < 2 || !$from.sameParent($to)) {
              return false;
            }
            const grandParent = $from.node(-1);
            if (grandParent.type !== type) {
              return false;
            }
            const extensionAttributes = editor.extensionManager.attributes;
            if ($from.parent.content.size === 0 && $from.node(-1).childCount === $from.indexAfter(-1)) {
              if (
                $from.depth === 2 ||
                $from.node(-3).type !== type ||
                $from.index(-2) !== $from.node(-2).childCount - 1
              ) {
                return false;
              }
              if (dispatch) {
                let wrap = Fragment.empty;
                const depthBefore = $from.index(-1) ? 1 : $from.index(-2) ? 2 : 3;
                for (let d = $from.depth - depthBefore; d >= $from.depth - 3; d -= 1) {
                  wrap = Fragment.from($from.node(d).copy(wrap));
                }
                const depthAfter =
                  $from.indexAfter(-1) < $from.node(-2).childCount
                    ? 1
                    : $from.indexAfter(-2) < $from.node(-3).childCount
                      ? 2
                      : 3;
                const newNextTypeAttributes = {
                  ...getSplittedAttributesForListSplit(
                    extensionAttributes,
                    $from.node().type.name,
                    $from.node().attrs as Record<string, unknown>,
                  ),
                  ...overrideAttrs,
                };
                const nextType =
                  type.contentMatch.defaultType?.createAndFill(newNextTypeAttributes) ?? undefined;
                wrap = wrap.append(Fragment.from(type.createAndFill(null, nextType) ?? undefined));
                const start = $from.before($from.depth - (depthBefore - 1));
                tr.replace(start, $from.after(-depthAfter), new Slice(wrap, 4 - depthBefore, 0));
                let sel = -1;
                tr.doc.nodesBetween(start, tr.doc.content.size, (n, pos) => {
                  if (sel > -1) return false;
                  if (n.isTextblock && n.content.size === 0) {
                    sel = pos + 1;
                  }
                });
                if (sel > -1) {
                  tr.setSelection(TextSelection.near(tr.doc.resolve(sel)));
                }
              }
              return true;
            }
            const nextType = $to.pos === $from.end() ? grandParent.contentMatchAt(0).defaultType : null;
            const newTypeAttributes = {
              ...getSplittedAttributesForListSplit(
                extensionAttributes,
                grandParent.type.name,
                grandParent.attrs as Record<string, unknown>,
              ),
              ...overrideAttrs,
            };
            const newNextTypeAttributes = {
              ...getSplittedAttributesForListSplit(
                extensionAttributes,
                $from.node().type.name,
                $from.node().attrs as Record<string, unknown>,
              ),
              ...overrideAttrs,
            };
            tr.delete($from.pos, $to.pos);
            const types = nextType
              ? [
                  { type, attrs: newTypeAttributes },
                  { type: nextType, attrs: newNextTypeAttributes },
                ]
              : [{ type, attrs: newTypeAttributes }];
            if (!canSplit(tr.doc, $from.pos, 2)) {
              return false;
            }
            if (dispatch) {
              const { selection, storedMarks } = state;
              const { splittableMarks } = editor.extensionManager;
              const marks = storedMarks || (selection.$to.parentOffset && selection.$from.marks());
              tr.split($from.pos, 2, types);
              if (!marks) {
                return true;
              }
              const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));
              tr.ensureMarks(filteredMarks);
            }
            return true;
          },
      };
    },
  });
}

/**
 * Backspace on an empty last list item: default `joinBackward` can leave odd structure so the marker
 * disappears while list padding still reads as a "gap". Prefer a full lift for a one-item list, and
 * `joinTextblockBackward` for multi-item lists (merges text blocks without the broader join path).
 */
function createListEmptyLastBackspaceExtension() {
  return Extension.create({
    name: 'listEmptyLastBackspace',
    priority: 1000,
    addKeyboardShortcuts() {
      return {
        Backspace: () => {
          const { state, view } = this.editor;
          const { selection } = state;
          if (!selection.empty) return false;
          const { $from } = selection;
          if ($from.parent.type.name !== 'paragraph') return false;
          if ($from.parentOffset !== 0) return false;
          if (!isEffectivelyEmptyParagraph($from.parent)) return false;

          let liDepth = -1;
          for (let depth = $from.depth; depth >= 0; depth--) {
            if ($from.node(depth).type.name === 'listItem') {
              liDepth = depth;
              break;
            }
          }
          if (liDepth < 0) return false;

          const listNode = $from.node(liDepth - 1);
          if (listNode.type.name !== 'bulletList' && listNode.type.name !== 'orderedList') return false;

          if ($from.index(liDepth - 1) !== listNode.childCount - 1) return false;

          if (listNode.childCount === 1) {
            return this.editor.commands.liftListItem('listItem');
          }

          return joinTextblockBackward(state, view.dispatch, view);
        },
      };
    },
  });
}

const OL_PASTE_LINE = /^\s*(\d+)\.\s+(.*)$/;
/** Matches `1.dwdw` (no space after dot) as well as `1. dwdw` */
const OL_PASTE_LINE_LOOSE = /^\s*(\d+)\.(.*)$/;
const UL_PASTE_LINE = /^\s*[-*+]\s+(.*)$/;

function buildOrderedListJson(
  lines: string[],
  re: RegExp,
): JSONContent | null {
  const parsed = lines.map((l) => {
    const m = l.match(re);
    return m ? { n: parseInt(m[1]!, 10), body: (m[2] ?? '').trim() } : null;
  });
  if (parsed.some((p) => p === null)) return null;
  const start = parsed[0]!.n;
  return {
    type: 'orderedList',
    attrs: { start },
    content: parsed.map((p) => ({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: p!.body ? [{ type: 'text', text: p!.body }] : [],
        },
      ],
    })),
  };
}

/** Convert pasted plain text like `1. foo` or multi-line numbered / bullet lists into TipTap JSON. */
function parsePlainTextPasteAsList(text: string): JSONContent | null {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const lines = rawLines.map((l) => l.replace(/\s+$/, '')).filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const allOlStrict = lines.every((l) => OL_PASTE_LINE.test(l));
  const allOlLoose = lines.every((l) => OL_PASTE_LINE_LOOSE.test(l));
  const allUl = lines.every((l) => UL_PASTE_LINE.test(l));

  if (allOlStrict) {
    return buildOrderedListJson(lines, OL_PASTE_LINE);
  }
  if (allOlLoose) {
    return buildOrderedListJson(lines, OL_PASTE_LINE_LOOSE);
  }

  if (allUl) {
    const bodies = lines.map((l) => {
      const m = l.match(UL_PASTE_LINE);
      return m ? (m[1] ?? '').trim() : '';
    });
    return {
      type: 'bulletList',
      content: bodies.map((body) => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: body ? [{ type: 'text', text: body }] : [],
          },
        ],
      })),
    };
  }

  if (lines.length === 1) {
    const olStrict = lines[0]!.match(OL_PASTE_LINE);
    const olLoose = olStrict ?? lines[0]!.match(OL_PASTE_LINE_LOOSE);
    if (olLoose) {
      const body = (olLoose[2] ?? '').trim();
      return {
        type: 'orderedList',
        attrs: { start: parseInt(olLoose[1]!, 10) },
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: body ? [{ type: 'text', text: body }] : [],
              },
            ],
          },
        ],
      };
    }
    const ul = lines[0]!.match(UL_PASTE_LINE);
    if (ul) {
      const body = (ul[1] ?? '').trim();
      return {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: body ? [{ type: 'text', text: body }] : [],
              },
            ],
          },
        ],
      };
    }
  }

  return null;
}

type GifAlign = 'left' | 'center' | 'right';

function giphyImageUrl(
  images: GiphyGif['images'] | undefined,
  ...keys: string[]
): string {
  if (!images) return '';
  const bag = images as Record<string, { url?: string } | undefined>;
  for (const k of keys) {
    const u = bag[k]?.url;
    if (u) return u;
  }
  return '';
}

/** Remove accidental double schemes like `https://https://…`. */
function collapseDuplicateUrlSchemes(input: string): string {
  let t = input.trim();
  while (/^https?:\/\/https?:\/\//i.test(t)) {
    t = t.replace(/^https?:\/\//i, '');
  }
  return t;
}

/**
 * Validates and normalizes a URL for storage. Preserves `http://` vs `https://` when the user typed a scheme;
 * scheme-less input defaults to `https://`. Rejects incomplete hosts (e.g. `youtube` without TLD).
 */
function normalizeUrlForStorage(input: string): { ok: boolean; href: string; error?: string } {
  const s = collapseDuplicateUrlSchemes(input);
  if (!s) return { ok: false, href: '' };

  const originalScheme = /^http:\/\//i.test(s) ? 'http' : /^https:\/\//i.test(s) ? 'https' : null;

  let candidate = s;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return { ok: false, href: '', error: 'Invalid URL' };
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, href: '', error: 'Only http(s) links' };
  }

  const host = u.hostname;
  if (!host || (host !== 'localhost' && !host.includes('.'))) {
    return { ok: false, href: '', error: 'Use a full domain (e.g. youtube.com)' };
  }

  if (originalScheme === 'http') {
    u = new URL(u.toString());
    u.protocol = 'http:';
  } else {
    u = new URL(u.toString());
    u.protocol = 'https:';
  }

  return { ok: true, href: u.toString() };
}

function parseLinkInputForPreview(raw: string): {
  valid: boolean;
  href: string;
  host: string;
  displayUrl: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, href: '', host: '', displayUrl: '' };
  }
  const n = normalizeUrlForStorage(trimmed);
  if (!n.ok) {
    return {
      valid: false,
      href: '',
      host: '',
      displayUrl: trimmed,
      error: n.error ?? 'Invalid URL',
    };
  }
  try {
    const u = new URL(n.href);
    return {
      valid: true,
      href: n.href,
      host: u.hostname.replace(/^www\./, ''),
      displayUrl: n.href,
    };
  } catch {
    return { valid: false, href: '', host: '', displayUrl: trimmed };
  }
}

const InlineGif = TipTapNode.create({
  name: 'inlineGif',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      url: {
        default: '',
      },
      align: {
        default: 'center' as GifAlign,
      },
      title: {
        default: '',
      },
      sourceUrl: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-inline-gif]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { url, align, title, sourceUrl } = HTMLAttributes as {
      url?: string;
      align?: GifAlign;
      title?: string;
      sourceUrl?: string;
    };
    const cls =
      align === 'left'
        ? 'ss-inline-gif ss-inline-gif-left'
        : align === 'right'
          ? 'ss-inline-gif ss-inline-gif-right'
          : 'ss-inline-gif ss-inline-gif-center';

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-inline-gif': 'true',
        'data-align': align ?? 'center',
        'data-gif-title': title ?? '',
        'data-gif-source': sourceUrl ?? '',
        class: `${cls} inline-block align-middle mr-1`,
      }),
      [
        'img',
        {
          src: url ?? '',
          alt: 'GIF',
          class: 'inline-block h-24 w-24 object-cover rounded-md align-middle',
        },
      ],
    ];
  },
});

const MentionNode = TipTapNode.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      username: {
        default: '',
      },
      fullName: {
        default: '',
      },
      profileImg: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-mention]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { username, fullName, profileImg } = HTMLAttributes as {
      username?: string;
      fullName?: string;
      profileImg?: string;
    };
    const avatar = profileImg || (username ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` : '');

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-mention': 'true',
        'data-username': username ?? '',
        'data-full-name': fullName ?? '',
        'data-profile-img': profileImg ?? '',
        class:
          'ss-mention inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-primary/60 bg-primary/10 text-primary text-[11px] font-semibold mr-1',
      }),
      avatar
        ? ['img', { src: avatar, alt: '', class: 'h-4 w-4 rounded-full border border-primary/40 object-cover' }]
        : '',
      ['span', { class: 'truncate max-w-[120px]' }, `@${username || 'user'}`],
    ];
  },
});

function toInitialDoc(initialDoc?: RichTextDoc, legacyText?: string): RichTextDoc {
  if (initialDoc) return initialDoc;
  const text = (legacyText ?? '').toString();
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: text ? [{ type: 'text', text }] : [],
      },
    ],
  };
}

export function RichParagraphEditor({
  initialDoc,
  legacyText,
  onChange,
  normalizeContent: normalizeContentProp = true,
  readOnly = false,
  readOnlyLinkPreview,
  className,
}: Readonly<RichParagraphEditorProps>) {
  const normalizeContent = normalizeContentProp !== false && !readOnly;
  const editorRef = useRef<Editor | null>(null);
  const router = useRouter();

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      LinkMark.configure({
        openOnClick: readOnly,
        linkOnPaste: !readOnly,
        autolink: !readOnly,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'ss-link',
        },
      }),
      InlineGif,
      MentionNode,
      ...(normalizeContent ? [createParagraphEnterGuardExtension(), createParagraphNormalizeExtension()] : []),
      createSplitListItemWithoutScrollExtension(),
      createListEmptyLastBackspaceExtension(),
    ],
    [normalizeContent, readOnly],
  );

  const editor = useEditor({
    extensions,
    editable: !readOnly,
    content: toInitialDoc(initialDoc, legacyText),
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
    },
    onUpdate: readOnly
      ? undefined
      : ({ editor }) => {
          const json = editor.getJSON();
          onChange?.(json);
        },
    immediatelyRender: false,
    editorProps: {
      handlePaste(_view, event) {
        const ed = editorRef.current;
        if (!ed) return false;
        const clip = event.clipboardData;
        if (!clip) return false;
        const text = clip.getData('text/plain');
        if (!text || !text.trim()) return false;
        const json = parsePlainTextPasteAsList(text);
        if (!json) return false;
        event.preventDefault();
        ed.chain().focus().deleteSelection().insertContent(json).run();
        return true;
      },
    },
  }, [extensions, readOnly]);

  useEffect(() => {
    editorRef.current = editor ?? null;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const [showGifPanel, setShowGifPanel] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [gifResults, setGifResults] = useState<GiphyGif[]>([]);
  const [gifSearching, setGifSearching] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);

  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const [showMentionPanel, setShowMentionPanel] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<FollowUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);

  const anyPanelOpen = showLinkPanel || showMentionPanel || showGifPanel;
  const linkPreview = useMemo(() => parseLinkInputForPreview(linkUrl), [linkUrl]);
  const linkPanelTitleId = useId();
  const mentionPanelTitleId = useId();
  const gifPanelTitleId = useId();

  const closeAllPanels = useCallback(() => {
    setShowLinkPanel(false);
    setShowMentionPanel(false);
    setShowGifPanel(false);
    setLinkUrl('');
    setLinkText('');
    setMentionQuery('');
    setMentionResults([]);
    setGifSearchQuery('');
    setGifResults([]);
    setGifError(null);
  }, []);

  const toolbarPopoverRef = useRef<HTMLDivElement>(null);
  const popoverContainerRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'above' | 'below';
  } | null>(null);

  const POPOVER_GAP = 6;
  /** Reserve space for fixed top navbar so popovers flip below instead of overlapping. */
  const POPOVER_NAV_SAFE_TOP = 56;

  const computePopoverPosition = useCallback(() => {
    const toolbar = toolbarPopoverRef.current;
    const open = showLinkPanel || showMentionPanel || showGifPanel;
    if (!toolbar || !open) return;

    const rect = toolbar.getBoundingClientRect();
    const margin = 8;
    const width = showLinkPanel
      ? Math.min(440, Math.max(280, window.innerWidth - 2 * margin))
      : Math.min(300, Math.max(220, window.innerWidth - 2 * margin));

    let estH = 260;
    if (showGifPanel) estH = 340;
    else if (showMentionPanel) estH = 300;
    else if (showLinkPanel) {
      estH = linkUrl.trim() && linkPreview.valid ? 340 : 220;
    } else estH = 260;

    const measured = popoverContainerRef.current?.offsetHeight;
    const h = measured && measured > 48 ? measured : estH;

    const spaceAbove = rect.top - POPOVER_NAV_SAFE_TOP - margin;
    const spaceBelow = window.innerHeight - rect.bottom - margin;

    const fitsAbove =
      spaceAbove >= h + POPOVER_GAP && rect.top - POPOVER_GAP - h >= POPOVER_NAV_SAFE_TOP + margin;

    let placement: 'above' | 'below';
    let top: number;

    if (fitsAbove) {
      placement = 'above';
      top = rect.top - POPOVER_GAP - h;
    } else if (spaceBelow >= h + POPOVER_GAP) {
      placement = 'below';
      top = rect.bottom + POPOVER_GAP;
    } else {
      placement = spaceAbove >= spaceBelow ? 'above' : 'below';
      if (placement === 'above') {
        top = Math.max(POPOVER_NAV_SAFE_TOP + margin, rect.top - POPOVER_GAP - h);
      } else {
        top = rect.bottom + POPOVER_GAP;
      }
    }

    if (top + h > window.innerHeight - margin) {
      top = Math.max(POPOVER_NAV_SAFE_TOP + margin, window.innerHeight - margin - h);
    }

    const left = Math.min(Math.max(margin, rect.left), window.innerWidth - margin - width);

    setPopoverCoords({ top, left, width, placement });
  }, [showLinkPanel, showMentionPanel, showGifPanel, linkUrl, linkPreview.valid]);

  useLayoutEffect(() => {
    if (!anyPanelOpen) {
      setPopoverCoords(null);
      return;
    }
    computePopoverPosition();
    const id = requestAnimationFrame(() => computePopoverPosition());
    return () => cancelAnimationFrame(id);
  }, [anyPanelOpen, computePopoverPosition, linkUrl, mentionQuery, showLinkPanel, showMentionPanel, showGifPanel]);

  useEffect(() => {
    if (!anyPanelOpen) return;
    const el = popoverContainerRef.current;
    const ro = new ResizeObserver(() => computePopoverPosition());
    if (el) ro.observe(el);
    const onResize = () => computePopoverPosition();
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [anyPanelOpen, popoverCoords, computePopoverPosition]);

  useEffect(() => {
    if (!anyPanelOpen) return;
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && popoverContainerRef.current?.contains(target)) return;
      closeAllPanels();
    };
    globalThis.addEventListener('scroll', onScroll, true);
    return () => globalThis.removeEventListener('scroll', onScroll, true);
  }, [anyPanelOpen, closeAllPanels]);

  useEffect(() => {
    if (!anyPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllPanels();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [anyPanelOpen, closeAllPanels]);

  useEffect(() => {
    if (!anyPanelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = toolbarPopoverRef.current;
      if (el && !el.contains(e.target as Node)) closeAllPanels();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [anyPanelOpen, closeAllPanels]);

  const runGifSearch = useCallback(async () => {
    const q = gifSearchQuery.trim();
    if (!q) return;
    setGifSearching(true);
    setGifError(null);
    try {
      const res = await searchGifs(q, { limit: 20 });
      setGifResults(res.data ?? []);
    } catch (e) {
      setGifError(e instanceof Error ? e.message : 'GIF search failed');
      setGifResults([]);
    } finally {
      setGifSearching(false);
    }
  }, [gifSearchQuery]);

  const insertGifFromResult = useCallback(
    (gif: GiphyGif) => {
      const url = giphyImageUrl(gif.images, 'original', 'fixed_height', 'downsized_medium');
      if (!url) return;
      editor
        ?.chain()
        ?.focus()
        ?.insertContent({
          type: 'inlineGif',
          attrs: {
            url,
            align: 'center' as GifAlign,
            title: (gif.title ?? '').trim(),
            sourceUrl: `https://giphy.com/gifs/${gif.id}`,
          },
        })
        ?.run();
      setShowGifPanel(false);
      setGifSearchQuery('');
      setGifResults([]);
    },
    [editor],
  );

  const applyLink = useCallback(() => {
    const href = linkUrl.trim();
    if (!href) {
      editor?.chain()?.focus()?.unsetLink()?.run();
      setShowLinkPanel(false);
      return;
    }
    const parsed = normalizeUrlForStorage(href);
    if (!parsed.ok) return;
    const normalized = parsed.href;
    const label = linkText.trim() || normalized;
    const selEmpty = !editor || editor.state.selection.empty;

    if (!editor) {
      setShowLinkPanel(false);
      setLinkUrl('');
      setLinkText('');
      return;
    }

    const chain = editor.chain().focus();

    if (selEmpty) {
      // insertContent + collapsed setLink only sets stored marks — the next keystroke gets the link, not the inserted label
      const start = editor.state.selection.from;
      chain
        .insertContent(label)
        .setTextSelection({ from: start, to: start + label.length })
        .setLink({ href: normalized })
        .run();
    } else {
      // When text is selected, just apply a link mark to that text
      chain.extendMarkRange('link').setLink({ href: normalized }).run();
    }

    setShowLinkPanel(false);
    setLinkUrl('');
    setLinkText('');
  }, [editor, linkUrl, linkText]);

  useEffect(() => {
    if (!showMentionPanel) return;
    const q = mentionQuery.trim();
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
    }, 250);
    return () => clearTimeout(t);
  }, [showMentionPanel, mentionQuery]);

  const insertMention = useCallback(
    (user: FollowUser) => {
      const username = user.username?.trim();
      if (!username) return;
      editor
        ?.chain()
        ?.focus()
        ?.insertContent({
          type: 'mention',
          attrs: {
            username,
            fullName: user.fullName ?? '',
            profileImg: user.profileImg ?? '',
          },
        })
        ?.insertContent(' ')
        ?.run();
      setShowMentionPanel(false);
      setMentionQuery('');
      setMentionResults([]);
    },
    [editor],
  );

  const setAlign = (align: GifAlign) => {
    const win = typeof globalThis !== 'undefined' ? globalThis : null;
    const sel = win && 'getSelection' in win ? win.getSelection() : null;
    const anchor = sel?.anchorNode as globalThis.Node | null;
    const el =
      anchor && anchor.nodeType === globalThis.Node.ELEMENT_NODE
        ? (anchor as Element)
        : anchor?.parentElement;
    const span = el instanceof Element ? el.closest('span[data-inline-gif]') as HTMLElement | null : null;
    if (span) {
      span.dataset.align = align;
      span.classList.remove('ss-inline-gif-left', 'ss-inline-gif-center', 'ss-inline-gif-right');
      span.classList.add(
        align === 'left'
          ? 'ss-inline-gif-left'
          : align === 'right'
            ? 'ss-inline-gif-right'
            : 'ss-inline-gif-center',
      );
    }
  };

  const isGifSelected = editor?.isActive('inlineGif') ?? false;

  const onEditorLinkClickCapture = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      e.preventDefault();
      if (readOnly || e.ctrlKey || e.metaKey) {
        safeOpenLinkHref(anchor.getAttribute('href'));
      }
    },
    [readOnly],
  );

  const onReadOnlyClickCapture = useCallback(
    (e: React.MouseEvent) => {
      const mentionEl = (e.target as HTMLElement | null)?.closest(READONLY_MENTION_SEL) as HTMLElement | null;
      if (mentionEl) {
        const u = mentionEl.dataset.username?.trim();
        if (u) {
          e.preventDefault();
          router.push(`/u/${encodeURIComponent(u)}`);
          return;
        }
      }
      const gifEl = (e.target as HTMLElement | null)?.closest(READONLY_GIF_SEL) as HTMLElement | null;
      if (gifEl) {
        const source = gifEl.getAttribute('data-gif-source')?.trim();
        const img = gifEl.querySelector('img');
        const src = img?.getAttribute('src')?.trim();
        const openHref = source || src;
        if (openHref) {
          e.preventDefault();
          globalThis.window.open(openHref, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      onEditorLinkClickCapture(e);
    },
    [router, onEditorLinkClickCapture],
  );

  const toolbarButton = (active: boolean) =>
    cn(
      'inline-flex items-center justify-center rounded border px-2 py-1.5 text-[11px] font-semibold min-h-[30px]',
      active ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/70',
    );

  const popoverCard =
    'border border-primary/25 bg-background text-foreground shadow-[4px_4px_0_0_var(--border)] rounded-none transition-[box-shadow,border-color] hover:border-primary/45 hover:shadow-[5px_5px_0_0_var(--border)]';

  if (!editor) {
    return (
      <div
        className={cn('min-h-[3rem] animate-pulse border border-border bg-muted/30', className)}
        aria-hidden
      />
    );
  }

  if (readOnly) {
    return (
      <div className={cn('ss-read-only-rich ss-rich-paragraph-editor border-0 bg-transparent', className)}>
        <EditorContent
          editor={editor}
          className={cn(
            'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
            '[&_.ProseMirror]:outline-none',
          )}
          onClickCapture={onReadOnlyClickCapture}
        />
        {readOnlyLinkPreview ? <ReadOnlyRichLinkHoverLayer editor={editor} renderPreview={readOnlyLinkPreview} /> : null}
        <ReadOnlyMentionHoverLayer editor={editor} />
        <ReadOnlyGifHoverLayer editor={editor} />
      </div>
    );
  }

  return (
    <div className="ss-rich-paragraph-editor border border-border bg-card rounded relative overflow-visible">
      <div ref={toolbarPopoverRef} className="relative z-30 overflow-visible px-2 pt-2">
        <AnimatePresence mode="wait">
          {anyPanelOpen && popoverCoords && (
            <motion.div
              key={showLinkPanel ? 'link' : showMentionPanel ? 'mention' : 'gif'}
              ref={popoverContainerRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby={
                showLinkPanel ? linkPanelTitleId : showMentionPanel ? mentionPanelTitleId : gifPanelTitleId
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'fixed',
                top: popoverCoords.top,
                left: popoverCoords.left,
                width: popoverCoords.width,
                zIndex: 400,
              }}
              className={cn(
                popoverCard,
                'pointer-events-auto max-h-[min(26rem,calc(100vh-var(--ss-nav-safe,56px)-1rem))] overflow-y-auto p-2.5 text-xs isolate',
              )}
            >
              {showLinkPanel && (
                <>
                  <div className="flex items-center gap-1.5 mb-2 border-b border-border pb-2">
                    <Link2 className="h-4 w-4 text-primary shrink-0" aria-hidden />
                    <h2 id={linkPanelTitleId} className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Link
                    </h2>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <label htmlFor="rp-link-url" className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                          URL
                        </label>
                        <input
                          id="rp-link-url"
                          type="text"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://example.com or www.example.com"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyLink();
                            }
                          }}
                          className="w-full border border-border rounded-none px-2 py-2 text-xs bg-background font-mono focus:outline-none focus:border-primary"
                        />
                        {linkUrl.trim() && !linkPreview.valid && linkPreview.error && (
                          <p className="mt-1 text-[10px] text-destructive">{linkPreview.error}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="rp-link-text" className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                          Label <span className="font-normal normal-case">(opt.)</span>
                        </label>
                        <input
                          id="rp-link-text"
                          type="text"
                          value={linkText}
                          onChange={(e) => setLinkText(e.target.value)}
                          placeholder="Visible text"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              applyLink();
                            }
                          }}
                          className="w-full border border-border rounded-none px-2 py-2 text-xs bg-background focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {linkPreview.valid && (
                      <div className="w-full shrink-0 overflow-hidden border border-border bg-background sm:w-[min(200px,38%)] sm:max-w-[220px]">
                        <p className="border-b border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Site preview
                        </p>
                        <LinkPreviewCardContent domain={linkPreview.href} />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 border border-border rounded-none text-[10px] font-semibold uppercase tracking-wide transition-colors hover:bg-muted"
                      onClick={closeAllPanels}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(linkUrl.trim() && !linkPreview.valid)}
                      className="px-3 py-1.5 border border-border bg-primary text-primary-foreground rounded-none text-[10px] font-bold uppercase tracking-wide hover:brightness-110 disabled:pointer-events-none disabled:opacity-40"
                      onClick={applyLink}
                    >
                      Apply
                    </button>
                  </div>
                </>
              )}

              {showMentionPanel && (
                <>
                  <div className="flex items-center gap-1.5 mb-2 border-b border-border pb-2">
                    <AtSign className="h-4 w-4 text-primary shrink-0" aria-hidden />
                    <h2 id={mentionPanelTitleId} className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Mention
                    </h2>
                  </div>

                  <label htmlFor="rp-mention-search" className="sr-only">
                    Search users
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      id="rp-mention-search"
                      type="text"
                      value={mentionQuery}
                      onChange={(e) => setMentionQuery(e.target.value)}
                      placeholder="Search…"
                      className="w-full border border-border rounded-none pl-8 pr-2 py-2 text-xs bg-background focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto border border-border bg-muted rounded-none">
                    {mentionLoading && (
                      <div className="p-3 text-center text-[11px] text-muted-foreground">…</div>
                    )}
                    {!mentionLoading && mentionQuery.trim() && mentionResults.length === 0 && (
                      <div className="p-2 text-center text-[11px] text-muted-foreground">No match</div>
                    )}
                    {!mentionLoading && mentionResults.length > 0 && (
                      <ul className="divide-y divide-border">
                        {mentionResults.map((user) => (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => insertMention(user)}
                              className="flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-primary/12 active:bg-primary/18"
                            >
                              <img
                                src={user.profileImg || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                alt=""
                                className="h-8 w-8 rounded-none border border-border object-cover shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold truncate">{user.fullName || user.username}</p>
                                <p className="text-[10px] text-muted-foreground truncate">@{user.username}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!mentionLoading && !mentionQuery.trim() && (
                      <div className="p-2 text-center text-[10px] text-muted-foreground">Type to search</div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="px-3 py-1.5 border border-border rounded-none text-[10px] font-semibold uppercase tracking-wide transition-colors hover:bg-muted"
                      onClick={closeAllPanels}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}

              {showGifPanel && (
                <>
                  <div className="flex items-center gap-1.5 mb-2 border-b border-border pb-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden />
                    <h2 id={gifPanelTitleId} className="text-xs font-bold uppercase tracking-wide text-foreground">
                      GIF <span className="font-normal text-muted-foreground">· GIPHY</span>
                    </h2>
                  </div>

                  <div className="flex gap-1.5 mb-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={gifSearchQuery}
                        onChange={(e) => setGifSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && runGifSearch()}
                        placeholder="Search…"
                        className="w-full border border-border rounded-none pl-8 pr-2 py-2 text-xs bg-background focus:outline-none focus:border-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={runGifSearch}
                      disabled={gifSearching || !gifSearchQuery.trim()}
                      className="shrink-0 px-3 py-2 border border-border bg-primary text-primary-foreground rounded-none text-[10px] font-bold uppercase tracking-wide hover:brightness-110 disabled:opacity-50"
                    >
                      {gifSearching ? '…' : 'Go'}
                    </button>
                  </div>
                  {gifError && <div className="mb-1 text-[11px] text-destructive">{gifError}</div>}
                  <div className="max-h-[min(220px,42vh)] overflow-y-auto grid grid-cols-2 gap-1.5">
                    {gifResults.map((gif) => (
                      <button
                        key={gif.id}
                        type="button"
                        onClick={() => insertGifFromResult(gif)}
                        className="group aspect-square border border-border overflow-hidden rounded-none hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <img
                          src={giphyImageUrl(gif.images, 'fixed_height_small', 'fixed_height', 'original')}
                          alt={gif.title || 'GIF result'}
                          className="w-full h-full object-cover transition-[filter] group-hover:brightness-105"
                        />
                      </button>
                    ))}
                    {!gifSearching && gifResults.length === 0 && !gifError && (
                      <div className="col-span-full py-4 text-center text-[11px] text-muted-foreground">Search to preview</div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="px-3 py-1.5 border border-border rounded-none text-[10px] font-semibold uppercase tracking-wide transition-colors hover:bg-muted"
                      onClick={closeAllPanels}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleBold()?.run()}
            className={toolbarButton(editor?.isActive('bold') ?? false)}
            title="Bold"
            aria-label="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleItalic()?.run()}
            className={toolbarButton(editor?.isActive('italic') ?? false)}
            title="Italic"
            aria-label="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleUnderline()?.run()}
            className={toolbarButton(editor?.isActive('underline') ?? false)}
            title="Underline"
            aria-label="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-[18px] w-px bg-border" />

          <button
            type="button"
            onClick={() => {
              setShowLinkPanel((prev) => !prev);
              setShowMentionPanel(false);
              setShowGifPanel(false);
            }}
            className={toolbarButton(editor?.isActive('link') ?? false)}
            title="Insert link"
            aria-label="Insert link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMentionPanel((prev) => !prev);
              setShowLinkPanel(false);
              setShowGifPanel(false);
            }}
            className={toolbarButton(false)}
            title="Mention user"
            aria-label="Mention user"
          >
            <AtSign className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowGifPanel((prev) => !prev);
              setShowLinkPanel(false);
              setShowMentionPanel(false);
            }}
            className={toolbarButton(isGifSelected || showGifPanel)}
            title="Insert GIF"
            aria-label="Insert GIF"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="ml-1">GIF</span>
          </button>
        </div>
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none focus:outline-none mt-2 mx-2 mb-2',
        )}
        onClickCapture={onEditorLinkClickCapture}
      />
    </div>
  );
}

