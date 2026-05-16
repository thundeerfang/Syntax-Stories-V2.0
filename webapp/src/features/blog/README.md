# Blog feature

**Ownership:** Product frontend (feed cards, write overlay, profile activity lists).

## Public API

Import from `@/features/blog` only (see `index.ts`).

## Layout

```txt
features/blog/
  components/     # BlogCard, swipers, write overlay, table grid
  index.ts        # public exports
```

## Boundaries

- **Server vs client:** `BlogCard` and engagement rail are client components.
- **Shared UI:** Uses `@/components/ui`, `@/lib/shell` for cover fallback — not vice versa.
- **Cross-feature:** Squads engagement may import squad APIs from `@/api/squads`.

## Pitfalls

- Do not add new files under `@/components/blog/` (deprecated re-export shim only).
- `ownerActions` on profile grids is not yet wired on `BlogCard` — use tabs/filters until implemented.
