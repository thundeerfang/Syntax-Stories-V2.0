/** Public docs app origin (docs-webapp). Defaults to local dev port 3003. */
export function getDocsAppUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_DOCS_APP_URL?.trim() ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : '');
  return raw.replace(/\/$/, '');
}

/** Main product webapp origin for /help links. */
export function getWebappUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_WEBAPP_URL?.trim() ||
    process.env.NEXT_PUBLIC_PUBLIC_APP_URL?.trim() ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');
  return raw.replace(/\/$/, '');
}
