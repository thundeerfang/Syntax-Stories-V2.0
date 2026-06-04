/**
 * CMS marketing pages (About journey, team, features).
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
  MarketingTeamMember,
  MarketingCta,
  AboutMarketingPage,
} from '@contracts/marketingApi';
import type { AboutMarketingPage } from '@contracts/marketingApi';

export type AboutPageLoadReason = 'not_found' | 'network' | 'unavailable';

export class AboutPageLoadError extends Error {
  readonly reason: AboutPageLoadReason;

  constructor(reason: AboutPageLoadReason) {
    super(reason);
    this.name = 'AboutPageLoadError';
    this.reason = reason;
  }
}

export function aboutPageUnavailableCopy(reason: AboutPageLoadReason): Readonly<{
  title: string;
  description: string;
}> {
  switch (reason) {
    case 'not_found':
      return {
        title: 'Our About page is on the way',
        description:
          "We're still putting the finishing touches on our story. Explore the community in the meantime — posts, topics, and squads are ready when you are.",
      };
    case 'network':
      return {
        title: "We couldn't load this page",
        description:
          'Check your connection and try again. If you are offline, reconnect and tap Try again.',
      };
    default:
      return {
        title: 'This page is temporarily unavailable',
        description:
          'Something went wrong on our side. Please try again in a moment, or head back home and keep browsing.',
      };
  }
}

export async function getAboutMarketingPage(): Promise<AboutMarketingPage> {
  let res: Response;
  try {
    res = await fetch(marketingUrl('/about'), { cache: 'no-store' });
  } catch {
    throw new AboutPageLoadError('network');
  }

  let data: { success?: boolean; page?: AboutMarketingPage; message?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new AboutPageLoadError('unavailable');
  }

  if (!res.ok || !data.success || !data.page) {
    if (res.status === 404) throw new AboutPageLoadError('not_found');
    throw new AboutPageLoadError('unavailable');
  }
  return data.page;
}
