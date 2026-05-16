'use client';

/**
 * Syntax Card dialog (P6) — card export UI used from profile and account menu.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CreditCard, Download, Loader2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { followApi } from '@/api/follow';
import { blogApi } from '@/api/blog';
import {
  buildHeatmapCells,
  publishDaysFromPosts,
  type HeatmapCell,
} from '@/lib/profile/syntaxCardHeatmap';
import { resolveProfileMediaUrl } from '@/lib/profile/resolveProfileMediaUrl';
import { cn } from '@/lib/core/utils';
import { XIcon } from '@/components/icons/SocialProviderIcons';

const LEVEL_CLASS: Record<number, string> = {
  0: 'bg-[#e4e4e7]',
  1: 'bg-primary/25',
  2: 'bg-primary/45',
  3: 'bg-primary/70',
  4: 'bg-primary',
};

/** GitHub-style grid sized for Syntax Card export (no external calendar lib). */
function SyntaxCardMiniHeatmap({
  cells,
  columns = 26,
  cellSize = 10,
  gap = 2,
  label,
}: Readonly<{
  cells: HeatmapCell[];
  columns?: number;
  cellSize?: number;
  gap?: number;
  label?: string;
}>) {
  const rows: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    rows.push(cells.slice(i, i + columns));
  }

  return (
    <div className="w-full">
      {label ? (
        <p className="mb-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      ) : null}
      <div className="flex flex-col" style={{ gap }}>
        {rows.map((row) => (
          <div key={row[0]?.date ?? 'row'} className="flex" style={{ gap }}>
            {row.map((cell) => (
              <span
                key={cell.date}
                className={LEVEL_CLASS[cell.level] ?? LEVEL_CLASS[0]}
                style={{ width: cellSize, height: cellSize }}
                aria-hidden
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type SyntaxCardSquareProps = {
  fullName: string;
  username: string;
  profileImg?: string;
  coverBanner?: string;
  postsCount: number;
  postsCountLabel?: string;
  respectsCount: number;
  followersCount: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  streakCount: number;
  publishHeatmapCells: HeatmapCell[];
  readHeatmapCells: HeatmapCell[];
  profileUrl: string;
};

/** Fixed 1080×1080 export surface — retro Syntax Stories identity card. */
const SyntaxCardSquare = forwardRef<HTMLDivElement, SyntaxCardSquareProps>(
  function SyntaxCardSquare(
    {
      fullName,
      username,
      profileImg,
      coverBanner,
      postsCount,
      postsCountLabel,
      respectsCount,
      followersCount,
      achievementsUnlocked,
      achievementsTotal,
      streakCount,
      publishHeatmapCells,
      readHeatmapCells,
      profileUrl,
    },
    ref,
  ) {
    const avatarSrc = resolveProfileMediaUrl(profileImg, username);
    const coverSrc = coverBanner
      ? resolveProfileMediaUrl(coverBanner, username)
      : null;
    const postsDisplay = postsCountLabel ?? String(postsCount);

    const stats = [
      { label: 'Posts', value: postsDisplay },
      { label: 'Respects', value: String(respectsCount) },
      { label: 'Followers', value: String(followersCount) },
      { label: 'Achievements', value: `${achievementsUnlocked}/${achievementsTotal}` },
    ] as const;

    return (
      <div
        ref={ref}
        className="relative overflow-hidden bg-white text-black"
        style={{ width: 1080, height: 1080, fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Cover */}
        <div className="relative h-[340px] w-full border-b-4 border-black">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt=""
              crossOrigin="anonymous"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #18181b 100%)',
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 flex items-end gap-6 px-10 pb-8">
            <div className="size-[168px] shrink-0 overflow-hidden border-4 border-black bg-white shadow">
              <img
                src={avatarSrc}
                alt=""
                crossOrigin="anonymous"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 pb-2 text-white">
              <p className="truncate text-[44px] font-black uppercase italic leading-none tracking-tight">
                {fullName}
              </p>
              <p className="mt-2 text-[26px] font-bold uppercase tracking-widest text-white/80">
                @{username}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[740px] flex-col px-10 py-8">
          <div className="grid grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-2 border-black bg-[#f4f4f5] px-3 py-4 text-center shadow"
              >
                <p className="text-[36px] font-black italic leading-none">{stat.value}</p>
                <p className="mt-2 text-[14px] font-black uppercase tracking-widest text-[#71717a]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-4 border-2 border-black bg-[#fef3c7] px-5 py-4 shadow">
            <span className="text-[42px]" aria-hidden>
              🔥
            </span>
            <div>
              <p className="text-[38px] font-black italic leading-none">{streakCount}</p>
              <p className="mt-1 text-[14px] font-black uppercase tracking-widest text-[#92400e]">
                Day read streak
              </p>
            </div>
          </div>

          <div className="mt-5 grid flex-1 grid-cols-1 gap-4 min-h-0">
            <div className="border-2 border-black bg-white p-4 shadow">
              <SyntaxCardMiniHeatmap
                cells={publishHeatmapCells}
                columns={26}
                cellSize={12}
                gap={3}
                label="Blog contributions"
              />
            </div>
            <div className="border-2 border-black bg-white p-4 shadow">
              <SyntaxCardMiniHeatmap
                cells={readHeatmapCells}
                columns={26}
                cellSize={12}
                gap={3}
                label="Reading activity"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t-4 border-dashed border-black pt-5">
            <div>
              <p className="text-[16px] font-black uppercase tracking-[0.2em] text-[#71717a]">
                Syntax Stories
              </p>
              <p className="mt-1 max-w-[620px] truncate text-[13px] font-bold text-[#52525b]">{profileUrl}</p>
            </div>
            <img
              src="/svg/logo_hori.png"
              alt="Syntax Stories"
              crossOrigin="anonymous"
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    );
  },
);

const ACHIEVEMENTS_TOTAL = 56;
const CARD_EXPORT_WIDTH = 1080;
/** ~3 months of cells (26 cols × 3 rows) — readable on the square card. */
const CARD_HEATMAP_DAYS = 78;

export interface SyntaxCardDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
  fullName: string;
  profileImg?: string;
  coverBanner?: string;
}

function formatPostsCount(count: number, capped: boolean): string {
  if (capped && count >= 50) return `${count}+`;
  return String(count);
}

function FacebookShareGlyph() {
  return <span className="text-[11px] font-black uppercase text-[#1877F2]">f</span>;
}

function InstagramShareGlyph() {
  return (
    <span className="text-[10px] font-black uppercase bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
      IG
    </span>
  );
}

export function SyntaxCardDialog({
  open,
  onClose,
  username,
  fullName,
  profileImg,
  coverBanner,
}: Readonly<SyntaxCardDialogProps>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [postsCapped, setPostsCapped] = useState(false);
  const [respectsCount, setRespectsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [publishHeatmapCells, setPublishHeatmapCells] = useState(buildHeatmapCells([], CARD_HEATMAP_DAYS));
  const [readHeatmapCells, setReadHeatmapCells] = useState(buildHeatmapCells([], CARD_HEATMAP_DAYS));

  const profileUrl = useMemo(() => {
    if (globalThis.window === undefined || !username) return '';
    return `${globalThis.window.location.origin}/u/${username}`;
  }, [username]);

  const loadCardData = useCallback(async () => {
    if (!username.trim()) return;
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        followApi.getPublicProfile(username.trim()),
        blogApi.getUserPublishedPosts(username.trim(), 50),
      ]);

      if (profileRes.success) {
        setRespectsCount(profileRes.blogRespectReceivedCount ?? 0);
        setFollowersCount(profileRes.followersCount ?? 0);
        setStreakCount(profileRes.readStreak?.current ?? 0);
        setReadHeatmapCells(buildHeatmapCells(profileRes.readHeatmapDays, CARD_HEATMAP_DAYS));
      }

      const posts = postsRes.posts ?? [];
      setPostsCount(posts.length);
      setPostsCapped(posts.length >= 50);
      setPublishHeatmapCells(buildHeatmapCells(publishDaysFromPosts(posts), CARD_HEATMAP_DAYS));
    } catch {
      toast.error('Could not load Syntax Card data');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!open) return;
    void loadCardData();
  }, [open, loadCardData]);

  const exportCardPng = useCallback(async (): Promise<string | null> => {
    const node = cardRef.current;
    if (!node) return null;
    setExporting(true);
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: CARD_EXPORT_WIDTH,
        height: CARD_EXPORT_WIDTH,
      });
      return dataUrl;
    } catch {
      toast.error('Could not generate card image');
      return null;
    } finally {
      setExporting(false);
    }
  }, []);

  const downloadCard = useCallback(async () => {
    const dataUrl = await exportCardPng();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `syntax-card-${username}.png`;
    link.href = dataUrl;
    link.click();
    toast.success('Syntax Card saved — share it on social');
  }, [exportCardPng, username]);

  const shareToX = useCallback(async () => {
    const dataUrl = await exportCardPng();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `syntax-card-${username}.png`;
    link.href = dataUrl;
    link.click();
    const text = encodeURIComponent(`My Syntax Stories dev card 🔥\n${profileUrl}`);
    globalThis.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  }, [exportCardPng, profileUrl, username]);

  const shareToFacebook = useCallback(() => {
    const url = encodeURIComponent(profileUrl);
    globalThis.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, [profileUrl]);

  const handleShareInstagram = useCallback(() => {
    void downloadCard();
    toast.message('Download the PNG, then upload it in the Instagram app');
  }, [downloadCard]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Syntax Card"
      titleIcon={<CreditCard />}
      description="Your square dev identity card — download or share on social."
      panelClassName="pointer-events-auto w-full max-w-2xl max-h-[92vh] overflow-hidden border-4 border-border bg-card shadow"
      contentClassName="relative flex min-h-0 flex-col gap-5 overflow-y-auto p-5 sm:p-6"
    >
      <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden border-4 border-border bg-muted/20 shadow">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Building card…</span>
          </div>
        ) : (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: 'scale(0.3888888889)',
              width: CARD_EXPORT_WIDTH,
              height: CARD_EXPORT_WIDTH,
            }}
          >
            <SyntaxCardSquare
              ref={cardRef}
              fullName={fullName}
              username={username}
              profileImg={profileImg}
              coverBanner={coverBanner}
              postsCount={postsCount}
              postsCountLabel={formatPostsCount(postsCount, postsCapped)}
              respectsCount={respectsCount}
              followersCount={followersCount}
              achievementsUnlocked={0}
              achievementsTotal={ACHIEVEMENTS_TOTAL}
              streakCount={streakCount}
              publishHeatmapCells={publishHeatmapCells}
              readHeatmapCells={readHeatmapCells}
              profileUrl={profileUrl}
            />
          </div>
        )}
      </div>

      <div className="space-y-3 border-t-2 border-border pt-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Share2 className="size-3.5" /> Share your card
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void shareToX()}
            disabled={loading || exporting}
            className={cn(
              'flex min-w-[88px] flex-col items-center gap-1.5 border-2 border-border bg-card px-4 py-3',
              'text-[8px] font-black uppercase tracking-widest transition-all',
              'hover:border-primary hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            <XIcon className="size-5 text-foreground" />
            X / Twitter
          </button>
          <button
            type="button"
            onClick={shareToFacebook}
            disabled={loading || exporting}
            className={cn(
              'flex min-w-[88px] flex-col items-center gap-1.5 border-2 border-border bg-card px-4 py-3',
              'text-[8px] font-black uppercase tracking-widest transition-all',
              'hover:border-primary hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            <FacebookShareGlyph />
            Facebook
          </button>
          <button
            type="button"
            onClick={handleShareInstagram}
            disabled={loading || exporting}
            className={cn(
              'flex min-w-[88px] flex-col items-center gap-1.5 border-2 border-border bg-card px-4 py-3',
              'text-[8px] font-black uppercase tracking-widest transition-all',
              'hover:border-primary hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            <InstagramShareGlyph />
            Instagram
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void downloadCard()}
          disabled={loading || exporting}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-2.5',
            'text-[10px] font-black uppercase tracking-widest text-primary-foreground',
            'shadow hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download PNG
        </button>
      </div>
    </Dialog>
  );
}
