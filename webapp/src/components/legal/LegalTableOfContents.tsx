"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTree } from "lucide-react";
import {
  LEGAL_RETRO_ICON_TILE_TOC,
  LEGAL_TOC_LINK,
  LEGAL_TOC_LIST,
  LEGAL_TOC_NAV_PAD,
  LEGAL_TOC_STRIP,
  LEGAL_TOC_SUB,
  LEGAL_TOC_TITLE,
} from "./legalUi";
export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};
function slugify(raw: string, used: Set<string>): string {
  let base = raw
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) base = "section";
  let id = base;
  let n = 0;
  while (used.has(id)) {
    n += 1;
    id = `${base}-${n}`;
  }
  used.add(id);
  return id;
}
function scanToc(): TocItem[] {
  const root = document.getElementById("legal-policy-body");
  if (!root) return [];
  const used = new Set<string>();
  const items: TocItem[] = [];
  root.querySelectorAll("h2, h3").forEach((el) => {
    const level = el.tagName === "H2" ? 2 : 3;
    const text = (el.textContent ?? "").trim();
    if (!text) return;
    let id = el.id;
    if (!id) {
      id = slugify(text, used);
      el.id = id;
    } else {
      used.add(id);
    }
    items.push({ id, text, level });
  });
  return items;
}
function useLegalPolicyToc(): TocItem[] {
  const pathname = usePathname();
  const [items, setItems] = useState<TocItem[]>([]);
  const refresh = useCallback(() => {
    setItems(scanToc());
  }, []);
  useEffect(() => {
    refresh();
    const root = document.getElementById("legal-policy-body");
    if (!root) return undefined;
    const obs = new MutationObserver(() => refresh());
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [pathname, refresh]);
  return items;
}
function TocNavList({
  items,
  onNavigate,
}: {
  items: TocItem[];
  onNavigate?: () => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className={LEGAL_TOC_LIST}>
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`#${item.id}`}
            onClick={onNavigate}
            className={`${LEGAL_TOC_LINK} ${item.level === 3 ? "pl-4" : ""}`}
          >
            {item.text}
          </Link>
        </li>
      ))}
    </ul>
  );
}
function LegalTableOfContentsPanel() {
  const items = useLegalPolicyToc();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={LEGAL_TOC_STRIP}>
        <div className="flex items-start gap-3">
          <div className={LEGAL_RETRO_ICON_TILE_TOC}>
            <ListTree className="size-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className={LEGAL_TOC_TITLE}>On this page</p>
            <p className={LEGAL_TOC_SUB}>
              Headings from this policy become section links here.
            </p>
          </div>
        </div>
      </div>
      <nav className={LEGAL_TOC_NAV_PAD} aria-label="Table of contents">
        <TocNavList items={items} />
      </nav>
    </div>
  );
}
export function LegalTableOfContentsSidebar() {
  return <LegalTableOfContentsPanel />;
}
export function LegalTableOfContentsMobile() {
  return <LegalTableOfContentsPanel />;
}
