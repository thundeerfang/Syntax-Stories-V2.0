"use client";

import { useEffect, useState } from "react";
import { Button, BlockShadowButton } from "@/components/ui";
import {
  GithubIcon,
  LinkedinIcon,
} from "@/components/icons/SocialProviderIcons";
import { ShellPageIntroHeader } from "@/components/layout";
import { getAboutPageContent } from "@/lib/marketing/aboutPage";
import { MarketingIcon } from "@/lib/marketing/marketingIcons";
import { useAuthDialogStore } from "@/store/authDialog";
import { shell, marketing, retro } from "@/lib/styles";
import { cn } from "@/lib/core/utils";
import { fetchBillingPlans, type BillingPlanCatalogItem } from "@/api/billing";
import {
  fetchPlatformStats,
  type PublicPlatformStatsDto,
} from "@/api/platform";
import {
  Heart,
  Zap,
  ExternalLink,
  Layers,
  Globe,
  Terminal,
  Download,
  FileText,
  Users,
  Activity,
} from "lucide-react";

const page = getAboutPageContent();

// Animation constants
const BEZIER = "cubic-bezier(0.34, 1.56, 0.64, 1)";

const PILLAR_ICONS = {
  layers: Layers,
  globe: Globe,
  zap: Zap,
} as const;

const PILLAR_STYLES = marketing.aboutPillar;

function formatPlatformCount(value: number): string {
  return value.toLocaleString();
}

function formatPlatformUptime(value: number): string {
  return `${value.toFixed(1)}%`;
}

