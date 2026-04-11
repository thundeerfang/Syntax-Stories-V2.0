'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Braces, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CODE_LANGUAGE_OPTIONS,
  inferCodeLanguage,
  highlightCodeToHtml,
} from '@/lib/codeHighlight';
import type { CodePayload } from '@/types/blog';
import 'highlight.js/styles/github-dark.css';

const DEBOUNCE_MS = 450;

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
  const code = typeof payload.code === 'string' ? payload.code : '';
  const storedLang = typeof payload.language === 'string' ? payload.language : 'plaintext';
  const source = payload.languageSource === 'manual' ? 'manual' : 'auto';

  const [localCode, setLocalCode] = useState(code);
  const [manualLock, setManualLock] = useState(source === 'manual');
  const [previewHtml, setPreviewHtml] = useState<string>('');
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
    (nextCode: string, lang: string, langSource: 'auto' | 'manual') => {
      onUpdate({
        ...payload,
        code: nextCode,
        language: lang,
        languageSource: langSource,
      });
    },
    [onUpdate, payload],
  );

  const runHighlightPreview = useCallback((text: string, lang: string, langSource: 'auto' | 'manual') => {
    const effectiveLang = langSource === 'manual' ? lang : inferCodeLanguage(text);
    const { language, html } = highlightCodeToHtml(text, effectiveLang);
    setPreviewLang(language);
    setPreviewHtml(html);
  }, []);

  useEffect(() => {
    runHighlightPreview(localCode, storedLang, manualLock ? 'manual' : 'auto');
  }, [localCode, storedLang, manualLock, runHighlightPreview]);

  const schedulePersist = useCallback(
    (nextCode: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const inferred = inferCodeLanguage(nextCode);
        const lang = manualLock ? storedLang : inferred;
        const src: 'auto' | 'manual' = manualLock ? 'manual' : 'auto';
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
    pushUpdate(localCode, id, 'manual');
    runHighlightPreview(localCode, id, 'manual');
  };

  const handleAutoDetect = () => {
    setManualLock(false);
    const inferred = inferCodeLanguage(localCode);
    pushUpdate(localCode, inferred, 'auto');
  };

  return (
    <div className="group border-2 border-border bg-card p-3 space-y-2 rounded-md">
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
            className="text-destructive hover:text-destructive/80 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
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
        placeholder="Paste or write code…"
        className={cn(
          'min-h-[140px] w-full resize-y border-2 border-border bg-background p-3 font-mono text-xs leading-relaxed',
          'text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary',
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="text-[10px] font-bold uppercase text-muted-foreground">
          Language
        </label>
        <select
          id={selectId}
          value={manualLock ? storedLang : '__auto__'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__auto__') {
              handleAutoDetect();
              return;
            }
            handleSelectLanguage(v);
          }}
          className="max-w-[min(100%,14rem)] border-2 border-border bg-background px-2 py-1.5 font-mono text-[11px] focus:outline-none focus:border-primary"
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
        <div className="overflow-hidden border-2 border-border bg-zinc-950">
          <div className="border-b border-zinc-800 px-2 py-1 font-mono text-[9px] uppercase text-zinc-500">
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
