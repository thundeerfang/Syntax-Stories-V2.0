export type AboutPillarVariant = "dark" | "card" | "primary";
export const marketing = {
  aboutPillar: {
    dark: {
      card: "about-pillar-card-dark",
      icon: "text-primary",
      body: "text-sm font-bold leading-relaxed opacity-80 uppercase",
    },
    card: {
      card: "about-pillar-card-default",
      icon: "text-primary",
      body: "text-sm font-bold leading-relaxed text-muted-foreground uppercase",
    },
    primary: {
      card: "about-pillar-card-primary",
      icon: "text-primary-foreground",
      body: "text-sm font-bold leading-relaxed opacity-90 uppercase",
    },
  },
  aboutBadge: "about-badge",
  aboutStatCard: "about-stat-card",
  aboutSectionCard: "about-section-card",
  aboutTechTile: "about-tech-tile",
  aboutCtaSection: "about-cta-section",
  aboutMobileAppCard: "about-mobile-app-card",
} as const satisfies Record<string, unknown>;
