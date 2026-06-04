export function docsSiteName(): string {
  return process.env.NEXT_PUBLIC_DOCS_SITE_NAME?.trim() || 'Syntax Stories Docs';
}

export function webappUrl(): string {
  return (process.env.NEXT_PUBLIC_WEBAPP_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

export function articleHref(article: { slug: string; canonicalPath?: string }): string {
  if (article.canonicalPath?.startsWith('/')) {
    const slug = article.canonicalPath.split('/').filter(Boolean).pop();
    if (slug) return `/${slug}`;
  }
  return `/${article.slug}`;
}
