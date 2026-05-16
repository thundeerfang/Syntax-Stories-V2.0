'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookMarked,
  Tags,
  PlusSquare,
  ChevronRight,
  Settings,
  HelpCircle,
  Users,
  ChevronDown,
  Rss,
  Bookmark,
  Repeat2,
  UsersRound,
} from 'lucide-react';

import { bookmarksApi, type BookmarkGroupRow } from '@/api/bookmarks';
import { useSidebar } from '@/hooks/useSidebar';
import { SHELL_RAIL_FROST_CLASS, SHELL_RAIL_FROST_STYLE } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import { blockShadowButtonClassNames } from '@/components/ui';
import { setWriteEditorSessionPostId } from '@/lib/blog/writeBlogSession';
import { useAuthStore } from '@/store/auth';
import { getDefaultFeedId, useCustomFeedsStore } from '@/store/customFeeds';

const WRITE_NEW_POST_HREF = '/blogs/write';

/* ==========================================================================
   DATA STRUCTURES - Rich Content Arrays
   ========================================================================== */

const MAIN_NAV = [
  { href: '/', label: 'HOME FEED', icon: Home },
  { href: '/following', label: 'FOLLOWING', icon: Users },
  { href: '/bookmarks', label: 'BOOKMARKS', icon: BookMarked },
  { href: '/topics', label: 'BROWSE TOPICS', icon: Tags },
  { href: '/reposts', label: 'REPOSTS', icon: Repeat2 },
];

const RAIL_UTILITY_LINKS = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Support Center', icon: HelpCircle },
];

const SQUADS_LINKS = [{ href: '/squads', label: 'Browse squads' }] as const;

type SidebarAccordionId = 'feeds' | 'saved' | 'squads';

const SIDEBAR_ACCORDIONS = [
  { id: 'feeds' as const, title: 'Feeds', icon: Rss },
  { id: 'saved' as const, title: 'Saved blogs', icon: Bookmark },
  { id: 'squads' as const, title: 'Squads', icon: UsersRound },
];

/** Accordion panels slide up from below (not top-down height expand). */
const accordionContentMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 52;

const sidebarSpring = { type: 'spring' as const, stiffness: 320, damping: 34, mass: 0.85 };

/**
 * Frame only — no `overflow-hidden` here so the frost layer can blur (inner wrapper clips).
 * `absolute` + `top-full` anchors to `AppShellChrome` (same sticky context as the navbar).
 */
const sidebarFrameClassNames =
  'sidebar-drawer absolute left-0 top-full z-40 flex shrink-0 flex-col border-r-2 border-border';

/** `100%` = navbar block height inside the chrome wrapper; fills the viewport below the header. */
const sidebarGeometryClassNames =
  'h-[calc(100dvh-100%)] max-h-[calc(100dvh-100%)] min-h-0';

const railInnerSpring = { type: 'spring' as const, stiffness: 420, damping: 32 };

function navItemIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
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
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  open: boolean;
  onToggle: (accordionId: SidebarAccordionId) => void;
  children: ReactNode;
}>) {
  const hasEnteredRef = useRef(false);
  const skipInitialEnter = open && !hasEnteredRef.current;

  useEffect(() => {
    if (open) hasEnteredRef.current = true;
  }, [open]);

  return (
    <div className="">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={cn(
          'flex w-full items-center justify-between gap-3  border-2 border-border bg-card px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-foreground shadow transition-[transform,box-shadow] duration-150 hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
        )}
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <Icon className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform duration-200', open && 'rotate-180')}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={id}
            initial={skipInitialEnter ? false : accordionContentMotion.initial}
            animate={accordionContentMotion.animate}
            exit={accordionContentMotion.exit}
            transition={accordionContentMotion.transition}
          >
            <div className="mt-1.5 space-y-1 border-l-2 border-border pl-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccordionLink({
  href,
  label,
  pathname,
  onNavigate,
}: Readonly<{
  href: string;
  label: string;
  pathname: string;
  onNavigate: () => void;
}>) {
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex w-full min-w-0 items-center justify-between gap-2  py-2 pl-1 pr-0 text-[10px] font-black uppercase tracking-widest transition-colors',
        isActive ? 'text-primary' : 'text-foreground/75 hover:text-foreground'
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight
        className={cn('size-3 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/35')}
        strokeWidth={3}
        aria-hidden
      />
    </Link>
  );
}

