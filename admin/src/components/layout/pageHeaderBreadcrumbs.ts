import type { BreadcrumbItem } from '@/components/ui/AdminBreadcrumb';

export const HOME_BREADCRUMB: BreadcrumbItem = { label: 'Home', href: '/', home: true };

/** Breadcrumb trail from home. Returns empty on the Overview root page. */
export function pageBreadcrumbs(current: string, currentHref?: string): BreadcrumbItem[] {
  const onOverviewRoot =
    current.toLowerCase() === 'overview' && (!currentHref || currentHref === '/');
  if (onOverviewRoot) return [];

  const items: BreadcrumbItem[] = [HOME_BREADCRUMB];
  if (currentHref) {
    items.push({ label: current, href: currentHref });
  } else {
    items.push({ label: current });
  }
  return items;
}

/** Parent section + current page (e.g. Users → Jane Doe). */
export function nestedPageBreadcrumbs(
  parent: { label: string; href: string },
  current: string,
  currentHref?: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [HOME_BREADCRUMB, { label: parent.label, href: parent.href }];
  if (currentHref) {
    items.push({ label: current, href: currentHref });
  } else {
    items.push({ label: current });
  }
  return items;
}

export function backHrefFromBreadcrumbs(items: BreadcrumbItem[]): string | undefined {
  if (items.length < 2) return undefined;
  return items[items.length - 2]?.href;
}

/** Puts the home crumb after the first segment (e.g. Blogs › Home › …). */
export function breadcrumbsWithHomeMiddle(segments: BreadcrumbItem[]): BreadcrumbItem[] {
  if (segments.length === 0) return [HOME_BREADCRUMB];
  const [first, ...rest] = segments;
  return [first, HOME_BREADCRUMB, ...rest];
}

/** Blogs › Home › current (optional link on current). */
export function blogPageBreadcrumbs(current: string, currentHref?: string): BreadcrumbItem[] {
  const tail: BreadcrumbItem = currentHref
    ? { label: current, href: currentHref }
    : { label: current };
  return breadcrumbsWithHomeMiddle([{ label: 'Blogs', href: '/blogs' }, tail]);
}

/** Blogs › Home › post title › metric (engagement sub-pages). */
export function blogEngagementBreadcrumbs(
  postTitle: string,
  postId: string,
  metricLabel: string
): BreadcrumbItem[] {
  return breadcrumbsWithHomeMiddle([
    { label: 'Blogs', href: '/blogs' },
    { label: postTitle, href: `/blogs/${encodeURIComponent(postId)}` },
    { label: metricLabel },
  ]);
}
