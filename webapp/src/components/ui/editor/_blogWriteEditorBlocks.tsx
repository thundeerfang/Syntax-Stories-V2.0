"use client";
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  AtSign,
  Braces,
  Eye,
  Grid3x3,
  Info,
  Keyboard,
  Link2,
  List,
  Network,
  Save,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { MAX_COLS, MAX_ROWS, TableVisualGrid } from "@/components/blog";
import { Dialog, DIALOG_FOOTER_ACTIONS_CLASS } from "../dialog/dialogs";
import {
  CODE_LANGUAGE_OPTIONS,
  highlightCodeToHtml,
  inferCodeLanguage,
} from "@/lib/blog/codeHighlight";
import { MermaidBlockDisplay } from "@/components/ui/MermaidBlockDisplay";
import { validateMermaidSource } from "@/lib/blog/mermaidValidate";
import {
  clampTableMatrix,
  MAX_TABLE_CELL_CHARS,
  tableEffectiveColCount,
  tableHasContent,
} from "@/lib/blog/tableBlockLimits";
import { cn } from "@/lib/core/utils";
import type {
  CodePayload,
  MermaidDiagramPayload,
  TablePayload,
} from "@/types/blog";
import "highlight.js/styles/github-dark.css";
interface TableBlockHelpDialogProps {
  open: boolean;
  onClose: () => void;
}
function TableBlockHelpDialog({
  open,
  onClose,
}: Readonly<TableBlockHelpDialogProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="table-block-help-title"
      titleIcon={<Table2 aria-hidden />}
      title="Table block"
      description="Grid editing and limits."
      panelClassName={cn(
        "max-w-2xl max-h-[min(88vh,720px)] flex flex-col overflow-hidden",
      )}
      contentClassName="flex min-h-0 flex-1 flex-col p-6 sm:p-8"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        <div className="flex gap-2 border-2 border-border bg-muted/25 px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p>
              Use <strong className="text-foreground">Edit Grid</strong> to fill
              cells directly. Open{" "}
              <strong className="text-foreground">Preview</strong> once at least
              one cell has content.
            </p>
            <p className="font-mono text-[10px] text-foreground/85">
              Limits: {MAX_ROWS} rows · {MAX_COLS} columns ·{" "}
              {MAX_TABLE_CELL_CHARS.toLocaleString()} chars/cell
            </p>
          </div>
        </div>
      </div>

      <footer className={cn(DIALOG_FOOTER_ACTIONS_CLASS, "mt-5 space-y-0")}>
        <button
          type="button"
          onClick={onClose}
          className="w-full border-2 border-black bg-primary py-2.5 text-sm font-black uppercase text-primary-foreground shadow hover:brightness-110 active:translate-x-px active:translate-y-px active:shadow-none"
        >
          Got it
        </button>
      </footer>
    </Dialog>
  );
}
export interface ParagraphBlockHelpDialogProps {
  open: boolean;
  onClose: () => void;
}
function Section({
  icon: Icon,
  title,
  children,
}: Readonly<{
  icon: ComponentType<{
    className?: string;
  }>;
  title: string;
  children: ReactNode;
}>) {
  return (
    <section className="mt-4 border-t border-border/40 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground mb-2">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        {title}
      </h3>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}
export function ParagraphBlockHelpDialog({
  open,
  onClose,
}: Readonly<ParagraphBlockHelpDialogProps>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="paragraph-help-dialog-title"
      titleIcon={<Type aria-hidden />}
      title="Paragraph block"
      description="How to use this editor."
      panelClassName={cn(
        "max-w-2xl max-h-[85vh] flex flex-col overflow-hidden",
      )}
      contentClassName="flex min-h-0 flex-1 flex-col p-0"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-6">
        <Section icon={Keyboard} title="Line breaks & paragraphs">
          <p>
            Press{" "}
            <kbd className="px-1 py-0.5 border border-border bg-muted font-mono text-[10px]">
              Enter
            </kbd>{" "}
            to start a new paragraph or a new list item when you are inside a
            list.
          </p>
          <p>
            Extra blank lines are normalized: you will not stack many empty
            rows—only one empty line is kept at a time in most cases.
          </p>
        </Section>

        <Section icon={List} title="Lists">
          <p>
            Start a line with{" "}
            <code className="text-[11px] bg-muted px-1 py-0.5">1. </code>{" "}
            (number, dot, space) for a numbered list, or{" "}
            <code className="text-[11px] bg-muted px-1 py-0.5">- </code> for
            bullets—then keep typing.
          </p>
          <p>
            When the list keeps going with the next number or bullet, press{" "}
            <kbd className="px-1 py-0.5 border border-border bg-muted font-mono text-[10px]">
              Enter
            </kbd>{" "}
            to stop that and return to normal paragraphs—often on an empty line
            at the end of the list, or press Enter again if a new empty list row
            appears first.
          </p>
          <p>
            <kbd className="px-1 py-0.5 border border-border bg-muted font-mono text-[10px]">
              Backspace
            </kbd>{" "}
            at the start of an empty list line can merge or lift in some cases,
            but exiting list continuation is usually done with Enter, not
            Backspace.
          </p>
        </Section>

        <Section icon={Link2} title="Formatting & links">
          <p>
            Use the toolbar for bold, italic, underline, and links.
            Ctrl/Cmd-click a link to open it in a new tab.
          </p>
          <p>
            Pasted plain text that looks like a list (e.g. lines starting with{" "}
            <code className="text-[11px] bg-muted px-1">1.</code> or{" "}
            <code className="text-[11px] bg-muted px-1">-</code>) can turn into
            a real list automatically.
          </p>
        </Section>

        <Section icon={AtSign} title="Mentions & GIFs">
          <p>
            Use the toolbar buttons to insert a{" "}
            <strong className="text-foreground">mention</strong> or{" "}
            <strong className="text-foreground">GIF</strong>. Search picks from
            your app’s GIF search and user search.
          </p>
        </Section>

        <Section icon={Save} title="Saving">
          <p>
            Your draft saves as you edit. You do not need a separate “save
            paragraph” action for the rich text itself.
          </p>
        </Section>
      </div>
      <footer className={cn(DIALOG_FOOTER_ACTIONS_CLASS, "px-6")}>
        <button
          type="button"
          onClick={onClose}
          className="w-full border-2 border-black bg-primary py-2.5 text-sm font-black uppercase text-primary-foreground shadow hover:brightness-110 active:translate-x-px active:translate-y-px active:shadow-none"
        >
          Got it
        </button>
      </footer>
    </Dialog>
  );
}
const DEBOUNCE_MS = 450;
const CODE_INPUT_PLACEHOLDER =
  "Paste or type your snippet… Language is auto-detected; use the menu below to override.";
