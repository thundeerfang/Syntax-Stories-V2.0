/** Canonical Help & Legal API contracts for admin documentation hub. */

export type ApiRouteContract = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
};

export const PUBLIC_HELP_LEGAL_ROUTES: ApiRouteContract[] = [
  {
    method: 'GET',
    path: '/api/v1/help/articles',
    summary: 'List published articles (?category=, ?page=, ?pageSize=)',
  },
  {
    method: 'GET',
    path: '/api/v1/help/articles/:slug',
    summary: 'Article by slug — canonicalPath, redirectTo',
  },
  {
    method: 'GET',
    path: '/api/v1/legal/policies/:kind',
    summary: 'Published legal policy (terms | privacy | udd)',
  },
];

export const ADMIN_HELP_LEGAL_ROUTES: ApiRouteContract[] = [
  { method: 'GET', path: '/api/v1/admin/help/articles', summary: 'List help center articles (staff)' },
  { method: 'POST', path: '/api/v1/admin/help/articles', summary: 'Create help center draft (title only; slug server-generated)' },
  { method: 'GET', path: '/api/v1/admin/help/articles/:id', summary: 'Load article for edit' },
  {
    method: 'PATCH',
    path: '/api/v1/admin/help/articles/:id',
    summary: 'Save draft — expectedDraftVersion for optimistic concurrency',
  },
  { method: 'POST', path: '/api/v1/admin/help/articles/:id/publish', summary: 'Publish live snapshot' },
  { method: 'POST', path: '/api/v1/admin/help/articles/:id/rollback', summary: 'Restore prior published version' },
  { method: 'POST', path: '/api/v1/admin/help/articles/:id/lock', summary: 'Acquire edit lock' },
  { method: 'DELETE', path: '/api/v1/admin/help/articles/:id/lock', summary: 'Release edit lock' },
  { method: 'DELETE', path: '/api/v1/admin/help/articles/:id', summary: 'Soft delete → trash' },
  { method: 'GET', path: '/api/v1/admin/legal/policies', summary: 'Legal CMS policy list' },
  { method: 'PATCH', path: '/api/v1/admin/legal/policies/:id', summary: 'Legal workflow actions' },
];

export const DEPLOY_TOPOLOGY = {
  api: 'server/ — Express API on /api/v1',
  webapp: 'webapp/ — public product (port 3001, /docs + /help)',
  docsWebapp: 'docs-webapp/ — dedicated docs frontend (port 3003, CMS-backed)',
  admin: 'admin/ — staff console (port 3002, FAQ + internal documentation hub)',
} as const;

export const REQUEST_FLOW = `Next.js (webapp | docs-webapp | admin)
  → HTTP → help.controller (validate, status)
    → help.service (publish, slug, RBAC)
      → help.mappers → help.dto (stable JSON)
        → Mongoose models (internal)`;

export const CATEGORY_URL_MAP = [
  {
    category: 'documentation',
    publicPath: '/docs/<slug>',
    readers: 'webapp + docs-webapp (not managed in FAQ admin)',
  },
  { category: 'general', publicPath: '/help', readers: 'webapp FAQ (FAQ admin)' },
] as const;

export function formatRouteLine(route: ApiRouteContract): string {
  return `${route.method} ${route.path} — ${route.summary}`;
}
