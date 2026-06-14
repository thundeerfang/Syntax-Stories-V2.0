"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  Globe,
  Loader2,
  Code2,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { followApi } from "@/api/follow";
import { blogApi } from "@/api/blog";
import { squadsApi } from "@/api/squads";
import { useAuthStore } from "@/store/auth";
import { readFollowedCategorySlugs } from "@/lib/feeds/followedCategoriesStorage";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
import { resolveSquadIconUrl } from "@/lib/squads/squadMedia";
import { formatJoinedDate } from "@/lib/profile/profileDisplay";
import { cn } from "@/lib/core/utils";
import { Button } from "@/components/ui/button";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
} from "@/components/icons/SocialProviderIcons";
import type { BlogTaxonomyRow } from "@/types/blog";
type SyntaxCardSquad = {
  slug: string;
  name: string;
  iconUrl?: string;
};
type SyntaxCardSquareProps = {
  fullName: string;
  username: string;
  profileImg?: string;
  coverBanner?: string;
  postsCount: number;
  postsCountLabel?: string;
  respectsCount: number;
  followersCount: number;
  squads: SyntaxCardSquad[];
  categoryNames: string[];
  joinedLabel?: string;
  profileUrl?: string;
};
function SyntaxCardChip({
  label,
}: Readonly<{
  label: string;
}>) {
  const tag = `#${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <span className="inline-flex max-w-full items-center border-4 border-black bg-[#f4f4f5] px-8 py-5 text-[32px] font-black leading-none tracking-wide text-black">
      {tag}
    </span>
  );
}
function SyntaxCardSquadLogo({
  squad,
}: Readonly<{
  squad: SyntaxCardSquad;
}>) {
  return (
    <div className="size-[72px] shrink-0 overflow-hidden border-2 border-black bg-white shadow">
      <img
        src={resolveSquadIconUrl(squad.iconUrl, squad.slug)}
        alt=""
        crossOrigin="anonymous"
        className="size-full object-cover"
      />
    </div>
  );
}
const SYNTAX_CARD_PRIMARY = "#5f4fe6";
const CARD_EXPORT_WIDTH = 1080;
const CARD_EXPORT_HEIGHT = 1350;
const CARD_PREVIEW_SCALE = 420 / CARD_EXPORT_WIDTH;
const CARD_INSET_X = 48;
const CARD_COVER_HEIGHT = 420;
const CARD_AVATAR_SIZE = 252;
const MAX_CATEGORY_CHIPS = 5;
const MAX_SQUAD_LOGOS = 5;
const SHARE_PANEL_MIN_WIDTH = 340;
const shareActionButtonClass = cn(
  "flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1.5 border-2 border-border bg-card px-3 py-3",
  "text-[8px] font-black uppercase tracking-widest transition-all",
  "hover:border-primary hover:bg-muted/40 active:translate-x-0.5 active:translate-y-0.5",
  "disabled:pointer-events-none disabled:opacity-50",
);
function buildDevCardEmbedHtml(
  profileUrl: string,
  fullName: string,
  username: string,
): string {
  const safeName = fullName.replaceAll('"', "&quot;");
  return `<!-- Syntax Stories DevCard — replace IMAGE_URL with your hosted PNG -->
<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" title="${safeName} on Syntax Stories">
  <img src="IMAGE_URL" alt="${safeName} — Syntax DevCard (@${username})" width="540" height="675" style="max-width:100%;height:auto;border:0;display:block;" />
</a>`;
}
type SocialSharePlatform = "x" | "facebook" | "linkedin" | "instagram";
async function dataUrlToPngFile(
  dataUrl: string,
  filename: string,
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/png" });
}
async function tryNativeShareWithImage(
  file: File,
  text: string,
  url: string,
): Promise<"shared" | "aborted" | "unsupported"> {
  if (!navigator.share) return "unsupported";
  const payloads: ShareData[] = [
    { files: [file], text, url, title: "Syntax Stories DevCard" },
    { files: [file], text },
    { files: [file] },
  ];
  for (const payload of payloads) {
    if (navigator.canShare && !navigator.canShare(payload)) continue;
    try {
      await navigator.share(payload);
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "aborted";
    }
  }
  return "unsupported";
}
async function tryCopyImageToClipboard(file: File): Promise<boolean> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
    return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": file })]);
    return true;
  } catch {
    return false;
  }
}
function openSocialComposer(
  platform: SocialSharePlatform,
  profileUrl: string,
  shareText: string,
): void {
  const encodedUrl = encodeURIComponent(profileUrl);
  const encodedText = encodeURIComponent(shareText);
  switch (platform) {
    case "x":
      globalThis.open(
        `https://twitter.com/intent/tweet?text=${encodedText}`,
        "_blank",
        "noopener,noreferrer",
      );
      break;
    case "facebook":
      globalThis.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        "_blank",
        "noopener,noreferrer",
      );
      break;
    case "linkedin":
      globalThis.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        "_blank",
        "noopener,noreferrer",
      );
      break;
    case "instagram":
      globalThis.open(
        "https://www.instagram.com/",
        "_blank",
        "noopener,noreferrer",
      );
      break;
  }
}
function socialShareFallbackToast(
  platform: SocialSharePlatform,
  imageCopied: boolean,
): void {
  if (imageCopied) {
    toast.success("Card image copied — paste it into your post");
    return;
  }
  if (platform === "instagram") {
    toast.message("Create a post on Instagram and attach your card image");
    return;
  }
  toast.message("Composer opened — paste your card image into the post");
}
function SyntaxCardStatIcon({
  kind,
}: Readonly<{
  kind: "posts" | "respects" | "followers";
}>) {
  if (kind === "posts") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-8 shrink-0 stroke-white"
        fill="none"
        strokeWidth="2.5"
        aria-hidden
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    );
  }
  if (kind === "respects") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-8 shrink-0 fill-white"
        aria-hidden
      >
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-8 shrink-0 stroke-white"
      fill="none"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function SyntaxCardStatsRow({
  posts,
  respects,
  followers,
}: Readonly<{
  posts: string;
  respects: string;
  followers: string;
}>) {
  const items = [
    { value: posts, label: "Posts", kind: "posts" as const },
    { value: respects, label: "Respects", kind: "respects" as const },
    { value: followers, label: "Followers", kind: "followers" as const },
  ];
  return (
    <div
      className="w-full border-2 border-black shadow"
      style={{ backgroundColor: SYNTAX_CARD_PRIMARY }}
    >
      <div className="grid grid-cols-3 divide-x-2 divide-black">
        {items.map((item) => (
          <div key={item.label} className="px-4 py-5 text-center">
            <p className="text-[48px] font-black italic leading-none text-white">
              {item.value}
            </p>
            <div className="mt-2.5 flex items-center justify-center gap-2">
              <SyntaxCardStatIcon kind={item.kind} />
              <p className="text-[14px] font-black uppercase tracking-widest text-white/90">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
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
      squads,
      categoryNames,
      joinedLabel,
      profileUrl,
    },
    ref,
  ) {
    const avatarSrc = resolveProfileMediaUrl(profileImg, username);
    const coverSrc = coverBanner
      ? resolveProfileMediaUrl(coverBanner, username)
      : null;
    const postsDisplay = postsCountLabel ?? String(postsCount);
    return (
      <div
        ref={ref}
        className="grid overflow-hidden bg-white text-black"
        style={{
          width: CARD_EXPORT_WIDTH,
          height: CARD_EXPORT_HEIGHT,
          gridTemplateRows: "auto 1fr auto",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div className="shrink-0">
          <div
            className="relative w-full border-b-4 border-black"
            style={{ height: CARD_COVER_HEIGHT }}
          >
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
                  background: `linear-gradient(135deg, ${SYNTAX_CARD_PRIMARY} 0%, #18181b 100%)`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {profileUrl ? (
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute z-20 flex max-w-[calc(100%-96px)] items-center gap-3 border-4 border-black px-3 py-2.5 shadow"
                style={{
                  top: CARD_INSET_X,
                  left: CARD_INSET_X,
                  backgroundColor: SYNTAX_CARD_PRIMARY,
                }}
                aria-label={`Open profile ${profileUrl}`}
              >
                <Globe
                  className="size-8 shrink-0 text-white"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate border-2 border-white/50 bg-black/15 px-3 py-2 text-[18px] font-bold leading-none text-white">
                  {profileUrl}
                </span>
              </a>
            ) : null}

            <div
              className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2"
              style={{
                width: CARD_AVATAR_SIZE,
                height: CARD_AVATAR_SIZE,
              }}
            >
              <div className="size-full overflow-hidden border-4 border-black bg-white shadow">
                <img
                  src={avatarSrc}
                  alt=""
                  crossOrigin="anonymous"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div
            style={{
              paddingLeft: CARD_INSET_X,
              paddingRight: CARD_INSET_X,
              paddingTop: CARD_AVATAR_SIZE / 2 + 20,
            }}
          >
            <SyntaxCardStatsRow
              posts={postsDisplay}
              respects={String(respectsCount)}
              followers={String(followersCount)}
            />
          </div>
        </div>

        <div
          className="flex min-h-0 flex-col justify-evenly"
          style={{ paddingLeft: CARD_INSET_X, paddingRight: CARD_INSET_X }}
        >
          <div className="pt-6">
            <p className="truncate text-center text-[52px] font-black uppercase italic leading-none tracking-tight text-black">
              {fullName}
            </p>
            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 text-[26px] font-bold uppercase tracking-widest text-[#71717a]">
              <span>@{username}</span>
              {joinedLabel ? (
                <>
                  <span className="text-[#d4d4d8]">·</span>
                  <span className="text-[22px] tracking-[0.12em] text-[#a1a1aa]">
                    {joinedLabel}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          {categoryNames.length > 0 ? (
            <div className="py-4">
              <div className="flex flex-wrap justify-start gap-6">
                {categoryNames.map((name) => (
                  <SyntaxCardChip key={`cat-${name}`} label={name} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="border-t-2 border-[#e4e4e7] pb-10 pt-8"
          style={{ paddingLeft: CARD_INSET_X, paddingRight: CARD_INSET_X }}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {squads.map((squad) => (
                <SyntaxCardSquadLogo key={squad.slug} squad={squad} />
              ))}
            </div>
            <img
              src="/svg/logo_hori.png"
              alt="Syntax Stories"
              crossOrigin="anonymous"
              className="h-14 w-auto shrink-0 object-contain"
            />
          </div>
        </div>
      </div>
    );
  },
);
export interface SyntaxCardPanelProps {
  username: string;
  fullName: string;
  profileImg?: string;
  coverBanner?: string;
  userId?: string | null;
  enabled?: boolean;
  className?: string;
}
function formatPostsCount(count: number, capped: boolean): string {
  if (capped && count >= 50) return `${count}+`;
  return String(count);
}
async function loadFollowedCategoryNames(userId: string): Promise<string[]> {
  const slugs = readFollowedCategorySlugs(userId);
  if (!slugs.length) return [];
  const tax = await blogApi.getTaxonomy();
  const bySlug = new Map(
    (tax.categories ?? []).map(
      (c: BlogTaxonomyRow) => [c.slug.toLowerCase(), c.name] as const,
    ),
  );
  return slugs
    .slice(0, MAX_CATEGORY_CHIPS)
    .map((slug) => bySlug.get(slug.toLowerCase()) ?? slug)
    .filter(Boolean);
}
export function SyntaxCardPanel({
  username,
  fullName,
  profileImg,
  coverBanner,
  userId,
  enabled = true,
  className,
}: Readonly<SyntaxCardPanelProps>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [postsCapped, setPostsCapped] = useState(false);
  const [respectsCount, setRespectsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [squads, setSquads] = useState<SyntaxCardSquad[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [joinedLabel, setJoinedLabel] = useState("");
  const [embedCopied, setEmbedCopied] = useState(false);
  const token = useAuthStore((s) => s.token);
  const profileUrl = useMemo(() => {
    if (globalThis.window === undefined || !username) return "";
    return `${globalThis.window.location.origin}/u/${username}`;
  }, [username]);
  const embedHtml = useMemo(
    () =>
      profileUrl ? buildDevCardEmbedHtml(profileUrl, fullName, username) : "",
    [profileUrl, fullName, username],
  );
  const loadCardData = useCallback(async () => {
    if (!username.trim()) return;
    setLoading(true);
    try {
      const [profileRes, postsRes, squadsRes, categoryNamesRes] =
        await Promise.all([
          followApi.getPublicProfile(username.trim()),
          blogApi.getUserPublishedPosts(username.trim(), 50),
          token
            ? squadsApi.listMine(token).catch(() => ({ squads: [] }))
            : Promise.resolve({ squads: [] }),
          userId?.trim() && token
            ? loadFollowedCategoryNames(userId.trim()).catch(() => [])
            : Promise.resolve([]),
        ]);
      if (profileRes.success) {
        setRespectsCount(profileRes.blogRespectReceivedCount ?? 0);
        setFollowersCount(profileRes.followersCount ?? 0);
        setJoinedLabel(formatJoinedDate(profileRes.user?.createdAt));
      }
      const posts = postsRes.posts ?? [];
      setPostsCount(posts.length);
      setPostsCapped(posts.length >= 50);
      setSquads(
        (squadsRes.squads ?? []).slice(0, MAX_SQUAD_LOGOS).map((s) => ({
          slug: s.slug,
          name: s.name,
          iconUrl: s.iconUrl,
        })),
      );
      setCategoryNames(categoryNamesRes);
    } catch {
      toast.error("Could not load Syntax Card data");
    } finally {
      setLoading(false);
    }
  }, [username, token, userId]);
  useEffect(() => {
    if (!enabled) return;
    void loadCardData();
  }, [enabled, loadCardData]);
  const exportCardPng = useCallback(async (): Promise<string | null> => {
    const node = cardRef.current;
    if (!node) return null;
    setExporting(true);
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: CARD_EXPORT_WIDTH,
        height: CARD_EXPORT_HEIGHT,
      });
      return dataUrl;
    } catch {
      toast.error("Could not generate card image");
      return null;
    } finally {
      setExporting(false);
    }
  }, []);
  const downloadCard = useCallback(async () => {
    const dataUrl = await exportCardPng();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `syntax-card-${username}.png`;
    link.href = dataUrl;
    link.click();
    toast.success("Syntax Card saved — share it on social");
  }, [exportCardPng, username]);
  const shareToSocial = useCallback(
    async (platform: SocialSharePlatform) => {
      const dataUrl = await exportCardPng();
      if (!dataUrl) return;
      const shareText = `My Syntax Stories dev card 🔥\n${profileUrl}`;
      const file = await dataUrlToPngFile(
        dataUrl,
        `syntax-card-${username}.png`,
      );
      const nativeResult = await tryNativeShareWithImage(
        file,
        shareText,
        profileUrl,
      );
      if (nativeResult === "shared" || nativeResult === "aborted") return;
      const imageCopied = await tryCopyImageToClipboard(file);
      openSocialComposer(platform, profileUrl, shareText);
      socialShareFallbackToast(platform, imageCopied);
    },
    [exportCardPng, profileUrl, username],
  );
  const copyEmbedCode = useCallback(async () => {
    if (!embedHtml) return;
    try {
      await navigator.clipboard.writeText(embedHtml);
      setEmbedCopied(true);
      toast.success(
        "Embed HTML copied — replace IMAGE_URL with your hosted PNG",
      );
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      toast.error("Could not copy embed code");
    }
  }, [embedHtml]);
  return (
    <div
      className={cn(
        "grid w-full min-h-0 grid-cols-1 gap-5 md:grid-cols-[minmax(0,420px)_1fr_minmax(340px,380px)] md:items-start md:gap-8",
        className,
      )}
    >
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] shrink-0 overflow-hidden border-4 border-border bg-muted/20 shadow md:mx-0">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-widest">
              Building card…
            </span>
          </div>
        ) : (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `scale(${CARD_PREVIEW_SCALE})`,
              width: CARD_EXPORT_WIDTH,
              height: CARD_EXPORT_HEIGHT,
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
              squads={squads}
              categoryNames={categoryNames}
              joinedLabel={joinedLabel}
              profileUrl={profileUrl}
            />
          </div>
        )}
      </div>

      <div
        className="flex w-full min-w-0 flex-col gap-4 md:col-start-3 md:w-full md:pt-2"
        style={{ minWidth: SHARE_PANEL_MIN_WIDTH }}
      >
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Code2 className="size-3.5" /> Embed
          </p>
          <div className="flex items-center gap-2">
            <textarea
              readOnly
              rows={3}
              value={embedHtml}
              aria-label="Embed HTML"
              className="min-h-0 min-w-0 flex-1 resize-none border-2 border-border bg-muted/50 px-3 py-2.5 text-[10px] font-mono leading-relaxed text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => void copyEmbedCode()}
              disabled={!embedHtml || loading || exporting}
              aria-label="Copy embed code"
              className={cn(
                "flex size-10 shrink-0 items-center justify-center border-2 border-border transition-all",
                embedCopied
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground hover:bg-muted shadow active:shadow-none active:translate-x-0.5 active:translate-y-0.5",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {embedCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Share2 className="size-3.5" /> Share your card
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void shareToSocial("x")}
              disabled={loading || exporting}
              className={cn(shareActionButtonClass, "min-w-[calc(50%-4px)]")}
            >
              <XIcon className="size-5 text-foreground" />X / Twitter
            </button>
            <button
              type="button"
              onClick={() => void shareToSocial("facebook")}
              disabled={loading || exporting}
              className={cn(shareActionButtonClass, "min-w-[calc(50%-4px)]")}
            >
              <FacebookIcon className="size-5" />
              Facebook
            </button>
            <button
              type="button"
              onClick={() => void shareToSocial("instagram")}
              disabled={loading || exporting}
              className={cn(shareActionButtonClass, "min-w-[calc(50%-4px)]")}
            >
              <InstagramIcon className="size-5 text-[#E4405F]" />
              Instagram
            </button>
            <button
              type="button"
              onClick={() => void shareToSocial("linkedin")}
              disabled={loading || exporting}
              className={cn(shareActionButtonClass, "min-w-[calc(50%-4px)]")}
            >
              <LinkedinIcon className="size-5 text-[#0A66C2]" />
              LinkedIn
            </button>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          className="w-full"
          loading={exporting}
          disabled={loading || exporting}
          onClick={() => void downloadCard()}
        >
          <Download className="size-4" />
          Download PNG
        </Button>
      </div>
    </div>
  );
}
