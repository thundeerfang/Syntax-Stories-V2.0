/**
 * Marketing CMS JSON API — `/api/marketing/*`.
 * Keep in sync with `server/src/routes/marketing.routes.ts`.
 */

export interface MarketingHero {
  badge: string;
  title: string;
  titleHighlight: string;
  description: string;
}

export interface MarketingJourneyItem {
  year: string;
  event: string;
  sortOrder: number;
}

export interface MarketingTechItem {
  name: string;
  icon: string;
  sortOrder: number;
}

export interface MarketingFeatureItem {
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface MarketingTeamMember {
  name: string;
  role: string;
  imageUrl: string;
  githubUrl?: string;
  xUrl?: string;
  sortOrder: number;
}

export interface MarketingCta {
  title: string;
  description: string;
  buttonLabel: string;
}

export interface AboutMarketingPage {
  slug: 'about';
  hero: MarketingHero;
  journey: MarketingJourneyItem[];
  techStack: MarketingTechItem[];
  features: MarketingFeatureItem[];
  team: MarketingTeamMember[];
  cta: MarketingCta;
  footerNote: string;
  updatedAt?: string;
}

export interface AboutMarketingPageResponse {
  success: boolean;
  page: AboutMarketingPage;
}
