# Syntax Stories — Admin Dashboard

Next.js app (`admin/`) for the internal **management dashboard** and **CMS** (help, legal, trash). It talks to the same API as the main webapp, with staff-only routes under `/api/v1/admin/*`.

**Reorganization plan:** [docs/ADMIN_PLATFORM_REORG_PLAN.md](../docs/ADMIN_PLATFORM_REORG_PLAN.md)  
**Auth, sessions, RBAC, Redis:** [docs/ADMIN_APP_AUTH_AND_RBAC.md](../docs/ADMIN_APP_AUTH_AND_RBAC.md)  
**RBAC spec:** [docs/RBAC_AND_USER_MANAGEMENT_SPEC.md](../docs/RBAC_AND_USER_MANAGEMENT_SPEC.md)

---

## Quick start

1. Copy `.env.example` → `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:7373`).
2. Start the **server** (`npm run dev` in `server/`) so Mongo seeds run (RBAC catalog + bootstrap operator — see below).
3. Start this app:

   ```bash
   cd admin
   npm install
   npm run dev
   ```

   Open [http://localhost:3002](http://localhost:3002).

4. Sign in at `/login` with **staff password** (`POST /auth/staff-login`), not end-user OTP.

---

## Auth — how it works today

### There is no public admin signup

| Flow                    | Endpoint                                    | Who can use it                                |
| ----------------------- | ------------------------------------------- | --------------------------------------------- |
| End-user signup         | `POST /auth/signup-email` + OTP             | Public                                        |
| End-user login          | `POST /auth/login-email` + OTP              | Public                                        |
| **Staff / admin login** | `POST /auth/staff-login`                    | Operators with credentials only               |
| Create another operator | `POST /api/v1/admin/management/admin-users` | Existing staff with `admin_assignment:manage` |

New operators are created by an existing super-admin (or bootstrap seed), not self-registration.

### Staff login (`POST /auth/staff-login`)

**Server:** `server/src/admin-platform/auth/staffLogin.controller.ts`  
**Admin UI:** `admin/src/app/login/page.tsx` → `apiUrl('/auth/staff-login')`

Resolution order:

1. **`admin_users` collection** (preferred): match `email` → bcrypt `passwordHash` → load linked `users` doc → issue normal JWT session (`loginSource: 'staff_password'`).
2. **Legacy `users` path**: `staffRole` ∈ `{ editor, admin }` + `staffPasswordHash` on the user document → same JWT session.

Same session machinery as the main app (cookies / bearer). No separate admin token type.

### Two authorization layers on the server

| Layer          | Routes                                   | Gate                                                                   |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| **Coarse CMS** | `/api/v1/admin/help`, `/legal`, `/trash` | JWT + `requireStaff('editor','admin')` — checks `users.staffRole` only |
| **Fine RBAC**  | `/api/v1/admin/management/*`             | JWT + `staffManagementContext` + per-permission middleware             |

When `FEATURE_ADMIN_RBAC_ENABLED=true` (default), management APIs require permissions from `AdminRole.permissions` via `admin_users.roleId`.  
**Legacy bootstrap user** with only `users.staffRole` and no `admin_users` row gets **empty permissions** → `PERMISSION_DENIED` on management routes (what you see in server logs).

### Staff resolution for APIs

`server/src/admin-platform/rbac/services/adminStaffResolution.ts`:

1. If `users.staffRole` is `editor` or `admin` → use it (CMS routes).
2. Else if active `admin_users` row → map `kind`: `staff`→`editor`, `admin`|`super_admin`→`admin`.

### Admin app session check

After login, `admin/src/store/session.ts` holds the JWT. `RequireAuth` and login redirect use `GET /auth/me` and expect `staffRole` of `editor` or `admin` on the user payload.

---

## Bootstrap on fresh DB (server)

On Mongo connect, `runAdminPlatformSeeds()` runs (see `server/src/admin-platform/seeds/`):

| Order | Seed                        | Purpose                                                        |
| ----- | --------------------------- | -------------------------------------------------------------- |
| 1     | `seedAccessCatalog`         | Resources, actions, permissions from `ADMIN_PERMISSIONS`       |
| 2     | `seedDefaultRoles`          | Super Admin, Platform Admin, Support, Content Editor           |
| 3     | `seedBootstrapOperator`     | `users` + `admin_users` for bootstrap email → Super Admin role |
| 4     | Legal policies + acceptance | Terms, privacy, UDD                                            |

Env:

- `ADMIN_BOOTSTRAP_EMAIL` (default `admin@syntax.com`)
- `ADMIN_BOOTSTRAP_PASSWORD` (dev default `1234`; set explicitly in production)

Feedback categories still seed separately (platform-wide).

---

## Backend map

Admin backend lives under `server/src/admin-platform/`:

server/src/admin-platform/
├── auth/              # staff-login, operator.service
├── rbac/              # permissions, middleware, models, management routes
├── controllers/       # management API handlers
├── cms/help|legal|trash/
└── seeds/             # runAdminPlatformSeeds()
```

All admin server code lives under `server/src/admin-platform/` (no duplicate `modules/admin`).

---

## Permission catalog (v1)

Defined in `server/src/admin-platform/rbac/adminPermissions.ts`:

- **Users:** `user:list`, `user:read`, `user:search`, `user:update_profile`, `user:lock`, `user:unlock`, `user:reset_email`, `user:read_oauth`, `user:read_security`, `user:revoke_sessions`
- **Billing:** `billing:read_subscription`, `billing:read_ledger`, `billing:open_stripe_customer`, `billing:sync_subscription`
- **Content:** `blog:read_metrics`
- **RBAC:** `admin_role:manage`, `admin_assignment:manage`
- **Ops:** `audit:read`, `feedback:read`, `contact_lead:read`

Format: `resource:action`. Seeded into `admin_resources`, `admin_action_types`, `admin_access_permissions` on connect.

---

## Admin app structure

```
admin/src/
├── app/login/page.tsx              # staff-login form
├── app/(dashboard)/                # authenticated shell
│   ├── users/                      # platform users + admin team
│   ├── access/                     # roles + permission catalog CRUD
│   ├── help/                       # help CMS
│   ├── trash/                      # soft-deleted content
│   └── ...
├── admin/api/management.ts         # typed client for management API
├── components/access/              # RBAC UI (RolesCrudSection, etc.)
└── store/session.ts
```

---

## Sessions and token refresh

The admin app stores **access** and **refresh** tokens in `localStorage`. When the access JWT expires, API calls use `adminAuthenticatedFetch` to call `POST /auth/refresh` once and retry (same pattern as the main webapp).

If you still see `Token expired`, ensure the server was restarted after pull and that `refreshToken` was saved at login (staff-login response must include it).

See [ADMIN_APP_AUTH_AND_RBAC.md](../docs/ADMIN_APP_AUTH_AND_RBAC.md) for full flows, Redis keys, and RBAC resolution.

## Environment

| Variable                              | App    | Notes                                                |
| ------------------------------------- | ------ | ---------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`            | admin  | API origin, no trailing slash                        |
| `FRONTEND_URL` / `ADMIN_FRONTEND_URL` | server | CORS for admin origin (e.g. `http://localhost:3002`) |
| `FEATURE_ADMIN_RBAC_ENABLED`          | server | `true` = per-permission RBAC on management routes    |

---

## After a DB wipe

1. Restart the server (seeds run on connect).
2. Log in at `/login` with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` (dev default `admin@syntax.com` / `1234`).
3. Users and Access pages should load without `PERMISSION_DENIED`.

---

## Related docs

- [ADMIN_PLATFORM_REORG_PLAN.md](../docs/ADMIN_PLATFORM_REORG_PLAN.md) — folder move, default roles, seed strategy
- [RBAC_AND_USER_MANAGEMENT_SPEC.md](../docs/RBAC_AND_USER_MANAGEMENT_SPEC.md) — full RBAC + user management spec
- [PLATFORM_DOCUMENTATION_AND_ADMIN_CMS_BLUEPRINT.md](../docs/PLATFORM_DOCUMENTATION_AND_ADMIN_CMS_BLUEPRINT.md) — CMS product blueprint
