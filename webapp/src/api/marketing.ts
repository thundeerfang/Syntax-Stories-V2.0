/**
 * CMS marketing pages (About journey, team, plans showcase).
 */

function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return base ? base.replace(/\/$/, '') : '';
}

function marketingUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}/api/marketing${path}` : `/api/marketing${path}`;
}

export type {
  MarketingHero,
  MarketingJourneyItem,
  MarketingTechItem,
  MarketingFeatureItem,
  MarketingPlanItem,
  MarketingTeamMember,
  MarketingCta,
  AboutMarketingPage,
} from '@contracts/marketingApi';
import type { AboutMarketingPage } from '@contracts/marketingApi';

export async function getAboutMarketingPage(): Promise<AboutMarketingPage> {
  const res = await fetch(marketingUrl('/about'), { cache: 'no-store' });
  const data = (await res.json()) as { success?: boolean; page?: AboutMarketingPage; message?: string };
  if (!res.ok || !data.success || !data.page) {
    throw new Error(data.message ?? 'Failed to load about page content');
  }
  return data.page;
}
