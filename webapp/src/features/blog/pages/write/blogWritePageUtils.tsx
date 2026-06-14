"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { blogApi, pickRemoteThumbnailForApi } from "@/api/blog";
import { uploadCover } from "@/api/upload";
import type { BlogPublishTaxonomy } from "@/lib/blog/blogPublishTaxonomy";
import {
  ChevronRight,
  Activity,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link2,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/core/utils";
import { resolveSameOriginRequestUrl } from "@/lib/api/publicApiBase";
import { setWriteEditorSessionPostId } from "@/lib/blog/writeBlogSession";
import { blockTypeDisplayName } from "@/lib/blog/writeWorkspaceStats";
import { Block, stripLegacyGifBlocks } from "@/components/ui/editor";
import { motion, AnimatePresence } from "framer-motion";
export function thumbnailPreviewFromApi(
  raw: string | undefined | null,
): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/")) return resolveSameOriginRequestUrl(t);
  return null;
}
export const TITLE_MAX = 150;
export const SUMMARY_MAX_WORDS = 300;
export function serializeWriteWorkspace(args: {
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
export function summaryWordCount(html: string): number {
  if (!html || html === "<br>") return 0;
  let text: string;
  if (typeof document === "undefined") {
    text = html.replaceAll(/<[^>]*>/g, " ").replaceAll("&nbsp;", " ");
  } else {
    const div = document.createElement("div");
    div.innerHTML = html;
    text = div.textContent ?? "";
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}
export function escapeHtmlPlain(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
export function richExecCommand(
  commandId: string,
  showUI = false,
  value?: string | null,
): boolean {
  return document.execCommand(commandId, showUI, value ?? undefined);
}
export function richQueryCommandState(commandId: string): boolean {
  return document.queryCommandState(commandId);
}
export function collapseSpacesInElement(el: HTMLElement): void {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.textContent && /\s{2,}/.test(node.textContent)) {
      node.textContent = node.textContent.replaceAll(/\s+/g, " ");
    }
  }
}
export function getRangePositionAtOffset(
  range: Range,
  charOffset: number,
): {
  node: Node;
  offset: number;
} | null {
  if (charOffset <= 0)
    return { node: range.startContainer, offset: range.startOffset };
  const totalLen = range.toString().length;
  if (charOffset >= totalLen)
    return { node: range.endContainer, offset: range.endOffset };
  const sc = range.startContainer;
  const so = range.startOffset;
  const ec = range.endContainer;
  const eo = range.endOffset;
  let count = 0;
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
  );
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
export function trimSelectionRange(range: Range): void {
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
    } catch {}
  }
}
export function getSelectionStartOffset(el: HTMLElement): number {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const startRange = document.createRange();
  startRange.selectNodeContents(el);
  startRange.setEnd(range.startContainer, range.startOffset);
  return startRange.toString().length;
}
export function setSelectionToOffset(el: HTMLElement, offset: number): void {
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
export function finalizeSummaryLinkInsertion(
  el: HTMLElement,
  sel: Selection | null,
  syncToState: () => void,
): void {
  const links = el.getElementsByTagName("a");
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
    richExecCommand("insertText", false, " ");
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
export type DraftSyncUi = "idle" | "offline" | "local" | "syncing" | "synced";
export function draftSyncBadgeTitle(status: DraftSyncUi): string {
  switch (status) {
    case "offline":
      return "Offline – changes will sync when you are back online";
    case "syncing":
      return "Syncing…";
    case "local":
      return "Unsaved changes (not synced yet)";
    case "synced":
    case "idle":
      return "Synced to server";
    default:
      return "";
  }
}
export function draftSyncBadgeLabel(status: DraftSyncUi): string {
  switch (status) {
    case "offline":
      return "Offline";
    case "syncing":
      return "Syncing…";
    case "local":
      return "Local";
    case "synced":
    case "idle":
      return "Up to date";
    default:
      return "";
  }
}
export const MAX_BLOCKS_PER_SECTION = 20;
export type RevisionKind =
  | "initial"
  | "opened"
  | "draft_saved"
  | "autosynced"
  | "edited"
  | "published";
export type RevisionEntry = {
  id: string;
  kind: RevisionKind;
  label: string;
  at: number;
};
export function formatRevisionWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function revisionKindBadgeClass(kind: RevisionKind): string {
  switch (kind) {
    case "initial":
    case "opened":
      return "border-primary/50 bg-primary/10 text-primary";
    case "draft_saved":
    case "autosynced":
      return "border-border bg-card text-foreground";
    case "edited":
      return "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    case "published":
      return "border-green-500/50 bg-green-500/10 text-green-900 dark:text-green-100";
    default:
      return "border-border bg-muted text-foreground";
  }
}
export const PRIMARY_SECTION_ID = "s-1";
export { BLOG_THUMB_MAX_MB as THUMB_MAX_MB } from "@/variable";
export const REVISIONS_SIDEBAR_VISIBLE = 10;
export function SummaryEditor({
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
  const lastValidHtml = useRef(value || "");
  const savedSelectionRef = useRef<Range | null>(null);
  const closeCardAfterLinkRef = useRef(false);
  const lastKeyDownInSummaryRef = useRef(0);
  const [selectionCard, setSelectionCard] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [linkMode, setLinkMode] = useState(false);
  const [linkInput, setLinkInput] = useState("");
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
    const anchorInEl = el.contains(sel.anchorNode);
    const focusInEl = el.contains(sel.focusNode);
    if (!anchorInEl && !focusInEl) {
      setSelectionCard(null);
      return;
    }
    const range = sel.getRangeAt(0);
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
      bold: richQueryCommandState("bold"),
      italic: richQueryCommandState("italic"),
      underline: richQueryCommandState("underline"),
    });
    try {
      const rect = range.getBoundingClientRect();
      setSelectionCard({ top: rect.top - 8, left: rect.left });
    } catch {
      setSelectionCard(null);
    }
  }, []);
  useEffect(() => {
    document.addEventListener("selectionchange", updateSelectionCard);
    return () =>
      document.removeEventListener("selectionchange", updateSelectionCard);
  }, [updateSelectionCard]);
  useEffect(() => {
    if (!selectionCard) {
      setLinkMode(false);
      savedSelectionRef.current = null;
    }
  }, [selectionCard]);
  useEffect(() => {
    const closeOnScroll = () => setSelectionCard(null);
    globalThis.addEventListener("scroll", closeOnScroll, true);
    return () => globalThis.removeEventListener("scroll", closeOnScroll, true);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || skipSync.current) {
      skipSync.current = false;
      return;
    }
    if (document.activeElement && el.contains(document.activeElement)) return;
    if (value && value !== "<br>") {
      el.innerHTML = value;
      collapseSpacesInElement(el);
      el.classList.remove("ss-editor-empty");
    } else {
      el.innerHTML = "<br>";
      el.classList.add("ss-editor-empty");
    }
    lastValidHtml.current = el.innerHTML;
  }, [value]);
  const handleInput = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const isFocused =
      document.activeElement && el.contains(document.activeElement);
    const savedOffset = isFocused ? getSelectionStartOffset(el) : -1;
    collapseSpacesInElement(el);
    if (savedOffset >= 0)
      setSelectionToOffset(
        el,
        Math.min(savedOffset, (el.textContent ?? "").length),
      );
    let html = el.innerHTML;
    if (html === "\n" || (el.childNodes.length === 1 && el.querySelector("br")))
      html = "";
    if (summaryWordCount(html) > maxWords) {
      el.innerHTML = lastValidHtml.current;
      skipSync.current = true;
      return;
    }
    lastValidHtml.current = html;
    onChange(html);
  }, [onChange, maxWords]);
  const applyFormat = useCallback(
    (cmd: "bold" | "italic" | "underline") => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      richExecCommand(cmd, false);
      setFormatState((prev) => ({
        ...prev,
        bold: richQueryCommandState("bold"),
        italic: richQueryCommandState("italic"),
        underline: richQueryCommandState("underline"),
      }));
      syncToState();
    },
    [syncToState],
  );
  const normalizeLinkInput = useCallback(
    (v: string) => v.replaceAll(/^https?:\/\//gi, "").trim(),
    [],
  );
  const applyLink = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    linkInputRef.current?.blur();
    closeCardAfterLinkRef.current = true;
    setLinkInput("");
    setLinkMode(false);
    setSelectionCard(null);
    const rest = normalizeLinkInput(linkInput);
    const url = rest ? `https://${rest}` : "https://";
    el.focus();
    const sel = document.getSelection();
    const range = savedSelectionRef.current;
    if (sel && range && el.contains(range.startContainer)) {
      try {
        sel.removeAllRanges();
        sel.addRange(range);
        richExecCommand("createLink", false, url);
      } catch {
        richExecCommand("createLink", false, url);
      }
      savedSelectionRef.current = null;
    } else {
      richExecCommand("createLink", false, url);
    }
    finalizeSummaryLinkInsertion(el, sel, syncToState);
  }, [linkInput, normalizeLinkInput, syncToState]);
  useEffect(() => {
    if (linkMode) linkInputRef.current?.focus();
  }, [linkMode]);
  const toggleBtn = (active: boolean) =>
    cn(
      "p-2  border-2 focus:outline-none focus:ring-2 focus:ring-primary/30",
      active
        ? "border-primary bg-primary/15 text-primary"
        : "border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/50",
    );
  return (
    <>
      <div className="relative">
        <span className="absolute -top-3 -left-3 bg-primary text-primary-foreground text-[8px] font-bold px-1 z-10 border border-black">
          P1
        </span>
        <div className="flex items-center justify-end text-[10px] font-bold text-muted-foreground mb-0.5">
          <span>
            {summaryWordCount(value)}/{maxWords} words
          </span>
        </div>

        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onFocusCapture={onFocusCapture}
          tabIndex={0}
          aria-label="Summary"
          aria-multiline
          data-placeholder="SUMMARY_TEXT_HERE..."
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === "a") lastKeyDownInSummaryRef.current = 0;
            else lastKeyDownInSummaryRef.current = Date.now();
            if (e.key === "Enter") {
              e.preventDefault();
              richExecCommand("insertHTML", false, "<br>");
              handleInput();
              return;
            }
            if (e.key === " ") {
              const sel = document.getSelection();
              const anchor = sel?.anchorNode;
              if (
                sel &&
                sel.rangeCount > 0 &&
                ref.current &&
                anchor &&
                ref.current.contains(anchor)
              ) {
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
            const raw = e.clipboardData.getData("text/plain") ?? "";
            const lines = raw.replace(/\r\n/g, "\n").split("\n");
            const htmlPaste = lines
              .map((line) => (line.length ? escapeHtmlPlain(line) : ""))
              .join("<br>");
            richExecCommand("insertHTML", false, htmlPaste || "<br>");
            handleInput();
          }}
          className={cn(
            "w-full bg-transparent border-b-2 border-border py-3 text-base font-medium focus:outline-none focus:border-primary ss-summary-editor",
            (!value || value === "<br>") && "ss-editor-empty",
            "ss-editor-empty:before:content-[attr(data-placeholder)] ss-editor-empty:before:text-muted-foreground ss-editor-empty:before:uppercase ss-editor-empty:before:tracking-tighter",
            "[&_strong]:font-bold [&_em]:italic [&_u]:underline",
          )}
        />
      </div>

      <AnimatePresence>
        {selectionCard &&
          typeof document !== "undefined" &&
          summaryWordCount(value) > 0 && (
            <motion.div
              ref={cardRef}
              data-ss-summary-toolbar
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed z-[100] w-fit max-w-[90vw] border-2 border-border bg-card text-card-foreground shadow overflow-hidden"
              style={{
                top: selectionCard.top - 52,
                left: Math.max(8, selectionCard.left),
              }}
            >
              {linkMode ? (
                <div className="flex items-center gap-2 px-2 py-1.5 min-w-[200px]">
                  <span
                    className="flex items-center justify-center w-7 h-7 border-2 border-border bg-primary text-primary-foreground shrink-0"
                    aria-hidden
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-1 items-center border-2 border-border overflow-hidden bg-muted/30 focus-within:border-primary min-w-0">
                    <span className="flex items-center px-1.5 py-1.5 text-[9px] font-bold text-muted-foreground bg-muted/50 border-r-2 border-border shrink-0 pointer-events-none">
                      https://
                    </span>
                    <input
                      ref={linkInputRef}
                      type="text"
                      value={linkInput}
                      onChange={(e) =>
                        setLinkInput(normalizeLinkInput(e.target.value))
                      }
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = (
                          e.clipboardData.getData("text/plain") ?? ""
                        )
                          .replace(/^https?:\/\//i, "")
                          .trim();
                        setLinkInput((prev) =>
                          normalizeLinkInput(prev + pasted),
                        );
                      }}
                      placeholder="example.com"
                      className="flex-1 min-w-0 px-1.5 py-1.5 text-xs bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyLink();
                        }
                        if (e.key === "Escape") {
                          setLinkMode(false);
                          setLinkInput("");
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyLink}
                    className="shrink-0 h-7 px-2 border-2 border-primary bg-primary text-primary-foreground font-bold text-[9px] uppercase tracking-wider hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    title="Insert link"
                    aria-label="Insert link"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
                    Format
                  </span>
                  <button
                    type="button"
                    onClick={() => applyFormat("bold")}
                    className={toggleBtn(formatState.bold)}
                    title="Bold"
                    aria-label="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("italic")}
                    className={toggleBtn(formatState.italic)}
                    title="Italic"
                    aria-label="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormat("underline")}
                    className={toggleBtn(formatState.underline)}
                    title="Underline"
                    aria-label="Underline"
                  >
                    <UnderlineIcon className="h-3.5 w-3.5" />
                  </button>
                  <span
                    className="w-px h-5 bg-border mx-0.5 shrink-0"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLinkMode(true);
                      setLinkInput("");
                    }}
                    className="p-1.5 border-2 border-border hover:bg-muted/50 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    title="Link"
                    aria-label="Link"
                  >
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
export function resolveCentreMaxWidthClass(
  leftSidebarOpen: boolean,
  rightSidebarOpen: boolean,
): string {
  if (leftSidebarOpen && rightSidebarOpen) return "max-w-3xl";
  if (leftSidebarOpen || rightSidebarOpen) return "max-w-5xl";
  return "max-w-7xl";
}
export type BlogWriteSyncRefs = {
  latestForSyncRef: {
    current: {
      title: string;
      summary: string;
      blocks: Block[];
      thumbnailPreviewUrl: string | null;
    };
  };
  tokenRef: {
    current: string | null | undefined;
  };
  skipNextPopStateRef: {
    current: boolean;
  };
};
export type BlogWritePageSyncEffectsInput = Readonly<{
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
export function useBlogWritePageSyncEffects(
  input: BlogWritePageSyncEffectsInput,
): void {
  const {
    title,
    blocks,
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
      setDraftSyncStatus("offline");
      return;
    }
    if (draftSyncStatus === "idle") setDraftSyncStatus("local");
    if (draftSyncStatus === "synced") setDraftSyncStatus("local");
  }, [title, blocks, draftSyncStatus, isOnline, setDraftSyncStatus]);
  useEffect(() => {
    setIsOnline(globalThis.navigator?.onLine ?? true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      const { title: t, blocks: b } = latestForSyncRef.current;
      if (t.trim() || b.length > 0) setDraftSyncStatus("offline");
    };
    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);
    return () => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
    };
  }, [latestForSyncRef, setDraftSyncStatus, setIsOnline]);
  useEffect(() => {
    if (isDirty && !hadDirtyHistoryGuard.current) {
      hadDirtyHistoryGuard.current = true;
      history.pushState({ blogWriteGuard: true }, location.href);
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
    globalThis.addEventListener("popstate", onPopState);
    return () => globalThis.removeEventListener("popstate", onPopState);
  }, [skipNextPopStateRef, setLeaveConfirmOpen, isDirty]);
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    globalThis.addEventListener("beforeunload", onBeforeUnload);
    return () => globalThis.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      void syncDraftToServer();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [syncDraftToServer]);
  useEffect(() => {
    const handleOnline = () => {
      const { title: t, blocks: b } = latestForSyncRef.current;
      if ((t.trim() || b.length > 0) && tokenRef.current)
        void syncDraftToServer();
    };
    globalThis.addEventListener("online", handleOnline);
    return () => globalThis.removeEventListener("online", handleOnline);
  }, [latestForSyncRef, syncDraftToServer, tokenRef]);
}
export function taxonomyApiFields(t: BlogPublishTaxonomy): {
  category: string;
  tags: string[];
  language: string;
} {
  const cat = t.category
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^\w-]/g, "")
    .slice(0, 48);
  return {
    category: cat,
    tags: t.tags.slice(0, 20),
    language:
      (t.language || "en")
        .toLowerCase()
        .replaceAll(/[^a-z-]/g, "")
        .slice(0, 12) || "en",
  };
}
export function taxonomyPayload(t: BlogPublishTaxonomy): {
  category: string;
  tags: string[];
  language: string;
} {
  const tf = taxonomyApiFields(t);
  return {
    category: tf.category || "",
    tags: tf.tags.length ? tf.tags : [],
    language: tf.language,
  };
}
export async function runBlogWriteSubmit(
  args: Readonly<{
    status: "draft" | "published";
    token: string;
    title: string;
    summary: string;
    blocks: Block[];
    thumbnailFile: File | null;
    thumbnailPreviewUrl: string | null;
    clearThumbnail: () => void;
    activePostId: string | null;
    setActivePostId: React.Dispatch<React.SetStateAction<string | null>>;
    setLoadedPostStatus: React.Dispatch<
      React.SetStateAction<"draft" | "published" | null>
    >;
    setDraftSyncStatus: React.Dispatch<React.SetStateAction<DraftSyncUi>>;
    setTitle: React.Dispatch<React.SetStateAction<string>>;
    setSummary: React.Dispatch<React.SetStateAction<string>>;
    setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
    taxonomy?: BlogPublishTaxonomy | null;
    squadMongoId?: string | null;
  }>,
): Promise<void> {
  const {
    status,
    token,
    title,
    summary,
    blocks,
    thumbnailFile,
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
    squadMongoId,
  } = args;
  const squadBody =
    typeof squadMongoId === "string" && squadMongoId.trim()
      ? { squadId: squadMongoId.trim() }
      : {};
  const content = JSON.stringify(stripLegacyGifBlocks(blocks));
  const summaryToSend =
    summary && summary !== "<br>" && summaryWordCount(summary) > 0
      ? summary.trim()
      : undefined;
  const taxBody = taxonomy == null ? {} : taxonomyPayload(taxonomy);
  if (status === "draft") {
    const thumbRemote = pickRemoteThumbnailForApi(thumbnailPreviewUrl);
    if (activePostId) {
      const { post, forkedFromPublished } = await blogApi.updatePost(
        activePostId,
        {
          title: title.trim() || "Untitled draft",
          summary: summaryToSend,
          content,
          thumbnailUrl: thumbRemote,
          status: "draft",
          ...taxBody,
          ...squadBody,
        },
        token,
      );
      setActivePostId(post._id);
      setLoadedPostStatus("draft");
      setWriteEditorSessionPostId(post._id);
      if (forkedFromPublished) {
        toast.success(
          "New draft saved — published post unchanged on the site.",
        );
      } else {
        toast.success("DRAFT_SYNCED");
      }
    } else {
      const { post } = await blogApi.saveDraft(
        {
          title: title.trim() || "Untitled draft",
          summary: summaryToSend,
          content,
          thumbnailUrl: thumbRemote,
          ...taxBody,
          ...squadBody,
        },
        token,
      );
      setActivePostId(post._id);
      setLoadedPostStatus("draft");
      setWriteEditorSessionPostId(post._id);
      toast.success("DRAFT_SYNCED");
    }
    setDraftSyncStatus("synced");
    return;
  }
  let thumbnailUrl: string | undefined;
  if (thumbnailFile) {
    const data = await uploadCover(token, thumbnailFile, undefined, () => {});
    thumbnailUrl = data.url;
    clearThumbnail();
  } else {
    thumbnailUrl = pickRemoteThumbnailForApi(thumbnailPreviewUrl);
  }
  const publishTax = taxonomyPayload(
    taxonomy ?? { category: "", tags: [], language: "en" },
  );
  if (activePostId) {
    await blogApi.updatePost(
      activePostId,
      {
        title: title.trim(),
        summary: summaryToSend,
        content,
        thumbnailUrl,
        status: "published",
        ...publishTax,
        ...squadBody,
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
        status: "published",
        ...publishTax,
        ...squadBody,
      },
      token,
    );
  }
  toast.success("POST_LIVE");
  setWriteEditorSessionPostId(null);
  setTitle("");
  setSummary("");
  setBlocks([]);
  setActivePostId(null);
  setLoadedPostStatus(null);
  setDraftSyncStatus("idle");
}
export type BlogWriteDraftRefs = Readonly<{
  latestForSyncRef: {
    current: {
      title: string;
      summary: string;
      blocks: Block[];
      thumbnailPreviewUrl: string | null;
    };
  };
  tokenRef: {
    current: string | null | undefined;
  };
  squadMongoIdRef: {
    current: string | null;
  };
}>;
export type BlogWriteDraftHandlersInput = Readonly<{
  setDraftSyncStatus: React.Dispatch<React.SetStateAction<DraftSyncUi>>;
  setActivePostId: React.Dispatch<React.SetStateAction<string | null>>;
  setLoadedPostStatus: React.Dispatch<
    React.SetStateAction<"draft" | "published" | null>
  >;
  activePostId: string | null;
  loadedPostStatus: "draft" | "published" | null;
  refs: BlogWriteDraftRefs;
}>;
export function useBlogWriteServerDraftSync(
  input: BlogWriteDraftHandlersInput,
): {
  syncDraftToServer: () => Promise<void>;
} {
  const {
    setDraftSyncStatus,
    setActivePostId,
    setLoadedPostStatus,
    activePostId,
    loadedPostStatus,
    refs: { latestForSyncRef, tokenRef, squadMongoIdRef },
  } = input;
  const activePostIdRef = useRef(activePostId);
  const loadedPostStatusRef = useRef(loadedPostStatus);
  useEffect(() => {
    activePostIdRef.current = activePostId;
    loadedPostStatusRef.current = loadedPostStatus;
  }, [activePostId, loadedPostStatus]);
  const syncDraftToServer = useCallback((): Promise<void> => {
    if (!navigator.onLine) return Promise.resolve();
    const currentToken = tokenRef.current;
    if (!currentToken) return Promise.resolve();
    const {
      title: t,
      summary: s,
      blocks: b,
      thumbnailPreviewUrl: thumb,
    } = latestForSyncRef.current;
    if (!t.trim() && b.length === 0) return Promise.resolve();
    setDraftSyncStatus("syncing");
    const content = JSON.stringify(stripLegacyGifBlocks(b));
    const summaryToSend =
      s && s !== "<br>" && summaryWordCount(s) > 0 ? s : undefined;
    const titleSend = t.trim() || "Untitled draft";
    const thumbUrl = pickRemoteThumbnailForApi(thumb ?? null);
    const pid = activePostIdRef.current;
    const st = loadedPostStatusRef.current;
    const sq = squadMongoIdRef.current?.trim();
    const squadPayload = sq ? { squadId: sq } : {};
    const onErr = () => {
      setDraftSyncStatus("local");
    };
    if (pid) {
      const statusForApi: "draft" | "published" =
        st === "published" ? "published" : "draft";
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
            ...squadPayload,
          },
          currentToken,
        )
        .then(() => {
          setDraftSyncStatus("synced");
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
          ...squadPayload,
        },
        currentToken,
      )
      .then((res) => {
        setActivePostId(res.post._id);
        setLoadedPostStatus("draft");
        setDraftSyncStatus("synced");
      })
      .catch(() => {
        onErr();
      });
  }, [
    latestForSyncRef,
    tokenRef,
    squadMongoIdRef,
    setDraftSyncStatus,
    setActivePostId,
    setLoadedPostStatus,
  ]);
  return { syncDraftToServer };
}
export type WriteFocusChrome = "title" | "summary" | "body" | null;
export type BlogWriteTopNavProps = Readonly<{
  username: string;
  title: string;
  focusChrome: WriteFocusChrome;
  activeBodyBlock: Block | null;
  hasDraftContent: boolean;
  loadedPostStatus: "draft" | "published" | null;
  leftSidebarOpen: boolean;
  onToggleLeft: () => void;
  rightSidebarOpen: boolean;
  onToggleRight: () => void;
  draftSyncStatus: DraftSyncUi;
  currentTime: string;
}>;
export function focusContextLabel(
  chrome: WriteFocusChrome,
  bodyBlock: Block | null,
): string {
  if (chrome === "title") return "Title";
  if (chrome === "summary") return "Summary";
  if (chrome === "body" && bodyBlock)
    return blockTypeDisplayName(bodyBlock.type);
  if (chrome === "body") return "Body";
  return "—";
}
export function BlogWriteTopNav({
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
          <span className="text-primary text-[9px] font-semibold shrink-0">
            {username}
          </span>
          <ChevronRight className="h-3 w-3 opacity-30 shrink-0" />
          <span
            className="bg-muted px-2 border border-border truncate max-w-[120px] sm:max-w-[200px] md:max-w-[280px]"
            title={title.trim() || "new_entry.log"}
          >
            {title.trim()
              ? title.trim().replaceAll(/\s+/g, "_")
              : "new_entry.log"}
          </span>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 flex-col gap-0.5 border-l border-border pl-3 sm:flex">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            Active
          </span>
          <span
            className="min-w-0 truncate text-[10px] font-bold text-foreground"
            title={activeLabel}
          >
            {activeLabel}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onToggleLeft}
          className="p-1.5 border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title={leftSidebarOpen ? "Close left panel" : "Open left panel"}
          aria-label={leftSidebarOpen ? "Close left panel" : "Open left panel"}
        >
          {leftSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={onToggleRight}
          className="p-1.5 border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title={rightSidebarOpen ? "Close right panel" : "Open right panel"}
          aria-label={
            rightSidebarOpen ? "Close right panel" : "Open right panel"
          }
        >
          {rightSidebarOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRight className="h-4 w-4" />
          )}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[8px] font-medium text-muted-foreground">
            <Activity className="h-2.5 w-2.5 text-green-500 animate-pulse" />
            <span>Uptime: 99.9%</span>
          </div>
          {hasDraftContent ? (
            loadedPostStatus === "published" ? (
              <span
                className="border border-green-500/50 bg-green-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-green-800 dark:text-green-200"
                title="This post is live. Autosave updates the published version on the server."
              >
                Live
              </span>
            ) : (
              <span
                className={cn(
                  "text-[8px] font-medium px-1.5 py-0.5  border",
                  draftSyncStatus === "offline" &&
                    "text-amber-600 border-amber-500/50 bg-amber-500/10",
                  draftSyncStatus === "syncing" &&
                    "text-amber-600 border-amber-500/50 bg-amber-500/10",
                  draftSyncStatus === "local" &&
                    "text-muted-foreground border-border",
                  draftSyncStatus === "synced" &&
                    "text-green-600 border-green-500/50 bg-green-500/10",
                )}
                title={draftSyncBadgeTitle(draftSyncStatus)}
              >
                {draftSyncBadgeLabel(draftSyncStatus)}
              </span>
            )
          ) : null}
        </div>
        <div className="hidden min-w-[5.5rem] tabular-nums md:block text-[8px] font-medium text-muted-foreground">
          {currentTime || "\u00a0"}
        </div>
      </div>
    </div>
  );
}
