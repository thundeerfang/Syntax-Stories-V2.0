'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  TrendingUp,
  Hash,
  Users,
  FolderOpen,
  Flame,
 
  Calendar,
  ArrowUpRight,
  Maximize2,
} from 'lucide-react';
import { blogApi } from '@/api/blog';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import { RichParagraphEditor } from '@/components/ui/RichParagraphEditor';
import { GithubIcon } from '@/components/icons/SocialProviderIcons';
import { cn } from '@/lib/utils';
import { summaryToPlainText } from '@/lib/summaryPlain';
import type {
  Block,
  ImageBlockLayout,
  ParagraphPayload,
  PublicBlogPostDetail,
  VideoEmbedDisplaySize,
  VideoEmbedLayoutDirection,
  VideoEmbedPayload,
} from '@/types/blog';
import { coerceParagraphDoc } from '@/types/blog';

// --- DUMMY DATA ---
const DUMMY_TRENDING = [
  { title: 'Rust async in production', reads: '12.4k' },
  { title: 'CSS container queries', reads: '9.1k' },
  { title: 'Postgres vs the world', reads: '8.2k' },
];
const DUMMY_CATEGORIES = ['Web', 'Systems', 'DevTools', 'Career', 'OSS'];
const DUMMY_SUGGESTED = [
  { name: 'Ada Lovelace', handle: 'ada', initials: 'A' },
  { name: 'Grace Hopper', handle: 'grace', initials: 'G' },
  { name: 'Margaret H.', handle: 'marg', initials: 'M' },
];
const DUMMY_TAGS = ['typescript', 'nextjs', 'mongodb', 'retro-ui', 'a11y', 'tip-tap'];

// --- HELPERS ---
function parseBlocks(content: string): Block[] {
  try {
    const p = JSON.parse(content) as unknown;
    return Array.isArray(p) ? (p as Block[]) : [];
  } catch {
    return [];
  }
}

function clampPublicVideoSize(
  count: number,
  size: VideoEmbedDisplaySize | undefined,
  layout: VideoEmbedLayoutDirection,
): VideoEmbedDisplaySize {
  if (layout === 'column') return size === 'sm' || size === 'md' || size === 'lg' ? size : 'md';
  if (count >= 3) return 'sm';
  if (count === 2) {
    if (size === 'lg') return 'md';
    const isValidSize = size === 'sm' || size === 'md' || size === 'lg';
    return isValidSize ? size : 'md';
  }
  return size === 'sm' || size === 'md' || size === 'lg' ? size : 'md';
}

function videoEmbedUrls(p: VideoEmbedPayload): string[] {
  const v = (p.videos ?? []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 3);
  if (v.length) return v;
  const legacyUrl = (p as Record<string, unknown>).url;
  const u = typeof legacyUrl === 'string' ? legacyUrl.trim() : '';
  return u ? [u] : [];
}

const imageLayoutFrame: Record<ImageBlockLayout, string> = {
  landscape: 'aspect-[16/9] w-full',
  square: 'aspect-square max-w-2xl mx-auto',
  fullWidth: 'w-full min-h-[20rem] max-h-[35rem]',
};

function paragraphPreviewCard(href: string) {
  return <LinkPreviewCardContent domain={href} />;
}

function getVideoItemWidthClass(size: VideoEmbedDisplaySize): string {
  if (size === 'sm') return 'w-full max-w-[16rem]';
  if (size === 'md') return 'w-full max-w-2xl';
  return 'w-full max-w-5xl';
}

function getCodeText(payload?: Record<string, unknown>): string {
  if (typeof payload?.code === 'string') return payload.code;
  if (typeof payload?.text === 'string') return payload.text;
  return '';
}

function ParagraphBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const p = (payload ?? {}) as ParagraphPayload;
  const doc = p.doc ?? coerceParagraphDoc(p);
  return (
    <div className="relative border-l-4 border-primary/30 pl-6 py-2">
      <RichParagraphEditor
        initialDoc={doc}
        legacyText={p.text}
        readOnly
        className="!bg-transparent !p-0 !shadow-none !border-none text-base"
        readOnlyLinkPreview={paragraphPreviewCard}
      />
    </div>
  );
}

function HeadingBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const text = (payload?.text as string) ?? '';
  const level = payload?.level === 3 ? 3 : 2;
  const Tag = level === 3 ? 'h3' : 'h2';
  return (
    <Tag className={cn(
      "font-mono font-black uppercase tracking-tight text-foreground",
      level === 3 ? "text-xl sm:text-2xl mt-10 mb-4" : "text-3xl sm:text-4xl mt-14 mb-6 border-b-2 border-border pb-2"
    )}>
      <span className="mr-2 text-primary">#</span>
      {text}
    </Tag>
  );
}

function PartitionBlock() {
  return (
    <div className="flex items-center gap-4 py-10" role="separator">
      <div className="h-[2px] flex-1 bg-border" />
      <div className="font-mono text-xs font-bold text-muted-foreground tracking-widest">SECTION_BREAK</div>
      <div className="h-[2px] flex-1 bg-border" />
    </div>
  );
}

function ImageBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const url = typeof payload?.url === 'string' ? payload.url : '';
  if (!url) return null;
  const title = (payload?.title || payload?.caption) as string;
  const layoutRaw = payload?.layout as string | undefined;
  const layout: ImageBlockLayout =
    layoutRaw === 'square' || layoutRaw === 'fullWidth' ? layoutRaw : 'landscape';
  const frame = imageLayoutFrame[layout];
  return (
    <figure className="my-10">
      <div className="border-4 border-border p-1.5 shadow-[8px_8px_0px_0px_var(--border)] bg-background">
         <div className={cn('overflow-hidden border-2 border-border', frame)}>
           <img src={url} alt={title || 'Content image'} className="h-full w-full object-cover" />
         </div>
      </div>
      {title && (
        <figcaption className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {title}
        </figcaption>
      )}
    </figure>
  );
}

function VideoEmbedBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const p = (payload ?? {}) as VideoEmbedPayload;
  const urls = videoEmbedUrls(p);
  if (urls.length === 0) return null;
  const layout: VideoEmbedLayoutDirection = p.layout === 'column' ? 'column' : 'row';
  const rawSize = p.size === 'sm' || p.size === 'md' || p.size === 'lg' ? p.size : 'md';
  const size = clampPublicVideoSize(urls.length, rawSize, layout);
  const itemW = getVideoItemWidthClass(size);

  return (
    <div
      className={cn(
        'flex gap-4 border-2 border-border bg-muted/30 p-4 shadow-[6px_6px_0_0_var(--border)] my-8',
        layout === 'row' ? 'flex-row flex-wrap justify-center' : 'flex-col items-center',
      )}
    >
      {urls.map((src) => (
        <div key={src} className={cn('overflow-hidden border-2 border-border bg-black shadow-[4px_4px_0_0_var(--border)]', itemW)}>
          <div className="aspect-video w-full">
            <iframe
              src={src}
              title="Embedded video"
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const code = getCodeText(payload);
  const lang = typeof payload?.language === 'string' ? payload.language : 'text';
  if (!code) return null;
  return (
    <div className="my-8 overflow-hidden border-2 border-border shadow-[6px_6px_0px_0px_var(--border)]">
      <div className="flex items-center justify-between border-b-2 border-border bg-zinc-900 px-4 py-2.5">
        <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider">{lang}</span>
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-none border border-zinc-700 bg-zinc-800" />
          <div className="h-2.5 w-2.5 rounded-none border border-zinc-700 bg-zinc-800" />
        </div>
      </div>
      <pre className="overflow-x-auto bg-zinc-950 p-6 text-sm leading-relaxed text-zinc-100 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function GithubRepoBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const owner = typeof payload?.owner === 'string' ? payload.owner : '';
  const repo = typeof payload?.repo === 'string' ? payload.repo : '';
  const name = typeof payload?.name === 'string' ? payload.name : repo;
  const href = (payload?.url as string) || `https://github.com/${owner}/${repo}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group my-6 flex items-center gap-5 border-2 border-border bg-card p-5 shadow-[6px_6px_0_0_var(--border)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_0_var(--border)]"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-border bg-muted group-hover:bg-primary/10">
         <GithubIcon className="h-7 w-7" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-mono text-base font-black uppercase text-foreground">{owner}/{name}</h4>
        <p className="line-clamp-1 text-sm text-muted-foreground">Repository source on GitHub</p>
      </div>
      <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
    </a>
  );
}

// --- COMPONENTS ---

function RetroPanel({ title, icon: Icon, children }: Readonly<{ title: string; icon: React.ElementType; children: React.ReactNode }>) {
  return (
    <section className="border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]">
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" strokeWidth={2.5} />
          <h2 className="font-mono text-xs font-black uppercase tracking-wider text-foreground">{title}</h2>
        </div>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 border border-border bg-background" />
          <div className="h-2 w-2 border border-border bg-background" />
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function PublicBlogBlock({ block }: Readonly<{ block: Block }>) {
  const payload = block.payload as Record<string, unknown> | undefined;

  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock payload={payload} />;
    case 'heading':
      return <HeadingBlock payload={payload} />;
    case 'partition':
      return <PartitionBlock />;
    case 'image':
    case 'unsplashImage':
      return <ImageBlock payload={payload} />;
    case 'videoEmbed':
      return <VideoEmbedBlock payload={payload} />;
    case 'code':
      return <CodeBlock payload={payload} />;
    case 'githubRepo':
      return <GithubRepoBlock payload={payload} />;
    default:
      return null;
  }
}

function BlogPublicBody({ content }: Readonly<{ content: string }>) {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {blocks.map((block) => (
        <PublicBlogBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

function DiscoverSidebar({ origin }: Readonly<{ origin: string }>) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-6" aria-label="Discover">
      <RetroPanel title="Trending" icon={Flame}>
        <div className="space-y-1">
          {DUMMY_TRENDING.map((t) => (
            <button
              key={t.title}
              className="group flex w-full items-center gap-3 border-b border-border/20 py-3 text-left hover:bg-muted last:border-0"
            >
              <TrendingUp className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1 font-mono text-xs font-bold leading-tight group-hover:text-primary">{t.title}</span>
              <span className="font-mono text-[10px] text-muted-foreground border border-border px-1">{t.reads}</span>
            </button>
          ))}
        </div>
      </RetroPanel>

      <RetroPanel title="Categories" icon={FolderOpen}>
        <div className="flex flex-wrap gap-2">
          {DUMMY_CATEGORIES.map((c) => (
            <span
              key={c}
              className="cursor-pointer border-2 border-border bg-background px-3 py-1 font-mono text-xs font-bold uppercase transition-colors hover:bg-primary hover:text-primary-foreground shadow-[2px_2px_0px_0px_var(--border)]"
            >
              {c}
            </span>
          ))}
        </div>
      </RetroPanel>

      <RetroPanel title="Suggested" icon={Users}>
        <div className="space-y-3">
          {DUMMY_SUGGESTED.map((u) => (
            <Link
              key={u.handle}
              href={`/u/${u.handle}`}
              className="flex items-center gap-3 group border-b border-border/10 pb-3 last:border-0 last:pb-0"
            >
              <div className="h-10 w-10 border-2 border-border bg-primary/15 flex items-center justify-center font-black text-primary font-mono shadow-[2px_2px_0px_0px_var(--border)]">
                {u.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase leading-none">{u.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">@{u.handle}</p>
              </div>
              <div className="border border-border px-2 py-1 font-mono text-[10px] font-bold group-hover:bg-foreground group-hover:text-background transition-colors">
                FOLLOW
              </div>
            </Link>
          ))}
        </div>
      </RetroPanel>

      <RetroPanel title="System_Tags" icon={Hash}>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {DUMMY_TAGS.map((tag) => (
            <span key={tag} className="font-mono text-xs font-bold text-muted-foreground hover:text-primary cursor-pointer">
              #{tag}
            </span>
          ))}
        </div>
      </RetroPanel>
    </aside>
  );
}

// --- MAIN PAGE ---

export default function PublicBlogPostPage() {
  const params = useParams();
  const username = typeof params.username === 'string' ? params.username : '';
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const [origin, setOrigin] = useState('');
  const [post, setPost] = useState<PublicBlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(globalThis.window.location.origin);
    const load = async () => {
      if (!username || !slug) return;
      try {
        const { post: p } = await blogApi.getPublishedPost(username, slug);
        setPost(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Post not found');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [username, slug]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="border-4 border-border bg-card p-12 shadow-[8px_8px_0px_0px_var(--border)]">
        <p className="font-mono text-lg font-black tracking-widest uppercase animate-pulse">Loading_Document...</p>
      </div>
    </div>
  );

  if (error || !post) return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="max-w-md border-4 border-destructive bg-destructive/5 p-8 shadow-[8px_8px_0px_0px_var(--destructive)]">
        <h1 className="font-mono text-xl font-black uppercase text-destructive mb-2">Error_Occurred</h1>
        <p className="font-mono text-sm">{error ?? 'Post not found in our database.'}</p>
        <Link href="/" className="mt-6 inline-block border-2 border-destructive px-4 py-2 font-mono text-xs font-bold hover:bg-destructive hover:text-white transition-colors">
          RETURN_TO_BASE
        </Link>
      </div>
    </div>
  );

  const plainSummary = summaryToPlainText(post.summary);
  const published = new Date(post.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen py-6 px-4 md:px-8 font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Maximum width set to 1440px to fill left/right spaces on wider screens */}
      <div className="mx-auto max-w-[1440px] border-x-2 border-dashed border-border/30 px-4 md:px-6">
        
        {/* Decorative Grid Top Bar that spans full width container */}
        <div className="hidden md:flex items-center justify-between border-2 border-border bg-muted/50 px-4 py-2 mb-6">
          <div className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">Status: Document_Verified</div>
          <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <span>LOC: 40.7128° N, 74.0060° W</span>
            <Maximize2 className="h-3 w-3" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Main Content (Given 9/12 column span to spread wider) */}
          <main className="lg:col-span-9 space-y-8">
            <article className="border-4 border-border bg-card shadow-[10px_10px_0px_0px_var(--border)]">
              
              {/* Post Header */}
              <header className="border-b-4 border-border p-6 md:p-10 bg-muted/20">
                <div className="flex flex-wrap items-center gap-4 mb-6">
                   <div className="flex items-center gap-1.5 border-2 border-border bg-muted px-3 py-1.5 font-mono text-xs font-bold uppercase">
                     <Calendar className="h-3.5 w-3.5" /> {published}
                   </div>
                   <div className="h-[2px] flex-1 bg-border/40 min-w-[50px]" />
                   <div className="font-mono text-xs font-bold uppercase text-muted-foreground">System_Verified</div>
                </div>

                <h1 className="font-mono text-3xl font-black uppercase leading-tight tracking-tighter text-foreground sm:text-5xl md:text-6xl mb-8">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 border-t-2 border-dashed border-border/50 pt-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={post.author.profileImg}
                      alt=""
                      className="h-14 w-14 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]"
                    />
                    <div>
                      <p className="font-mono text-xs font-black uppercase text-muted-foreground">Originator</p>
                      <Link
                        href={`/u/${post.author.username}`}
                        className="font-mono text-base font-bold text-primary hover:underline"
                      >
                        @{post.author.username}
                      </Link>
                    </div>
                  </div>
                </div>
              </header>

              {/* Thumbnail */}
              {post.thumbnailUrl && (
                <div className="border-b-4 border-border bg-muted overflow-hidden max-h-[600px]">
                  <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Post Body */}
              <div className="p-6 md:p-10 space-y-10">
                {plainSummary && (
                  <div className="relative border-2 border-border bg-muted/40 p-6 font-mono text-sm leading-relaxed shadow-[inset_4px_4px_0px_0px_rgba(0,0,0,0.05)] max-w-4xl mx-auto">
                    <div className="absolute -top-3 left-4 bg-border text-background px-2 text-[10px] font-bold">SUMMARY_MANIFEST</div>
                    {plainSummary}
                  </div>
                )}

                <div className="prose-retro">
                  <BlogPublicBody content={post.content} />
                </div>
              </div>

              {/* Footer */}
              <footer className="border-t-4 border-border bg-muted/50 p-6 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-muted-foreground">
                  <Hash className="h-4 w-4" /> End_of_Transmission
                </div>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="border-2 border-border bg-card px-4 py-2 font-mono text-xs font-bold uppercase shadow-[3px_3px_0px_0px_var(--border)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  Return_To_Top ↑
                </button>
              </footer>
            </article>
          </main>

          {/* Sidebar (Takes up remaining 3/12 columns) */}
          <div className="lg:col-span-3">
             <DiscoverSidebar origin={origin} />
          </div>

        </div>

        {/* Bottom Decorative Edge Bar to fill large bottom gaps */}
        <div className="hidden md:flex items-center justify-between border-2 border-border bg-muted/50 px-4 py-2 mt-8 mb-4 font-mono text-xs text-muted-foreground">
          <span>Total Blocks: {parseBlocks(post.content).length}</span>
          <span>© All rights reserved</span>
        </div>
      </div>
    </div>
  );
}