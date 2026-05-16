import type {
  MarketingCta,
  MarketingFeatureItem,
  MarketingHero,
  MarketingJourneyItem,
  MarketingPlanItem,
  MarketingTeamMember,
  MarketingTechItem,
} from '../../../models/MarketingPage.js';

export type AboutMarketingSeed = {
  slug: 'about';
  hero: MarketingHero;
  journey: MarketingJourneyItem[];
  techStack: MarketingTechItem[];
  features: MarketingFeatureItem[];
  membershipPlans: MarketingPlanItem[];
  team: MarketingTeamMember[];
  cta: MarketingCta;
  footerNote: string;
};

/** Default About page CMS payload (idempotent seed). */
export const ABOUT_MARKETING_SEED: AboutMarketingSeed = {
  slug: 'about',
  hero: {
    badge: 'Est. 2023',
    title: 'Where code meets',
    titleHighlight: 'context.',
    description:
      'Syntax Stories is a publishing platform built by developers, for developers. The signal you’ve been looking for in a world of noise.',
  },
  journey: [
    { year: '2023', event: 'The first line of code was pushed to a private repo.', sortOrder: 0 },
    { year: '2024', event: 'Reached 10,000 active developers sharing insights.', sortOrder: 1 },
    { year: 'Today', event: 'Leading the way in AI-powered technical publishing.', sortOrder: 2 },
  ],
  techStack: [
    { name: 'Next.js 14', icon: 'Globe', sortOrder: 0 },
    { name: 'Tailwind CSS', icon: 'Layers', sortOrder: 1 },
    { name: 'Express.js', icon: 'Terminal', sortOrder: 2 },
    { name: 'MongoDB', icon: 'Database', sortOrder: 3 },
    { name: 'Redis', icon: 'Zap', sortOrder: 4 },
    { name: 'Docker', icon: 'Box', sortOrder: 5 },
  ],
  features: [
    {
      title: 'Semantic Search',
      description: 'Find articles by concept, not just keywords.',
      icon: 'BrainCircuit',
      sortOrder: 0,
    },
    {
      title: 'Code Context',
      description: 'AI that understands your imports and architecture.',
      icon: 'Terminal',
      sortOrder: 1,
    },
    {
      title: 'Auto-Indexing',
      description: 'Smart tags generated instantly upon publish.',
      icon: 'Zap',
      sortOrder: 2,
    },
  ],
  membershipPlans: [
    {
      name: 'Hobby',
      price: '$0',
      priceSuffix: '/mo',
      features: ['Markdown Editor', '5 Articles/mo', 'Community Access'],
      sortOrder: 0,
    },
    {
      name: 'Pro',
      price: '$12',
      priceSuffix: '/mo',
      features: ['AI Co-writer', 'Custom Domains', 'Analytics', 'No Ads'],
      sortOrder: 1,
    },
  ],
  team: [
    {
      name: 'Somya',
      role: 'AI Engineer',
      imageUrl: '/developers/somya.png',
      sortOrder: 0,
    },
    {
      name: 'Harshit',
      role: 'Tech Lead · Full Stack · DB · API · DevOps',
      imageUrl: '/developers/harshit.png',
      sortOrder: 1,
    },
    {
      name: 'Vijay',
      role: 'UI/UX Designer',
      imageUrl: '/developers/vijay.png',
      sortOrder: 2,
    },
  ],
  cta: {
    title: 'Ready to share\nyour story?',
    description:
      'Join 50,000+ developers shipping insights daily. Your first article is just a few keystrokes away.',
    buttonLabel: 'Get started',
  },
  footerNote:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
};
