import type { Request, Response } from 'express';
import { MarketingPageModel } from '../models/MarketingPage.js';

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getAboutMarketingPage(req: Request, res: Response): Promise<void> {
  void req;
  const doc = await MarketingPageModel.findOne({ slug: 'about' }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: 'About page content not found' });
    return;
  }

  res.status(200).json({
    success: true,
    page: {
      slug: doc.slug,
      hero: doc.hero,
      journey: sortByOrder(doc.journey ?? []),
      techStack: sortByOrder(doc.techStack ?? []),
      features: sortByOrder(doc.features ?? []),
      team: sortByOrder(doc.team ?? []),
      cta: doc.cta,
      footerNote: doc.footerNote ?? '',
      updatedAt: doc.updatedAt,
    },
  });
}
