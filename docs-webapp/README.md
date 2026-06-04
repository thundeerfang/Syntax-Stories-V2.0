# Syntax Stories Docs (`docs-webapp`)

Standalone documentation frontend for product docs. Content is loaded from the shared Help CMS API (`category: documentation`).

## Stack

- Next.js App Router (port **3003**)
- Tailwind CSS docs shell (sidebar + markdown)
- Public API: `GET /api/v1/help/articles`

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3003](http://localhost:3003).

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | API origin (`http://localhost:7373`) |
| `NEXT_PUBLIC_WEBAPP_URL` | Main webapp for help center links |
| `NEXT_PUBLIC_DOCS_SITE_NAME` | Header / page title |

## Seed product documentation

From `server/` (requires MongoDB and a staff user from `npm run seed:admin`):

```bash
npm run seed:docs
# npm run seed:docs -- --reset   # soft-delete existing docs, then reseed
```

This publishes **13** articles: platform overview, Syntax Stories intro, users & accounts hub, sign-up/sign-in journeys, email OTP, account recovery, OAuth (Google, GitHub, Twitch, and others), and connected accounts.

Blog & engagement docs (separate seed):

```bash
npm run seed:docs:blogs
# npm run seed:docs:blogs -- --reset
```

Adds **10** articles: blogs overview, write/publish, edit, view, views & read streak, Respect, reposts, bookmarks, comments, and post management (trash/restore).

## Publishing flow

Product docs use Help article category `documentation` (public URL `/docs/<slug>`). Today they are seeded via `npm run seed:docs` or inserted directly in MongoDB; Admin → Help CMS only edits FAQ (`general`) articles.

1. Create or seed an article with `category: documentation`
2. Publish (title + body ≥ 50 chars)
3. Article appears here and on webapp `/docs` automatically

## Related packages

| Package | Role |
|---------|------|
| `server/` | Help CMS API + MongoDB |
| `admin/` | Staff CMS + internal documentation hub |
| `webapp/` | Main product app (`/docs`, `/help`) |