export function CodeBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: CodePayload;
  onUpdate: (p: CodePayload) => void;
  onRemove: () => void;
}>) {
  const code = typeof payload.code === "string" ? payload.code : "";
  const storedLang =
    typeof payload.language === "string" ? payload.language : "plaintext";
  const source = payload.languageSource === "manual" ? "manual" : "auto";
  const [localCode, setLocalCode] = useState(code);
  const [manualLock, setManualLock] = useState(source === "manual");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLang, setPreviewLang] = useState<string>(storedLang);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectId = useId();
  const languageOptions = useMemo(() => {
    const opts = [...CODE_LANGUAGE_OPTIONS];
    if (storedLang && !opts.some((o) => o.id === storedLang)) {
      opts.unshift({ id: storedLang, label: storedLang });
    }
    return opts;
  }, [storedLang]);
  useEffect(() => {
    setLocalCode(code);
  }, [code]);
  const pushUpdate = useCallback(
    (nextCode: string, lang: string, langSource: "auto" | "manual") => {
      onUpdate({
        ...payload,
        code: nextCode,
        language: lang,
        languageSource: langSource,
      });
    },
    [onUpdate, payload],
  );
  const runHighlightPreview = useCallback(
    (text: string, lang: string, langSource: "auto" | "manual") => {
      const effectiveLang =
        langSource === "manual" ? lang : inferCodeLanguage(text);
      const { language, html } = highlightCodeToHtml(text, effectiveLang);
      setPreviewLang(language);
      setPreviewHtml(html);
    },
    [],
  );
  useEffect(() => {
    runHighlightPreview(localCode, storedLang, manualLock ? "manual" : "auto");
  }, [localCode, storedLang, manualLock, runHighlightPreview]);
  const schedulePersist = useCallback(
    (nextCode: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const inferred = inferCodeLanguage(nextCode);
        const lang = manualLock ? storedLang : inferred;
        const src: "auto" | "manual" = manualLock ? "manual" : "auto";
        pushUpdate(nextCode, lang, src);
      }, DEBOUNCE_MS);
    },
    [manualLock, storedLang, pushUpdate],
  );
  const handleChange = (next: string) => {
    setLocalCode(next);
    schedulePersist(next);
  };
  const handleSelectLanguage = (id: string) => {
    setManualLock(true);
    pushUpdate(localCode, id, "manual");
    runHighlightPreview(localCode, id, "manual");
  };
  const handleAutoDetect = () => {
    setManualLock(false);
    const inferred = inferCodeLanguage(localCode);
    pushUpdate(localCode, inferred, "auto");
  };
  return (
    <div className="group border-0 bg-muted/10 p-3 space-y-2 ring-1 ring-border/35">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        <span
          className="flex items-center gap-2"
          title="Language is detected from the snippet; pick a language below to override."
        >
          <Braces className="h-3.5 w-3.5" /> Code
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            className="text-destructive hover:text-destructive/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            onClick={onRemove}
            aria-label="Remove code block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <textarea
        value={localCode}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        placeholder={CODE_INPUT_PLACEHOLDER}
        aria-label="Code snippet"
        className={cn(
          "min-h-[140px] w-full resize-y  bg-muted/25 p-3 font-mono text-xs leading-relaxed text-foreground",
          "ring-1 ring-inset ring-border/45 placeholder:text-muted-foreground placeholder:italic",
          "focus:outline-none focus:ring-2 focus:ring-primary/35 focus:ring-inset",
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={selectId}
          className="text-[10px] font-bold uppercase text-muted-foreground"
        >
          Language
        </label>
        <select
          id={selectId}
          value={manualLock ? storedLang : "__auto__"}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__auto__") {
              handleAutoDetect();
              return;
            }
            handleSelectLanguage(v);
          }}
          className="max-w-[min(100%,14rem)] border border-border/50 bg-background px-2 py-1.5 font-mono text-[11px] ring-1 ring-inset ring-border/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="__auto__">Auto-detect ({previewLang})</option>
          {languageOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {manualLock ? (
          <button
            type="button"
            onClick={handleAutoDetect}
            className="text-[10px] font-bold uppercase text-primary underline-offset-2 hover:underline"
          >
            Reset to auto
          </button>
        ) : null}
      </div>

      {localCode.trim() ? (
        <div className="overflow-hidden border border-border/60 bg-zinc-950 shadow">
          <div className="border-b border-zinc-800/80 px-2 py-1 font-mono text-[9px] uppercase text-zinc-500">
            Preview · {previewLang}
          </div>
          <pre className="m-0 max-h-48 overflow-auto whitespace-pre-wrap break-words p-2">
            <code
              className="hljs !bg-transparent font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </pre>
        </div>
      ) : null}
    </div>
  );
}
const DEFAULT = `graph TD
    A[Client App] --> B[API]
    B --> C[Database]`;
