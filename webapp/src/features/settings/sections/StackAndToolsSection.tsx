"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Monitor, Plus, X, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { STACK_AND_TOOLS_MAX } from "@/lib/profile/stackAndToolsLimits";
import {
  STACK_TOOL_NAME_MAX,
  STACK_TOOL_NAME_MIN,
} from "@/lib/profile/profileLinkLimits";
import { BlockShadowButton } from "@/components/ui";
import { useSettingsAuthSlice } from "@/hooks/useSettingsAuthSlice";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  preloadTechStackItems,
  resolveTechStackIconSrc,
} from "@/lib/profile/skillIcons";
import { SkillIconImage } from "@/components/ui/media";
import { searchApi, type TechStackItem } from "@/api/search";
import { useResolvedTechStack } from "@/hooks/useResolvedTechStack";
import { SEARCH_DEBOUNCE_MS } from "@contracts/searchApi";
import {
  SettingsSectionHeading,
  SettingsTabPanel,
  SettingsTabRoot,
} from "@/app/settings/settings-list/SettingsSectionHeading";
export function StackAndToolsContent() {
  const { user, updateProfile } = useSettingsAuthSlice();
  const [items, setItems] = useState<string[]>(() =>
    (user?.stackAndTools ?? []).slice(0, STACK_AND_TOOLS_MAX),
  );
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<TechStackItem[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [knownItems, setKnownItems] = useState<Map<string, TechStackItem>>(
    () => new Map(),
  );
  const searchCacheRef = useRef(new Map<string, TechStackItem[]>());
  const baseline = (user?.stackAndTools ?? []).slice(0, STACK_AND_TOOLS_MAX);
  const itemsMatchBaseline = JSON.stringify(items) === JSON.stringify(baseline);
  const serverDisplay = itemsMatchBaseline
    ? user?.stackAndToolsDisplay
    : undefined;
  const resolvedItems = useResolvedTechStack(
    serverDisplay?.length ? [] : items,
  );
  const badgeItems = serverDisplay?.length ? serverDisplay : resolvedItems;
  const atMax = items.length >= STACK_AND_TOOLS_MAX;
  const showSearchDropdown = open && input.trim().length >= 2 && !atMax;
  useEffect(() => {
    setItems((user?.stackAndTools ?? []).slice(0, STACK_AND_TOOLS_MAX));
  }, [user?.stackAndTools]);
  useEffect(() => {
    const map = new Map<string, TechStackItem>();
    for (const row of user?.stackAndToolsDisplay ?? []) {
      if (row.name?.trim()) map.set(row.name.trim(), row);
    }
    setKnownItems(map);
  }, [user?.stackAndToolsDisplay]);
  useEffect(() => {
    preloadTechStackItems(badgeItems);
  }, [badgeItems]);
  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedQuery(input.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [input]);
  useEffect(() => {
    const q = debouncedQuery;
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const cacheKey = q.toLowerCase();
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      preloadTechStackItems(cached);
      setSuggestions(cached);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    void searchApi.searchTechStack(q, 12).then((list) => {
      if (cancelled) return;
      searchCacheRef.current.set(cacheKey, list);
      preloadTechStackItems(list);
      setSuggestions(list);
      setSearching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);
  const iconSrcForName = useCallback(
    (name: string, index: number) => {
      const fromBadge = badgeItems[index]?.iconUrl?.trim();
      if (fromBadge) return fromBadge;
      const known = knownItems.get(name);
      if (known) return resolveTechStackIconSrc(known);
      return resolveTechStackIconSrc({ name });
    },
    [badgeItems, knownItems],
  );
  const addByName = (name: string, meta?: TechStackItem) => {
    const trimmed = name.trim().slice(0, STACK_TOOL_NAME_MAX);
    if (!trimmed) {
      setInput("");
      setOpen(false);
      setHighlight(0);
      return;
    }
    if (items.length >= STACK_AND_TOOLS_MAX) {
      toast.error(
        `You can add up to ${STACK_AND_TOOLS_MAX} languages and tools.`,
      );
      return;
    }
    if (items.includes(trimmed)) {
      setInput("");
      setOpen(false);
      setHighlight(0);
      return;
    }
    setItems([...items, trimmed]);
    if (meta) {
      setKnownItems((prev) => {
        const next = new Map(prev);
        next.set(trimmed, meta);
        return next;
      });
      preloadTechStackItems([meta]);
    } else {
      preloadTechStackItems([{ name: trimmed }]);
    }
    toast.success(`${trimmed} added to arsenal.`);
    setInput("");
    setOpen(false);
    setHighlight(0);
  };
  const selectSuggestion = (item: TechStackItem) => {
    addByName(item.name, item);
  };
  const handleSave = async () => {
    const baseline = (user?.stackAndTools ?? []).slice(0, STACK_AND_TOOLS_MAX);
    const next = items.slice(0, STACK_AND_TOOLS_MAX);
    if (JSON.stringify(next) === JSON.stringify(baseline)) {
      toast.error("No changes to save.", { id: "syntax-no-changes" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ stackAndTools: next }, { section: "stack" });
      toast.success("Stack & Tools Synchronized.", {
        id: "syntax-stack-success",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed.", {
        id: "syntax-stack-error",
      });
    } finally {
      setSaving(false);
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchDropdown || suggestions.length === 0) {
      if (e.key === "Enter") {
        const v = input.trim();
        if (v) addByName(v);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h < suggestions.length - 1 ? h + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h > 0 ? h - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectSuggestion(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };
  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={<Monitor strokeWidth={2.5} />}
        title="Stack & Tools"
        description={`Search and add up to ${STACK_AND_TOOLS_MAX} languages, frameworks, and tools.`}
      />

      <SettingsTabPanel>
        <div className="space-y-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Active Modules
          </h3>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {items.map((t, i) => {
                const iconUrl = iconSrcForName(t, i);
                return (
                  <motion.div
                    key={t}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      transition: { duration: 0.15 },
                    }}
                    className="group flex items-center gap-2 pl-2 pr-1 py-1 border-2 border-border bg-card shadow hover:border-primary transition-colors"
                  >
                    <div className="size-5 shrink-0 flex items-center justify-center">
                      {iconUrl ? (
                        <SkillIconImage src={iconUrl} alt={t} />
                      ) : (
                        <Monitor
                          className="size-3.5 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {t}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRemoveConfirmIndex(i)}
                      className="ml-1 p-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {items.length === 0 && (
              <div className="flex w-full flex-col items-center gap-2 border-2 border-dashed border-border bg-muted/10 px-4 py-3 text-center">
                <SearchX
                  className="size-8 shrink-0 text-muted-foreground/70"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  No modules initialized. Use the search below.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="stack-module-search"
            className="text-[10px] font-bold uppercase text-muted-foreground"
          >
            Module search
          </label>
          <div
            className={cn(
              "overflow-hidden  border-2 bg-background transition-colors",
              showSearchDropdown
                ? "border-primary ring-2 ring-primary/20"
                : "border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
            )}
          >
            <div className="group flex items-center">
              <Search
                className="ml-3 size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary"
                aria-hidden
              />
              <input
                id="stack-module-search"
                type="text"
                value={input}
                disabled={atMax}
                maxLength={STACK_TOOL_NAME_MAX}
                onChange={(e) => {
                  setInput(e.target.value.slice(0, STACK_TOOL_NAME_MAX));
                  setOpen(true);
                  setHighlight(0);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                onKeyDown={onKeyDown}
                placeholder={
                  atMax
                    ? `MAX ${STACK_AND_TOOLS_MAX} — REMOVE ONE TO ADD MORE`
                    : "e.g. React, TypeScript, Docker…"
                }
                className="min-w-0 flex-1 bg-transparent py-2.5 pl-2 pr-3 text-sm font-medium outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <AnimatePresence>
              {showSearchDropdown && (
                <motion.ul
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="max-h-72 overflow-y-auto divide-y-2 divide-border border-t-2 border-border bg-card"
                >
                  {searching ? (
                    <li className="px-4 py-4 text-center">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        Searching…
                      </p>
                    </li>
                  ) : suggestions.length === 0 ? (
                    <li className="flex flex-col items-center gap-2 px-4 py-4 text-center">
                      <SearchX
                        className="size-7 shrink-0 text-muted-foreground/70"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">
                        No matches found
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Press Enter to add &ldquo;{input.trim()}&rdquo; as a
                        custom skill
                      </p>
                    </li>
                  ) : (
                    suggestions.map((item, i) => (
                      <li key={`${item.slug}-${i}`}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSuggestion(item);
                          }}
                          onMouseEnter={() => setHighlight(i)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors group/item",
                            i === highlight
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <div
                            className={cn(
                              "size-10 p-1.5 border-2 shrink-0 bg-background",
                              i === highlight
                                ? "border-primary-foreground"
                                : "border-border",
                            )}
                          >
                            <SkillIconImage
                              src={resolveTechStackIconSrc(item)}
                              alt={item.name}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black uppercase tracking-tighter truncate">
                              {item.name}
                            </p>
                            <p
                              className={cn(
                                "text-[9px] font-bold uppercase tracking-widest",
                                i === highlight
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground",
                              )}
                            >
                              {item.category}
                            </p>
                          </div>
                          <Plus
                            className={cn(
                              "size-4 shrink-0 transition-transform",
                              i === highlight
                                ? "scale-110 rotate-0"
                                : "scale-100 opacity-0 group-hover/item:opacity-100",
                            )}
                          />
                        </button>
                      </li>
                    ))
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <p className="text-[9px] text-muted-foreground">
            {STACK_TOOL_NAME_MIN}–{STACK_TOOL_NAME_MAX} characters per skill
            (same limits as work experience skills).
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border/30 pt-3">
          <span className="inline-flex items-center gap-2 border-2 border-border bg-muted/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="text-foreground tabular-nums">{items.length}</span>
            <span aria-hidden>/</span>
            <span className="tabular-nums">{STACK_AND_TOOLS_MAX}</span>
            <span className="text-[9px] font-bold text-muted-foreground/80">
              modules
            </span>
          </span>
          <BlockShadowButton
            type="button"
            loading={saving}
            className="px-6 py-2.5 text-[11px] tracking-widest"
            onClick={handleSave}
          >
            Save changes
          </BlockShadowButton>
        </div>
      </SettingsTabPanel>

      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="DE-INITIALIZE MODULE?"
        message={`Are you sure you want to remove ${removeConfirmIndex !== null ? items[removeConfirmIndex] : ""} from your tech stack?`}
        confirmLabel="REMOVE"
        variant="danger"
        onConfirm={() => {
          if (removeConfirmIndex !== null) {
            setItems(items.filter((_, idx) => idx !== removeConfirmIndex));
            setRemoveConfirmIndex(null);
          }
        }}
      />
    </SettingsTabRoot>
  );
}
