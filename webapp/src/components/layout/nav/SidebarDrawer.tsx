"use client";
import {
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PlusSquare, ChevronRight, ChevronDown } from "lucide-react";
import { bookmarksApi, type BookmarkGroupRow } from "@/api/bookmarks";
import { SidebarSkeleton } from "@/components/skeletons";
import { useSidebar } from "@/hooks/useSidebar";
import { useDesktopShell } from "@/hooks/useDesktopShell";
import { useTabletSidebarRailOnly } from "@/hooks/useTabletSidebarRailOnly";
import { SIDEBAR_NAV, type SidebarAccordionId } from "@/lib/shell/sidebarNav";
import { layout, shell } from "@/lib/styles";
import { cn } from "@/lib/core/utils";
import { BlockShadowButton } from "@/components/ui";
import { setWriteEditorSessionPostId } from "@/lib/blog/writeBlogSession";
import { useAuthStore } from "@/store/auth";
function navItemIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
function collapsedRailIconClass(isActive: boolean): string {
  return cn(
    "flex items-center justify-center transition-[background-color,color,box-shadow] duration-150",
    isActive
      ? "size-8 bg-primary text-primary-foreground shadow"
      : "size-10 text-foreground/70 hover:bg-muted/45 hover:text-foreground",
  );
}
function collapsedRailLabelClass(): string {
  return cn(
    "pointer-events-none absolute left-[calc(100%+0.35rem)] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap",
    "border-2 border-border bg-card px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-widest text-foreground shadow",
    "opacity-0 transition-opacity duration-150 group-hover/sidebar-tip:opacity-100 group-focus-visible/sidebar-tip:opacity-100 md:block xl:hidden",
  );
}
function SidebarAccordion({
  id,
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: Readonly<{
  id: SidebarAccordionId;
  title: string;
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  open: boolean;
  onToggle: (accordionId: SidebarAccordionId) => void;
  children: ReactNode;
}>) {
  return (
    <div className="">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={cn(
          "flex w-full items-center justify-between gap-3  border-2 border-border bg-card px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-foreground shadow transition-[transform,box-shadow] duration-150 hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        )}
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <Icon className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="mt-1.5 space-y-1 border-l-2 border-border pl-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
function AllBookmarksAccordionLink({
  onNavigate,
}: Readonly<{
  onNavigate: () => void;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasGroup = Boolean(searchParams.get("group"));
  const isActive = pathname === "/bookmarks" && !hasGroup;
  return (
    <Link
      href="/bookmarks"
      onClick={onNavigate}
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-2  py-2 pl-1 pr-0 text-[10px] font-black uppercase tracking-widest transition-colors",
        isActive ? "text-primary" : "text-foreground/75 hover:text-foreground",
      )}
    >
      <span className="min-w-0 flex-1 truncate">All bookmarks</span>
      <ChevronRight
        className={cn(
          "size-3 shrink-0",
          isActive ? "text-primary" : "text-muted-foreground/35",
        )}
        strokeWidth={3}
        aria-hidden
      />
    </Link>
  );
}
function BookmarkFolderAccordionLink({
  group,
  onNavigate,
}: Readonly<{
  group: BookmarkGroupRow;
  onNavigate: () => void;
}>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupParam = searchParams.get("group");
  const href = `/bookmarks?group=${encodeURIComponent(group._id)}`;
  const isActive = pathname === "/bookmarks" && groupParam === group._id;
  const count = group.bookmarkCount ?? 0;
  const countLabel = count > 99 ? "99+" : String(count);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex w-full min-w-0 items-center gap-2  py-2 pl-1 pr-0 text-[10px] font-black uppercase tracking-widest transition-colors",
        isActive ? "text-primary" : "text-foreground/75 hover:text-foreground",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {group.isDefault ? (
          <span
            className="size-2 shrink-0 border-2 border-background bg-purple-600 shadow"
            title="Default folder"
            aria-label="Default folder"
          />
        ) : (
          <span className="size-2 shrink-0" aria-hidden />
        )}
        {group.emoji ? (
          <span
            className="shrink-0 text-sm normal-case font-normal"
            aria-hidden
          >
            {group.emoji}
          </span>
        ) : null}
        <span className="min-w-0 truncate normal-case tracking-normal">
          {group.name}
        </span>
      </span>
      <span
        className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center border-2 border-border bg-muted/40 px-1.5 font-mono text-[10px] font-black tabular-nums text-foreground"
        aria-label={`${count} saved`}
      >
        {countLabel}
      </span>
      <ChevronRight
        className={cn(
          "size-3 shrink-0",
          isActive ? "text-primary" : "text-muted-foreground/35",
        )}
        strokeWidth={3}
        aria-hidden
      />
    </Link>
  );
}
function CollapsedSidebarRail({
  pathname,
  onNavigate,
  openAccordion,
  onAccordionExpand,
  hideUtilityLinks = false,
}: Readonly<{
  pathname: string;
  onNavigate: () => void;
  openAccordion: SidebarAccordionId | null;
  onAccordionExpand: (id: SidebarAccordionId) => void;
  hideUtilityLinks?: boolean;
}>) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center bg-transparent py-3">
      <BlockShadowButton
        href="/blogs/write"
        variant="primary"
        size="sm"
        shadow="sm"
        className="group/sidebar-tip relative mb-2 flex size-10 shrink-0 items-center justify-center gap-0 p-0"
        onClick={() => {
          setWriteEditorSessionPostId(null);
          onNavigate();
        }}
        title="Create New Post"
      >
        <PlusSquare className="size-5 shrink-0" strokeWidth={3} />
        <span className={collapsedRailLabelClass()}>Create New Post</span>
      </BlockShadowButton>
      <nav className="ss-scrollbar-hide flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto overscroll-contain px-1">
        {SIDEBAR_NAV.main.map(({ href, label, icon: Icon }) => {
          const isActive = navItemIsActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              onClick={onNavigate}
              className="group/sidebar-tip relative flex size-10 shrink-0 items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className={collapsedRailIconClass(isActive)}>
                <Icon
                  className={cn("shrink-0", isActive ? "size-3.5" : "size-4")}
                  strokeWidth={isActive ? 3 : 2.5}
                />
              </span>
              <span className={collapsedRailLabelClass()}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-border/40 px-1 pt-2">
        {SIDEBAR_NAV.accordions.map(({ id, title, icon: Icon }) => {
          const isActive = openAccordion === id;
          return (
            <button
              key={id}
              type="button"
              title={title}
              aria-expanded={isActive}
              aria-label={title}
              onClick={() => onAccordionExpand(id)}
              className="group/sidebar-tip relative flex size-10 shrink-0 items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className={collapsedRailIconClass(isActive)}>
                <Icon
                  className={cn("shrink-0", isActive ? "size-3.5" : "size-4")}
                  strokeWidth={isActive ? 3 : 2.5}
                />
              </span>
              <span className={collapsedRailLabelClass()}>{title}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex w-full shrink-0 flex-col items-center gap-1.5 px-1 pt-2">
        {!hideUtilityLinks
          ? SIDEBAR_NAV.utility.map(({ href, label, icon: Icon }) => {
              const isActive = navItemIsActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  onClick={onNavigate}
                  className="group/sidebar-tip relative flex size-10 shrink-0 items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className={collapsedRailIconClass(isActive)}>
                    <Icon
                      className={cn(
                        "shrink-0",
                        isActive ? "size-3.5" : "size-4",
                      )}
                      strokeWidth={isActive ? 3 : 2.5}
                    />
                  </span>
                  <span className={collapsedRailLabelClass()}>{label}</span>
                </Link>
              );
            })
          : null}
      </div>
    </div>
  );
}
export function SidebarDrawer({
  hideWhenCollapsed = false,
}: Readonly<{
  hideWhenCollapsed?: boolean;
}>) {
  const { isOpen, close, open } = useSidebar();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<SidebarAccordionId | null>(
    "saved",
  );
  const [bookmarkGroups, setBookmarkGroups] = useState<BookmarkGroupRow[]>([]);
  const desktop = useDesktopShell();
  const tabletRailOnly = useTabletSidebarRailOnly();
  const toggleAccordion = (id: SidebarAccordionId) => {
    setOpenAccordion((prev) => (prev === id ? null : id));
  };
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (tabletRailOnly && isOpen) close();
  }, [tabletRailOnly, isOpen, close]);
  useEffect(() => {
    if (!token) {
      setBookmarkGroups([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { groups } = await bookmarksApi.listGroups(token);
        if (!cancelled) setBookmarkGroups(groups);
      } catch {
        if (!cancelled) setBookmarkGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);
  if (!mounted) {
    if (hideWhenCollapsed) return null;
    return <SidebarSkeleton />;
  }
  if (hideWhenCollapsed && !isOpen) {
    return null;
  }
  return (
    <aside
      className={cn(
        layout.sidebarDrawerFrame,
        layout.sidebarDrawerGeometry,
        "isolate",
      )}
      data-sidebar-expanded={isOpen}
    >
      <div
        aria-hidden
        className={cn(
          shell.railFrost,
          "pointer-events-none absolute inset-0 z-0",
        )}
        style={shell.railFrostStyle}
      />
      <div className="relative z-[1] h-full min-h-0 w-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 flex min-h-0 flex-col",
            layout.sidebarContentPanel,
            isOpen ? "pointer-events-none opacity-0" : "opacity-100",
          )}
          aria-hidden={isOpen}
        >
          <CollapsedSidebarRail
            pathname={pathname}
            onNavigate={close}
            openAccordion={openAccordion}
            onAccordionExpand={(id) => {
              setOpenAccordion(id);
              if (!tabletRailOnly) open();
            }}
            hideUtilityLinks={desktop}
          />
        </div>
        <div
          className={cn(
            "absolute inset-0 flex min-h-0 flex-col",
            layout.sidebarContentPanel,
            isOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!isOpen}
        >
          <nav className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 py-4">
            <div className="ss-scrollbar-hide min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain">
              <BlockShadowButton
                href="/blogs/write"
                variant="primary"
                size="md"
                fullWidth
                className="shrink-0 gap-3"
                onClick={() => {
                  setWriteEditorSessionPostId(null);
                  close();
                }}
              >
                <PlusSquare className="size-4 shrink-0" strokeWidth={3} />
                Create New Post
              </BlockShadowButton>

              <section>
                <ul className="space-y-1.5">
                  {SIDEBAR_NAV.main.map(({ href, label, icon: Icon }) => {
                    const isActive = navItemIsActive(pathname, href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={close}
                          className={cn(
                            "group flex cursor-pointer items-center gap-3  transition-[background-color,color,box-shadow] duration-150 ease-out",
                            isActive
                              ? "border-2 border-border bg-primary px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-primary-foreground shadow"
                              : "border-0 bg-transparent px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-foreground/75 hover:bg-primary/[0.08] hover:text-foreground dark:hover:bg-primary/[0.12]",
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              isActive
                                ? "text-primary-foreground"
                                : "text-primary",
                            )}
                            strokeWidth={isActive ? 3 : 2.5}
                          />
                          <span className="min-w-0 flex-1 leading-tight">
                            {label}
                          </span>
                          {isActive ? (
                            <ChevronRight
                              className="size-3 shrink-0 text-primary-foreground"
                              strokeWidth={4}
                            />
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="space-y-2">
                {SIDEBAR_NAV.accordions.map((acc) => (
                  <SidebarAccordion
                    key={acc.id}
                    id={acc.id}
                    title={acc.title}
                    icon={acc.icon}
                    open={openAccordion === acc.id}
                    onToggle={toggleAccordion}
                  >
                    <Suspense fallback={null}>
                      {bookmarkGroups.map((g) => (
                        <BookmarkFolderAccordionLink
                          key={g._id}
                          group={g}
                          onNavigate={close}
                        />
                      ))}
                      <AllBookmarksAccordionLink onNavigate={close} />
                    </Suspense>
                  </SidebarAccordion>
                ))}
              </section>
            </div>

            {!desktop ? (
              <section className="mt-auto shrink-0 space-y-2 border-t border-primary/15 pt-6 dark:border-primary/25">
                {SIDEBAR_NAV.utility.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className="flex cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-2 text-[10px] font-black uppercase text-muted-foreground transition-colors hover:bg-primary/[0.1] hover:text-primary dark:hover:bg-primary/[0.14]"
                  >
                    <Icon className="size-3.5 shrink-0" /> {label}
                  </Link>
                ))}
              </section>
            ) : null}
          </nav>
        </div>
      </div>
    </aside>
  );
}
