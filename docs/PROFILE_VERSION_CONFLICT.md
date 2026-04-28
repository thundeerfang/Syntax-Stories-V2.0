# Profile version conflict (409) — behavior and drafts

When the client sends **`expectedProfileVersion`** (from the last `GET /auth/me` / profile PATCH response), the server applies the write only if the stored **`profileVersion`** matches. If another tab, device, or request updated the profile first, the API returns **409** with code **`PROFILE_VERSION_CONFLICT`**.

Related: [`PROFILE_UPDATE_FLOW.md`](./PROFILE_UPDATE_FLOW.md), [`SETTINGS_ARCHITECTURE.md`](./SETTINGS_ARCHITECTURE.md).

---

## What the webapp does automatically

1. **`runProfilePatch`** (`webapp/src/lib/auth/runProfilePatch.ts`) catches **409** + `PROFILE_VERSION_CONFLICT`.
2. It calls **`refreshUser()`** so Zustand **`user`** (and **`profileVersion`**) match the server.
3. It throws **`PROFILE_VERSION_CONFLICT_MESSAGE`** so the UI can show a toast / inline error.

The session user is **not** logged out; only profile state is refreshed.

---

## Draft behavior (important for settings UX)

**Local React state is not rolled back.**

- Many settings sections keep **draft** values in `useState` (forms, lists, editors) until Save.
- On **409**, only **`useAuthStore().user`** is updated via **`refreshUser()`**.
- **Draft state can disagree with `user`** until the user:
  - **Saves again** (will send the new `profileVersion` from the refreshed `user`), or
  - **Discards** by navigating away / resetting the section (often re-syncs from `user` in `useEffect` dependencies like `user?.workExperiences`).

**Implications**

| Scenario | What the user sees |
|----------|-------------------|
| Open section A, edit draft, another tab saves profile | Tab A still shows the draft text; Save may succeed on retry with new version **or** conflict again if the other tab keeps winning. |
| After 409 toast | **`user` in the store is current**; sidebar / read-only bits may update; **open dialogs** may still show stale draft until closed or re-opened. |
| Sections that **`useEffect`‑sync from `user`** | Often **overwrite local state** when `user` changes — those may **partially** reflect the refresh without an explicit “reset draft” action. |

**Product guidance**

- Treat the conflict toast as: *“Server data was refreshed; your on-screen edits may be outdated — review or save again.”*
- Optionally, on 409 in a dialog, **close the dialog** or **re-hydrate form** from `user` (not implemented globally; per-section enhancement).

---

## Server and MongoDB

Single-document **`findOneAndUpdate`** with **`$set`** and **`$inc: { profileVersion: 1 }`** in one update document — see [`profile.repository.ts`](../server/src/modules/profile/profile.repository.ts) and comments on **atomicity** there.

---

## Stable user-facing string

`PROFILE_VERSION_CONFLICT_MESSAGE` in `webapp/src/lib/auth/runProfilePatch.ts` is the canonical copy for toasts and tests.