type MermaidViewTab = "edit" | "preview";
export function MermaidBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: MermaidDiagramPayload;
  onUpdate: (p: MermaidDiagramPayload) => void;
  onRemove: () => void;
}>) {
  const initial =
    typeof payload.source === "string" && payload.source.trim()
      ? payload.source
      : DEFAULT;
  const [source, setSource] = useState(initial);
  const [parseHint, setParseHint] = useState<string | null>(null);
  const [mermaidTab, setMermaidTab] = useState<MermaidViewTab>("edit");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback(
    (next: string) => {
      setSource(next);
      onUpdate({ source: next });
    },
    [onUpdate],
  );
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const t = source.trim();
    if (!t) {
      setParseHint(null);
      return;
    }
    timerRef.current = setTimeout(() => {
      void (async () => {
        const res = await validateMermaidSource(source);
        setParseHint(res.ok ? null : res.message);
      })();
    }, 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [source]);
  const canPreview = source.trim().length > 0 && !parseHint;
  useEffect(() => {
    if (!canPreview && mermaidTab === "preview") {
      setMermaidTab("edit");
    }
  }, [canPreview, mermaidTab]);
  return (
    <div className="group space-y-2 border-0 bg-muted/10 p-3 ring-1 ring-border/35">
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5" /> Mermaid diagram
        </span>
        <button
          type="button"
          className="p-1 text-destructive opacity-0 transition-opacity hover:text-destructive/80 group-hover:opacity-100"
          onClick={onRemove}
          aria-label="Remove diagram"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Mermaid editing mode"
        className="flex w-full gap-0 border-0 border-b border-border/40 bg-transparent p-0"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mermaidTab === "edit"}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-none border-0 border-b-2 px-2 py-2 text-[10px] font-black tracking-wide transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
            mermaidTab === "edit"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
          onClick={() => setMermaidTab("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mermaidTab === "preview"}
          disabled={!canPreview}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-none border-0 border-b-2 px-2 py-2 text-[10px] font-black tracking-wide transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
            !canPreview && "cursor-not-allowed opacity-45",
            mermaidTab === "preview"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
          onClick={() => canPreview && setMermaidTab("preview")}
        >
          <Eye className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          Preview
        </button>
      </div>

      {mermaidTab === "edit" ? (
        <div className="space-y-2">
          <textarea
            value={source}
            onChange={(e) => persist(e.target.value)}
            spellCheck={false}
            placeholder="graph TD ..."
            className={cn(
              "min-h-[160px] w-full resize-y border-0 bg-muted/25 p-3 font-mono text-[11px] leading-relaxed ring-1 ring-border/40",
              "text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35",
              parseHint ? "ring-destructive/50" : "",
            )}
          />
          {parseHint ? (
            <p className="border border-destructive/40 bg-destructive/5 px-2 py-1.5 font-mono text-[10px] leading-snug text-destructive">
              {parseHint}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden border-0 bg-muted/15 ring-1 ring-border/30">
          <div className="max-h-[min(52vh,360px)] overflow-auto p-2">
            <MermaidBlockDisplay source={source} quiet className="min-w-0" />
          </div>
        </div>
      )}
    </div>
  );
}
type TableViewTab = "grid" | "preview";
export function TableBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: TablePayload;
  onUpdate: (p: TablePayload) => void;
  onRemove: () => void;
}>) {
  const rows = useMemo(() => {
    const base =
      Array.isArray(payload.rows) && payload.rows.length
        ? payload.rows
        : [["Column A", "Column B"], [""]];
    return clampTableMatrix(base, MAX_ROWS, MAX_COLS, MAX_TABLE_CELL_CHARS);
  }, [payload.rows]);
  const [caption, setCaption] = useState(payload.caption ?? "");
  const [helpOpen, setHelpOpen] = useState(false);
  const [tableTab, setTableTab] = useState<TableViewTab>("grid");
  const canPreview = tableHasContent(rows);
  const previewCols = tableEffectiveColCount(rows);
  const sync = useCallback(
    (nextRows: string[][], cap?: string) => {
      const c = (cap ?? caption).trim();
      onUpdate({
        caption: c || undefined,
        rows: clampTableMatrix(
          nextRows,
          MAX_ROWS,
          MAX_COLS,
          MAX_TABLE_CELL_CHARS,
        ),
      });
    },
    [caption, onUpdate],
  );
  const limitsSummary = `Up to ${MAX_ROWS} rows · ${MAX_COLS} columns · ${MAX_TABLE_CELL_CHARS.toLocaleString()} characters per cell`;
  return (
    <div className="group space-y-3 border-0 bg-muted/10 p-3 ring-1 ring-border/35">
      <TableBlockHelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Table2 className="h-3.5 w-3.5" /> Table
        </span>
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            className="p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary"
            onClick={() => setHelpOpen(true)}
            aria-label="Table block help"
            title="Help"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="p-1 text-destructive opacity-0 transition-opacity hover:text-destructive/80 group-hover:opacity-100"
            onClick={onRemove}
            aria-label="Remove table block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <input
        type="text"
        value={caption}
        onChange={(e) => {
          const v = e.target.value;
          setCaption(v);
          onUpdate({
            rows: clampTableMatrix(
              rows,
              MAX_ROWS,
              MAX_COLS,
              MAX_TABLE_CELL_CHARS,
            ),
            caption: v.trim() || undefined,
          });
        }}
        placeholder="Optional caption (e.g. Core Differences)"
        className="w-full border-0 border-b border-border/40 bg-transparent px-0 py-1.5 font-mono text-xs focus:border-primary/50 focus:outline-none"
      />

      <div
        role="tablist"
        aria-label="Table editing mode"
        className="flex w-full gap-0 border-0 border-b border-border/40 bg-transparent p-0"
      >
        <button
          type="button"
          role="tab"
          id="table-tab-grid"
          aria-selected={tableTab === "grid"}
          aria-controls="table-panel-grid"
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-none border-0 border-b-2 px-2 py-2 text-[10px] font-black tracking-wide transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
            tableTab === "grid"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
          onClick={() => setTableTab("grid")}
        >
          <Grid3x3 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          Edit Grid
        </button>
        <button
          type="button"
          role="tab"
          id="table-tab-preview"
          aria-selected={tableTab === "preview"}
          aria-controls="table-panel-preview"
          disabled={!canPreview}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-none border-0 border-b-2 px-2 py-2 text-[10px] font-black tracking-wide transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
            !canPreview && "cursor-not-allowed opacity-45",
            tableTab === "preview"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
          onClick={() => canPreview && setTableTab("preview")}
        >
          <Eye className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          Preview
        </button>
      </div>

      <p className="border-0 bg-muted/20 px-2 py-1.5 font-mono text-[9px] leading-snug text-muted-foreground">
        {limitsSummary}
      </p>

      {tableTab === "grid" ? (
        <div
          id="table-panel-grid"
          role="tabpanel"
          aria-labelledby="table-tab-grid"
          className="space-y-2"
        >
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Edit cells below. Hover row/column headers to delete, or use + to
            add (max {MAX_ROWS}×{MAX_COLS}).
          </p>
          <div className="overflow-hidden border-0 bg-muted/15 p-2 ring-1 ring-border/30">
            <TableVisualGrid
              value={rows}
              onChange={(next) => sync(next)}
              scrollClassName="max-h-[min(52vh,360px)]"
            />
          </div>
        </div>
      ) : (
        <div
          id="table-panel-preview"
          role="tabpanel"
          aria-labelledby="table-tab-preview"
          className="space-y-2"
        >
          <div className="bg-muted/15 p-2">
            <table className="w-full table-fixed border-collapse text-left text-[11px]">
              <tbody>
                {rows.map((r, ri) => (
                  <tr
                    key={`r-${ri}`}
                    className={cn(ri === 0 && "bg-muted/40 font-bold")}
                  >
                    {Array.from({ length: previewCols }, (_, ci) => (
                      <td
                        key={`c-${ri}-${ci}`}
                        className="truncate px-2 py-2 font-mono align-top"
                        style={{ width: `${100 / previewCols}%` }}
                        title={r[ci] ?? ""}
                      >
                        {r[ci] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
