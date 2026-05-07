# Syntax Stories — Admin (CMS)

Separate Next.js app for **help/CMS** per [PLATFORM_DOCUMENTATION_AND_ADMIN_CMS_BLUEPRINT.md](../docs/PLATFORM_DOCUMENTATION_AND_ADMIN_CMS_BLUEPRINT.md).

## Setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` to your API (e.g. `http://localhost:7373`).
2. In MongoDB, grant CMS access to your user:

   ```js
   db.users.updateOne(
     { email: 'you@example.com' },
     { $set: { staffRole: 'admin' } }
   )
   ```

3. Ensure the server allows this origin in CORS (`FRONTEND_URL` or add `http://localhost:3002` / `ADMIN_FRONTEND_URL` in `server` env).

4. Install and run:

   ```bash
   cd admin
   npm install
   npm run dev
   ```

   Open [http://localhost:3002](http://localhost:3002). Sign in with **email OTP** (same as main app).

## API (implemented on server)

| Method | Path |
|--------|------|
| GET | `/api/v1/help/articles` — public list |
| GET | `/api/v1/help/articles/:slug` — public article (`redirectTo` for legacy slugs) |
| GET | `/api/v1/admin/help/articles` — staff list |
| POST | `/api/v1/admin/help/articles` — create draft |
| GET | `/api/v1/admin/help/articles/:id` — editor detail |
| PATCH | `/api/v1/admin/help/articles/:id` — save draft |
| POST | `/api/v1/admin/help/articles/:id/publish` — publish |
| POST | `/api/v1/admin/help/articles/:id/rollback` — admin rollback |
| POST/DELETE | `/api/v1/admin/help/articles/:id/lock` — edit lock |
| DELETE | `/api/v1/admin/help/articles/:id` — soft-delete (trash) |
| GET | `/api/v1/admin/trash` — list help/blog/user trash (`sections=help,blog,user`) |
| POST | `/api/v1/admin/trash/restore` — restore one item (`resourceType` + `id`) |

Admin routes require JWT + `staffRole` `editor` or `admin` on the user document. Blog and user restore from trash require **`admin`**.