function buildPlayStoreQrSrc(playStoreUrl: string): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(playStoreUrl)}&size=160&margin=2&light=ffffff`;
}

const PLATFORM_STATS = [
  {
    key: "linesWritten",
    label: "Lines written",
    icon: FileText,
    format: formatPlatformCount,
  },
  {
    key: "activeUsers",
    label: "Active Users",
    icon: Users,
    format: formatPlatformCount,
  },
  {
    key: "components",
    label: "Components",
    icon: Layers,
    format: formatPlatformCount,
  },
  {
    key: "uptimePercent",
    label: "Uptime",
    icon: Activity,
    format: formatPlatformUptime,
  },
] as const;

function AboutMobileAppCard() {
  const app = page.mobileApp;
  const qrSrc = buildPlayStoreQrSrc(app.playStoreUrl);

  return (
    <div className={marketing.aboutMobileAppCard}>
      <div className="flex items-center gap-2.5 border-b-2 border-border bg-primary px-4 py-3 text-primary-foreground">
        <img
          src={app.iconSrc}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 object-cover"
        />
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-black uppercase tracking-tight">
            {app.name}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/80">
            {app.subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 p-4 sm:p-5">
        <div className="relative border-2 border-border bg-background p-2">
          <img
            src={qrSrc}
            alt={`QR code for ${app.name} on Google Play`}
            width={140}
            height={140}
            className="size-[8.75rem]"
          />
          <img
            src={app.iconSrc}
            alt=""
            width={32}
            height={32}
            className="pointer-events-none absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 border border-border bg-foreground object-cover"
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
          {app.qrLabel}
        </p>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const openAuthDialog = useAuthDialogStore((s) => s.open);
  const [plans, setPlans] = useState<BillingPlanCatalogItem[]>([]);
  const [platformStats, setPlatformStats] =
    useState<PublicPlatformStatsDto | null>(null);

  useEffect(() => {
    void fetchBillingPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    void fetchPlatformStats()
      .then(setPlatformStats)
      .catch(() => setPlatformStats(null));
  }, []);

  return (
    <div className={cn(shell.contentRail, "pb-16")}>
      <div className="w-full space-y-24 md:space-y-40">
        {/* --- HERO & TEAM --- */}
        <div className="space-y-8 md:space-y-10">
          <ShellPageIntroHeader
            breadcrumbItems={[{ href: "/", label: "Home" }, { label: "About" }]}
            breadcrumbEnd={
              <a
                href="https://syntax-stories.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex rotate-[4deg] items-center gap-2 border-4 border-border bg-yellow-400 px-4 py-2 font-black uppercase tracking-tighter text-foreground hover:rotate-0 hover:bg-yellow-300",
                  retro.shadowBlogCard,
                  `transition-all duration-500 ${BEZIER}`,
                )}
              >
                <Terminal className="size-5" />
                Legacy v1.0
                <ExternalLink className="size-4" />
              </a>
            }
            description={page.hero.description}
            descriptionEnd={<AboutMobileAppCard />}
            title={
              <div className="space-y-4">
                <div
                  className={cn(
                    marketing.aboutBadge,
                    "px-4 py-1 text-sm tracking-[0.2em]",
                  )}
                >
                  {page.hero.badge}
                </div>
                <h1 className="text-3xl font-black uppercase italic leading-[0.95] tracking-tighter text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
                  {page.hero.title} <br />
                  <span className="relative inline-block text-primary">
                    {page.hero.titleHighlight}
                  </span>
                </h1>
              </div>
            }
          />

          {/* --- TEAM --- */}
          <section className="space-y-6 md:space-y-8">
            <div className="space-y-2 text-center">
              <div
                className={cn(
                  marketing.aboutBadge,
                  "text-[10px] tracking-widest",
                )}
              >
                {page.teamSection.badge}
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter sm:text-6xl">
                {page.teamSection.title}
              </h2>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground sm:text-sm">
                {page.teamSection.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3 md:gap-6">
              {page.team.map((dev) => {
                const hasShadow = dev.featured || dev.shadowCard;
                const hasPortraitFrame = dev.featured || dev.shadowCard;
                const isSideCard = dev.shadowCard && !dev.featured;

                return (
                  <article
                    key={dev.name}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="relative mb-3 sm:mb-4">
                      {hasShadow ? (
                        <div
                          className={cn(
                            "absolute h-full w-full border-border",
                            dev.featured
                              ? "-right-3 -bottom-3 border-4 bg-primary"
                              : "-right-2 -bottom-2 border-[3px] bg-border",
                          )}
                        />
                      ) : null}
                      <div
                        className={cn(
                          "relative overflow-hidden bg-muted",
                          dev.featured
                            ? "h-56 w-56 border-4 border-border sm:h-64 sm:w-64"
                            : hasPortraitFrame
                              ? "h-44 w-44 border-4 border-border sm:h-48 sm:w-48"
                              : "h-48 w-48 border-2 border-border sm:h-52 sm:w-52",
                        )}
                      >
                        <img
                          src={dev.imageSrc}
                          alt={dev.name}
                          width={dev.featured ? 256 : isSideCard ? 192 : 208}
                          height={dev.featured ? 256 : isSideCard ? 192 : 208}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>

                    <h3
                      className={cn(
                        "font-black uppercase italic tracking-tighter",
                        dev.featured ? "text-2xl" : "text-xl",
                      )}
                    >
                      {dev.name}
                    </h3>
                    <p className="mt-1 whitespace-pre-line text-[10px] font-black uppercase leading-snug tracking-widest text-primary">
                      {dev.role}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      {dev.githubUrl ? (
                        <a
                          href={dev.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${dev.name} on GitHub`}
                          className={cn(retro.border, "p-2")}
                        >
                          <GithubIcon className="size-4" />
                        </a>
                      ) : null}
                      {dev.linkedinUrl ? (
                        <a
                          href={dev.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${dev.name} on LinkedIn`}
                          className={cn(retro.border, "p-2")}
                        >
                          <LinkedinIcon className="size-4" />
                        </a>
                      ) : null}
                      {dev.resumeUrl ? (
                        <Button
                          variant={dev.featured ? "primary" : "outline"}
                          size="sm"
                          href={dev.resumeUrl}
                          download
                        >
                          <Download className="size-4" aria-hidden />
                          Download resume
                        </Button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* --- PLATFORM STATS --- */}
          <section className="space-y-4 md:space-y-5">
            <div className="text-center">
              <div
                className={cn(
                  marketing.aboutBadge,
                  "text-[10px] tracking-widest",
                )}
              >
                {page.statsSection.badge}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {PLATFORM_STATS.map((stat) => {
                const Icon = stat.icon;
                const rawValue = platformStats?.[stat.key];
                const value =
                  rawValue != null && platformStats
                    ? stat.format(rawValue as number)
                    : "—";

                return (
                  <div
                    key={stat.key}
                    className={cn(marketing.aboutStatCard, "p-5 sm:p-6")}
                  >
                    <Icon
                      className="mx-auto mb-3 size-6 text-primary sm:size-7"
                      aria-hidden
                    />
                    <div className="text-3xl font-black italic tracking-tighter text-primary sm:text-4xl">
                      {value}
                    </div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* --- CORE PHILOSOPHY --- */}
        <section className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {page.pillars.map((pillar) => {
            const Icon = PILLAR_ICONS[pillar.icon];
            const styles = PILLAR_STYLES[pillar.variant];

            return (
              <div key={pillar.title} className={cn("p-8", styles.card)}>
                <Icon className={cn("mb-4 size-10", styles.icon)} />
                <h3 className="mb-4 text-2xl font-black uppercase italic">
                  {pillar.title}
                </h3>
                <p className={styles.body}>{pillar.description}</p>
              </div>
            );
          })}
        </section>

        {/* --- THE JOURNEY & TECH --- */}
        <section className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-stretch">
          <div className={cn(marketing.aboutSectionCard, "lg:col-span-7")}>
            <h2 className="mb-12 text-3xl font-black uppercase italic tracking-tighter">
              The journey
            </h2>
            <div className="relative space-y-12 before:absolute before:bottom-0 before:left-[18px] before:top-0 before:w-1 before:bg-foreground/10">
              {page.journey.map((item, idx) => (
                <div
                  key={item.year}
                  className="group relative pl-16 transition-all duration-500 hover:translate-x-2"
                >
                  <div
                    className={cn(
                      "absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center border-4 border-border bg-background",
                      `transition-all duration-500 ${BEZIER}`,
                      "group-hover:rotate-[360deg] group-hover:bg-primary group-hover:scale-110",
                    )}
                  >
                    <span className="text-[10px] font-black group-hover:text-primary-foreground">
                      {idx + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-black uppercase text-primary">
                    {item.year}
                  </h3>
                  <p className="mt-2 text-base font-bold leading-snug text-muted-foreground transition-colors group-hover:text-foreground">
                    {item.event}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              marketing.aboutSectionCard,
              "flex h-full flex-col lg:col-span-5",
            )}
          >
            <h2 className="mb-8 shrink-0 text-2xl font-black uppercase italic">
              Built with
            </h2>
            <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-3">
              {page.techStack.map((tech) => (
                <div
                  key={tech.name}
                  className={cn(
                    marketing.aboutTechTile,
                    `transition-all duration-500 ${BEZIER}`,
                    "group hover:-translate-y-2 hover:shadow-[8px_8px_0_0_var(--primary)]",
                  )}
                >
                  <MarketingIcon
                    name={tech.icon}
                    className="mb-2 h-7 w-7 shrink-0 text-primary group-hover:scale-125 sm:h-8 sm:w-8"
                  />
                  <span className="text-[10px] font-black uppercase leading-tight sm:text-xs">
                    {tech.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-6 md:space-y-8">
          {/* --- FINAL CTA --- */}
          <section
            className={cn(
              marketing.aboutCtaSection,
              "px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12",
            )}
          >
            <div className="flex flex-col items-center gap-4 text-center sm:gap-5">
              <h2 className="whitespace-pre-line text-3xl font-black uppercase italic leading-[0.9] tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                {page.cta.title}
              </h2>
              <p className="max-w-md px-2 text-xs font-bold uppercase tracking-wide opacity-90 sm:px-0 sm:text-sm">
                {page.cta.description}
              </p>
              <BlockShadowButton
                variant="secondary"
                size="lg"
                onClick={() => openAuthDialog("signup")}
              >
                {page.cta.buttonLabel}
              </BlockShadowButton>
            </div>
          </section>

          {page.footerNote && (
            <footer className="flex flex-col items-center py-4 md:py-5">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.4em] text-muted-foreground">
                <Heart className="size-4 text-primary fill-primary" />
                <span>{page.footerNote}</span>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
