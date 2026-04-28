import { HomeFeed } from '@/components/home/HomeFeed';

export default function HomePage() {
  return (
    <div className="relative min-w-0 overflow-hidden">
      {/* Retro grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.45] dark:opacity-[0.25]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border) / 0.35) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border) / 0.35) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
        {/* Dashboard-style hero panel */}
        <header className="border-2 border-border bg-card p-6 shadow-[8px_8px_0_0_var(--border)] md:p-8 md:shadow-[12px_12px_0_0_var(--border)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 border-2 border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                <span className="size-1.5 shrink-0 animate-pulse rounded-none bg-primary" aria-hidden />
                <span>Blog terminal</span>
              </div>
              <h1 className="font-mono text-3xl font-black uppercase leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-5xl">
                <span className="block">Dev stories</span>
                <span className="block text-primary">dashboard</span>
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Tutorials, hot takes, and deep dives from the community — pulled live from the feed. Pick a card
                to open the full post.
              </p>
            </div>
            <aside className="flex w-full shrink-0 flex-col justify-between gap-3 border-2 border-dashed border-border bg-muted/40 p-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground lg:max-w-xs">
              <div className="space-y-2">
                <p className="text-[9px] font-bold tracking-[0.35em] text-foreground">Session</p>
                <p className="leading-relaxed">
                  Compact feed below: source and title up top, preview image at the bottom — similar to a dev news
                  grid.
                </p>
              </div>
              <div className="border-t-2 border-border pt-3 text-[9px]">
                <span className="text-primary">●</span> Public feed · read-only
              </div>
            </aside>
          </div>
        </header>

        <HomeFeed />
      </div>
    </div>
  );
}
