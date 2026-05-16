'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard, Download, Loader2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { followApi } from '@/api/follow';
import { blogApi } from '@/api/blog';
import { SyntaxCardSquare } from '@/components/profile/syntax-card/SyntaxCardSquare';
import { buildHeatmapCells, publishDaysFromPosts } from '@/lib/syntaxCardHeatmap';
import { cn } from '@/lib/utils';
import { XIcon } from '@/components/icons/SocialProviderIcons';

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

  const downloadCard = async () => {
    const dataUrl = await exportCardPng();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `syntax-card-${username}.png`;
    link.href = dataUrl;
    link.click();
    toast.success('Syntax Card saved — share it on social');
  };

  const shareToX = async () => {
    const dataUrl = await exportCardPng();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `syntax-card-${username}.png`;
    link.href = dataUrl;
    link.click();
    const text = encodeURIComponent(`My Syntax Stories dev card 🔥\n${profileUrl}`);
    globalThis.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(profileUrl);
    globalThis.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const shareActions = [
    {
      key: 'x',
      label: 'X / Twitter',
      icon: XIcon,
      onClick: () => void shareToX(),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: () => (
        <span className="text-[11px] font-black uppercase text-[#1877F2]">f</span>
      ),
      onClick: shareToFacebook,
    },
    {
      key: 'instagram',
      label: 'Instagram',
      icon: () => (
        <span className="text-[10px] font-black uppercase bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
          IG
        </span>
      ),
      onClick: () => {
        void downloadCard();
        toast.message('Download the PNG, then upload it in the Instagram app');
      },
    },
  ] as const;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Syntax Card"
      titleIcon={<CreditCard />}
      description="Your square dev identity card — download or share on social."
      panelClassName="pointer-events-auto w-full max-w-2xl max-h-[92vh] overflow-hidden border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]"
      contentClassName="relative flex min-h-0 flex-col gap-5 overflow-y-auto p-5 sm:p-6"
    >
      <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden border-4 border-border bg-muted/20 shadow-[6px_6px_0px_0px_var(--border)]">
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
          {shareActions.map(({ key, label, icon: Icon, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              disabled={loading || exporting}
              className={cn(
                'flex min-w-[88px] flex-col items-center gap-1.5 border-2 border-border bg-card px-4 py-3',
                'text-[8px] font-black uppercase tracking-widest transition-all',
                'hover:border-primary hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              <Icon className="size-5 text-foreground" />
              {label}
            </button>
          ))}
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
            'shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none',
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
