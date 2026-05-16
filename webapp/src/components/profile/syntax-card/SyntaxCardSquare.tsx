'use client';

import { forwardRef } from 'react';
import { resolveProfileMediaUrl } from '@/lib/resolveProfileMediaUrl';
import { SyntaxCardMiniHeatmap } from './SyntaxCardMiniHeatmap';
import type { HeatmapCell } from '@/lib/syntaxCardHeatmap';

export type SyntaxCardSquareProps = {
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
export const SyntaxCardSquare = forwardRef<HTMLDivElement, SyntaxCardSquareProps>(
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
            <div className="size-[168px] shrink-0 overflow-hidden border-4 border-black bg-white shadow-[8px_8px_0px_0px_#000]">
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
                className="border-2 border-black bg-[#f4f4f5] px-3 py-4 text-center shadow-[4px_4px_0px_0px_#000]"
              >
                <p className="text-[36px] font-black italic leading-none">{stat.value}</p>
                <p className="mt-2 text-[14px] font-black uppercase tracking-widest text-[#71717a]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-4 border-2 border-black bg-[#fef3c7] px-5 py-4 shadow-[4px_4px_0px_0px_#000]">
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
            <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000]">
              <SyntaxCardMiniHeatmap
                cells={publishHeatmapCells}
                columns={26}
                cellSize={12}
                gap={3}
                label="Blog contributions"
              />
            </div>
            <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000]">
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
