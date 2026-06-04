export function categoryDetailPath(slug: string): string {
  return `/categories/${encodeURIComponent(slug)}`;
}

export function tagDetailPath(slug: string): string {
  return `/tags/${encodeURIComponent(slug)}`;
}
