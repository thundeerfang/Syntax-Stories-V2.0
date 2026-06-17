# Admin platform (server)

**Single home** for staff dashboard backend: auth, RBAC, management API, CMS (help/legal/trash), and seeds.

Duplicate trees under `server/src/modules/admin`, `modules/help`, `modules/trash`, and `modules/legal` were removed — import from here only.

**Docs:** [docs/ADMIN_PLATFORM_REORG_PLAN.md](../../docs/ADMIN_PLATFORM_REORG_PLAN.md) · [admin/README.md](../../../admin/README.md)

## Layout

| Path                                 | Purpose                                           |
| ------------------------------------ | ------------------------------------------------- |
| `auth/`                              | Staff login, operator service                     |
| `rbac/`                              | Permissions, roles, middleware, management routes |
| `controllers/`                       | Management API handlers                           |
| `cms/help`, `cms/legal`, `cms/trash` | CMS admin + public routes                         |
| `seeds/`                             | `runAdminPlatformSeeds()` on Mongo connect        |

## Entry points

```ts
import {
  adminManagementRouter,
  helpAdminRouter,
  legalAdminRouter,
  trashAdminRouter,
  staffLogin,
  runAdminPlatformSeeds,
} from './admin-platform/index.js';
```

## Bootstrap env

- `ADMIN_BOOTSTRAP_EMAIL` (default `admin@syntax.com`)
- `ADMIN_BOOTSTRAP_PASSWORD` (dev default `1234`; required in production)
