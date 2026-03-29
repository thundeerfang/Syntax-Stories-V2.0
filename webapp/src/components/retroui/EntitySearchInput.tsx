'use client';

import * as React from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { Label } from './Label';
import { cn } from '@/lib/utils';
import type { EntityOption } from '@/data/entities';
import { getLogoUrl } from '@/data/entities';

const DEBOUNCE_MS = 300;

const ENTITY_SEARCH_LISTBOX_CLASS =
  'absolute z-50 mt-1 w-full rounded-md border-2 border-border bg-card shadow-lg overflow-hidden max-h-60 overflow-y-auto';

const ENTITY_OPTION_BTN_CLASS =
  'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/50 transition-colors border-b border-border last:border-b-0';

function EntitySearchSuggestionsListbox({
  listboxId,
  children,
}: Readonly<{ listboxId: string; children: React.ReactNode }>) {
  return <ul id={listboxId} className={ENTITY_SEARCH_LISTBOX_CLASS} role="listbox">{children}</ul>; // NOSONAR S6819 S6842
}

function EntityComboboxOptionButton({
  onSelect,
  children,
}: Readonly<{ onSelect: () => void; children: React.ReactNode }>) {
  return <button type="button" role="option" aria-selected={false} onClick={onSelect} className={ENTITY_OPTION_BTN_CLASS}>{children}</button>; // NOSONAR S6819
}

export interface EntitySearchInputProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (name: string) => void;
  /** When user selects a suggestion with a domain, call this (e.g. to set companyDomain) */
  onDomainSelect?: (domain: string) => void;
  /** Sync: (query) => EntityOption[]. Async: (query) => Promise<EntityOption[]> for API-backed search. */
  searchOptions: (query: string) => EntityOption[] | Promise<EntityOption[]>;
  error?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
}

export function EntitySearchInput({
  id,
  label,
  placeholder = 'Type to search...',
  value,
  onChange,
  onDomainSelect,
  searchOptions,
  error,
  disabled = false,
  className,
  maxLength = 200,
}: Readonly<EntitySearchInputProps>) {
  const listboxId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<EntityOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const run = () => {
      const result = searchOptions(query);
      if (Array.isArray(result)) {
        setSuggestions(result);
        setLoading(false);
        return;
      }
      const id = ++requestIdRef.current;
      setLoading(true);
      result.then((list) => {
        if (requestIdRef.current === id) {
          setSuggestions(list);
          setLoading(false);
        }
      }).catch(() => {
        if (requestIdRef.current === id) setLoading(false);
      });
    };
    if (!query.trim()) {
      const emptyResult = searchOptions('');
      if (Array.isArray(emptyResult)) {
        setSuggestions(emptyResult);
        setLoading(false);
      } else {
        setLoading(true);
        emptyResult.then((list) => {
          setSuggestions(list);
          setLoading(false);
        }).catch(() => setLoading(false));
      }
      return;
    }
    debounceRef.current = setTimeout(run, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchOptions]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: EntityOption) => {
    onChange(opt.name);
    onDomainSelect?.(opt.domain);
    setOpen(false);
    setQuery('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    setQuery(v);
    setOpen(true);
  };

  const handleFocus = () => {
    setQuery(value);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className={cn('grid w-full items-center gap-1.5 min-w-0', className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'w-full rounded-md border-2 border-border bg-background px-3 py-2.5 text-sm font-medium',
            'placeholder:text-muted-foreground/70',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20'
          )}
          aria-invalid={!!error}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          role="combobox"
        />
        {open && (loading || suggestions.length > 0) && (
          <EntitySearchSuggestionsListbox listboxId={listboxId}>
            {loading && suggestions.length === 0 ? (
              <li className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground justify-center">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </li>
            ) : (
              suggestions.map((opt) => (
                <EntityOptionRow
                  key={`${opt.name}-${opt.domain}`}
                  option={opt}
                  onSelect={() => handleSelect(opt)}
                />
              ))
            )}
          </EntitySearchSuggestionsListbox>
        )}
      </div>
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

function EntityOptionRow({
  option,
  onSelect,
}: Readonly<{ option: EntityOption; onSelect: () => void }>) {
  const logoUrl = getLogoUrl(option.domain);
  const [imgError, setImgError] = React.useState(false);
  const showDefault = !logoUrl || imgError;

  return (
    <li>
      <EntityComboboxOptionButton onSelect={onSelect}>
        <span className="size-8 rounded border border-border bg-muted shrink-0 overflow-hidden flex items-center justify-center">
          {showDefault ? (
            <Building2 className="size-4 text-muted-foreground" />
          ) : (
            <img
              src={logoUrl}
              alt=""
              className="size-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
        </span>
        <span className="min-w-0 truncate">{option.name}</span>
      </EntityComboboxOptionButton>
    </li>
  );
}