function FeedsAccordionNav({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const feedParam = searchParams.get('feed');
  const feeds = useCustomFeedsStore((s) => s.feeds);
  const openNewFeedDialog = useCustomFeedsStore((s) => s.openNewFeedDialog);
  const defaultId = useMemo(() => getDefaultFeedId(feeds), [feeds]);

  const rowClass = (active: boolean) =>
    cn(
      'flex w-full min-w-0 items-center justify-between gap-2  py-2 pl-1 pr-0 text-[10px] font-black uppercase tracking-widest transition-colors',
      active ? 'text-primary' : 'text-foreground/75 hover:text-foreground',
    );

  return (
    <>
      {feeds.map((f) => {
        const active =
          pathname === '/' && (feedParam === f.id || (feedParam == null && defaultId === f.id));
        const href = `/?feed=${encodeURIComponent(f.id)}`;
        return (
          <Link key={f.id} href={href} onClick={onNavigate} className={rowClass(active)}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {f.isDefault ? (
                <span
                  className="size-2 shrink-0 border-2 border-background bg-purple-600 shadow"
                  title="Default feed"
                  aria-label="Default feed"
                />
              ) : (
                <span className="size-2 shrink-0" aria-hidden />
              )}
              {f.iconEmoji ? (
                <span className="shrink-0 text-sm normal-case font-normal" aria-hidden>
                  {f.iconEmoji}
                </span>
              ) : null}
              <span className="min-w-0 truncate normal-case tracking-normal">{f.name}</span>
            </span>
            <ChevronRight
              className={cn('size-3 shrink-0', active ? 'text-primary' : 'text-muted-foreground/35')}
              strokeWidth={3}
              aria-hidden
            />
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => {
          openNewFeedDialog();
          onNavigate();
        }}
        className={rowClass(false)}
      >
        <span className="min-w-0 flex-1 truncate text-left">New feed</span>
        <ChevronRight className="size-3 shrink-0 text-muted-foreground/35" strokeWidth={3} aria-hidden />
      </button>
    </>
  );
}

/** /bookmarks with no ?group= — matches “all”; chevron on the right like other accordion rows. */
function AllBookmarksAccordionLink({ onNavigate }: Readonly<{ onNavigate: () => void }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasGroup = Boolean(searchParams.get('group'));
  const isActive = pathname === '/bookmarks' && !hasGroup;

  return (
    <Link
      href="/bookmarks"
      onClick={onNavigate}
      className={cn(
        'flex w-full min-w-0 items-center justify-between gap-2  py-2 pl-1 pr-0 text-[10px] font-black uppercase tracking-widest transition-colors',
        isActive ? 'text-primary' : 'text-foreground/75 hover:text-foreground'
      )}
    >
      <span className="min-w-0 flex-1 truncate">All bookmarks</span>
      <ChevronRight
        className={cn('size-3 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/35')}
        strokeWidth={3}
        aria-hidden
      />
    </Link>
  );
}

function BookmarkFolderAccordionLink({
  group,
  onNavigate,
}: Readonly<{ group: BookmarkGroupRow; onNavigate: () => void }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groupParam = searchParams.get('group');
  const href = `/bookmarks?group=${encodeURIComponent(group._id)}`;
  const isActive = pathname === '/bookmarks' && groupParam === group._id;
  const count = group.bookmarkCount ?? 0;
  const countLabel = count > 99 ? '99+' : String(count);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex w-full min-w-0 items-center gap-2  py-2 pl-1 pr-0 text-[10px] font-black uppercase tracking-widest transition-colors',
        isActive ? 'text-primary' : 'text-foreground/75 hover:text-foreground'
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
          <span className="shrink-0 text-sm normal-case font-normal" aria-hidden>
            {group.emoji}
          </span>
        ) : null}
        <span className="min-w-0 truncate normal-case tracking-normal">{group.name}</span>
      </span>
      <span
        className="flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center border-2 border-border bg-muted/40 px-1.5 font-mono text-[10px] font-black tabular-nums text-foreground"
        aria-label={`${count} saved`}
      >
        {countLabel}
      </span>
      <ChevronRight
        className={cn('size-3 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/35')}
        strokeWidth={3}
        aria-hidden
      />
    </Link>
  );
}

/** Narrow icon rail — accordion icons expand sidebar + select section when tapped */
function CollapsedSidebarRail({
  pathname,
  onNavigate,
  openAccordion,
  onAccordionExpand,
}: Readonly<{
  pathname: string;
  onNavigate: () => void;
  openAccordion: SidebarAccordionId | null;
  onAccordionExpand: (id: SidebarAccordionId) => void;
}>) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center bg-transparent py-3">
      <Link
        href={WRITE_NEW_POST_HREF}
        onClick={() => {
          setWriteEditorSessionPostId(null);
          onNavigate();
        }}
        title="Create New Post"
        className={cn(
          blockShadowButtonClassNames({ variant: 'primary', size: 'sm', shadow: 'sm' }),
          'mb-2 flex size-10 shrink-0 items-center justify-center gap-0  p-0'
        )}
      >
        <PlusSquare className="size-5 shrink-0" strokeWidth={3} />
      </Link>
      <nav className="ss-scrollbar-hide flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto overscroll-contain px-1">
        {MAIN_NAV.map(({ href, label, icon: Icon }) => {
          const isActive = navItemIsActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              onClick={onNavigate}
              className="relative flex size-10 shrink-0 items-center justify-center border-0 bg-transparent p-0"
            >
              <motion.span
                layout
                transition={railInnerSpring}
                className={cn(
                  'flex items-center justify-center ',
                  isActive
                    ? 'size-8 bg-primary text-primary-foreground shadow'
                    : 'size-10 text-foreground/70 hover:bg-muted/45 hover:text-foreground'
                )}
              >
                <Icon
                  className={cn('shrink-0', isActive ? 'size-3.5' : 'size-4')}
                  strokeWidth={isActive ? 3 : 2.5}
                />
              </motion.span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-border/40 px-1 pt-2">
        {SIDEBAR_ACCORDIONS.map(({ id, title, icon: Icon }) => {
          const isActive = openAccordion === id;
          return (
            <button
              key={id}
              type="button"
              title={title}
              aria-expanded={isActive}
              aria-label={title}
              onClick={() => onAccordionExpand(id)}
              className="relative flex size-10 shrink-0 items-center justify-center border-0 bg-transparent p-0"
            >
              <motion.span
                layout
                transition={railInnerSpring}
                className={cn(
                  'flex items-center justify-center ',
                  isActive
                    ? 'size-8 bg-primary text-primary-foreground shadow'
                    : 'size-10 text-foreground/70 hover:bg-muted/45 hover:text-foreground'
                )}
              >
                <Icon
                  className={cn('shrink-0', isActive ? 'size-3.5' : 'size-4')}
                  strokeWidth={isActive ? 3 : 2.5}
                />
              </motion.span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex w-full shrink-0 flex-col items-center gap-1.5 px-1 pt-2">
        {RAIL_UTILITY_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              onClick={onNavigate}
              className="relative flex size-10 shrink-0 items-center justify-center border-0 bg-transparent p-0"
            >
              <motion.span
                layout
                transition={railInnerSpring}
                className={cn(
                  'flex items-center justify-center ',
                  isActive
                    ? 'size-8 bg-primary text-primary-foreground shadow'
                    : 'size-10 text-foreground/70 hover:bg-muted/45 hover:text-foreground'
                )}
              >
                <Icon
                  className={cn('shrink-0', isActive ? 'size-3.5' : 'size-4')}
                  strokeWidth={isActive ? 3 : 2.5}
                />
              </motion.span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   SIDEBAR DRAWER COMPONENT
   ========================================================================== */

export function SidebarDrawer() {
  const { isOpen, close, open } = useSidebar();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<SidebarAccordionId | null>('feeds');
  const [bookmarkGroups, setBookmarkGroups] = useState<BookmarkGroupRow[]>([]);

  const toggleAccordion = (id: SidebarAccordionId) => {
    setOpenAccordion((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
    return (
      <aside
        className={cn(
          sidebarFrameClassNames,
          sidebarGeometryClassNames,
          'isolate w-[52px] min-w-[52px]'
        )}
        aria-hidden
      >
        <div
          aria-hidden
          className={cn(SHELL_RAIL_FROST_CLASS, 'pointer-events-none absolute inset-0 z-0')}
          style={SHELL_RAIL_FROST_STYLE}
        />
      </aside>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
      }}
      transition={sidebarSpring}
      className={cn(sidebarFrameClassNames, sidebarGeometryClassNames, 'isolate')}
      data-sidebar-expanded={isOpen}
    >
      <div
        aria-hidden
        className={cn(SHELL_RAIL_FROST_CLASS, 'pointer-events-none absolute inset-0 z-0')}
        style={SHELL_RAIL_FROST_STYLE}
      />
      <div className="relative z-[1] flex min-h-0 h-full w-full flex-col overflow-hidden">
        {!isOpen ? (
          <CollapsedSidebarRail
            pathname={pathname}
            onNavigate={close}
            openAccordion={openAccordion}
            onAccordionExpand={(id) => {
              setOpenAccordion(id);
              open();
            }}
          />
        ) : (
          <nav className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 py-4">
            <div className="ss-scrollbar-hide min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain">
              <Link
                href={WRITE_NEW_POST_HREF}
                onClick={() => {
                  setWriteEditorSessionPostId(null);
                  close();
                }}
                className={cn(
                  blockShadowButtonClassNames({ variant: 'primary', size: 'md', fullWidth: true }),
                  'shrink-0 gap-3 '
                )}
              >
                <PlusSquare className="size-4 shrink-0" strokeWidth={3} />
                Create New Post
              </Link>

              <section>
                <ul className="space-y-1.5">
                  {MAIN_NAV.map(({ href, label, icon: Icon }) => {
                    const isActive = navItemIsActive(pathname, href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={close}
                          className={cn(
                            'group flex cursor-pointer items-center gap-3  transition-[background-color,color,box-shadow] duration-150 ease-out',
                            isActive
                              ? 'border-2 border-border bg-primary px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-primary-foreground shadow'
                              : 'border-0 bg-transparent px-3 py-2.5 text-[11px] font-black uppercase tracking-widest text-foreground/75 hover:bg-primary/[0.08] hover:text-foreground dark:hover:bg-primary/[0.12]'
                          )}
                        >
                          <Icon
                            className={cn(
                              'size-4 shrink-0',
                              isActive ? 'text-primary-foreground' : 'text-primary'
                            )}
                            strokeWidth={isActive ? 3 : 2.5}
                          />
                          <span className="min-w-0 flex-1 leading-tight">{label}</span>
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
                {SIDEBAR_ACCORDIONS.map((acc) =>
                  acc.id === 'saved' ? (
                    <SidebarAccordion
                      key="saved"
                      id="saved"
                      title={acc.title}
                      icon={acc.icon}
                      open={openAccordion === 'saved'}
                      onToggle={toggleAccordion}
                    >
                      <Suspense fallback={null}>
                        {bookmarkGroups.map((g) => (
                          <BookmarkFolderAccordionLink key={g._id} group={g} onNavigate={close} />
                        ))}
                        <AllBookmarksAccordionLink onNavigate={close} />
                      </Suspense>
                    </SidebarAccordion>
                  ) : acc.id === 'feeds' ? (
                    <SidebarAccordion
                      key="feeds"
                      id="feeds"
                      title={acc.title}
                      icon={acc.icon}
                      open={openAccordion === 'feeds'}
                      onToggle={toggleAccordion}
                    >
                      <Suspense fallback={null}>
                        <FeedsAccordionNav onNavigate={close} />
                      </Suspense>
                    </SidebarAccordion>
                  ) : (
                    <SidebarAccordion
                      key={acc.id}
                      id={acc.id}
                      title={acc.title}
                      icon={acc.icon}
                      open={openAccordion === acc.id}
                      onToggle={toggleAccordion}
                    >
                      {SQUADS_LINKS.map(({ href, label }) => (
                        <AccordionLink
                          key={href + label}
                          href={href}
                          label={label}
                          pathname={pathname}
                          onNavigate={close}
                        />
                      ))}
                    </SidebarAccordion>
                  )
                )}
              </section>
            </div>

            <section className="mt-auto shrink-0 space-y-2 border-t border-primary/15 pt-6 dark:border-primary/25">
              <Link
                href="/settings"
                onClick={close}
                className="flex cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-2 text-[10px] font-black uppercase text-muted-foreground transition-colors hover:bg-primary/[0.1] hover:text-primary dark:hover:bg-primary/[0.14]"
              >
                <Settings className="size-3.5 shrink-0" /> Settings
              </Link>
              <Link
                href="/help"
                onClick={close}
                className="flex cursor-pointer items-center gap-3 border-0 bg-transparent px-3 py-2 text-[10px] font-black uppercase text-muted-foreground transition-colors hover:bg-primary/[0.1] hover:text-primary dark:hover:bg-primary/[0.14]"
              >
                <HelpCircle className="size-3.5 shrink-0" /> Support Center
              </Link>
            </section>
          </nav>
        )}
      </div>
    </motion.aside>
  );
}
