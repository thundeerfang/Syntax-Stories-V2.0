
Here’s an updated design that matches what you asked for.

---

# 1. Session / login – what to store in the audit log

When a user signs in or a session is created, log one audit entry that includes:

- **User:** `actorId` = user `_id`
- **Action:** `user_signin` and/or `session_created`
- **Request context:** `ip`, `userAgent` (top-level on the audit doc)
- **Session details in `metadata`:**
  - `sessionId` – ID of the created session
  - `deviceName` – from the session (e.g. `"Desktop - Windows"`)
  - `source` – `'otp' | 'signup_email' | 'google' | 'github' | 'facebook' | 'x' | 'qr_login'`
  - Optionally: `expiresAt` (session expiry) if you want it in the log

So “all the session user login in user ip browser and all data” = one audit row per login with `actorId`, `ip`, `userAgent`, and `metadata` containing session + source + device.

**Where to call it:**

- After `createSession(...)` in:
  - `auth.controller.ts` (OTP login, signup-then-login)
  - `app.ts` OAuth callbacks (Google/GitHub/Facebook/X) – pass `req`, `userId`, and the new session + `source: 'google'` etc.
- After QR login creates a session in `auth.controller.ts` (already have `logSecurityEvent` there; add audit log with same data).

So wherever you currently create a session and optionally call `logSecurityEvent(..., 'session_created', ...)`, add a call to your audit helper with the same `req` plus `metadata: { sessionId, deviceName, source }`.

---

# 2. Updated `AUDIT_ACTIONS` (no passwords; add open source, stack/tools, my setup, views)

- **Drop:** `password_reset_request`, `password_reset_success` (site doesn’t use passwords).
- **Keep:** signup, signin, signout, session_created/revoked, login_failure, email_change, oauth_login/connected/disconnected, twofa_*, follow/unfollow, profile_updated, education_*, work_*, project_*, certification_*, account_locked/deleted.
- **Add:**
  - **Open source:** `open_source_added`, `open_source_updated`, `open_source_removed`
  - **Stack and tools:** `stack_tool_added`, `stack_tool_removed` (and optionally `stack_tools_updated` if you only track bulk replace)
  - **My setup:** `my_setup_added`, `my_setup_updated`, `my_setup_removed`
  - **Views:** `profile_view` (so every profile view is also in the audit log; you already have analytics events, this is the “views added” in the audit log)

Example list:

```ts
export const AUDIT_ACTIONS = [
  'user_signup',
  'user_signin',
  'user_signout',
  'session_created',
  'session_revoked',
  'login_failure',
  'email_change',
  'oauth_login',
  'oauth_connected',
  'oauth_disconnected',
  'twofa_enabled',
  'twofa_disabled',
  'follow',
  'unfollow',
  'profile_updated',
  'profile_view',           // "views added" – each profile view logged here too
  'education_added',
  'education_updated',
  'education_removed',
  'work_added',
  'work_updated',
  'work_removed',
  'project_added',
  'project_updated',
  'project_removed',
  'certification_added',
  'certification_updated',
  'certification_removed',
  'open_source_added',       // GitHub open source added
  'open_source_updated',
  'open_source_removed',
  'stack_tool_added',        // stack and tools addition
  'stack_tool_removed',      // stack and tools deletion
  'stack_tools_updated',     // optional: bulk replace
  'my_setup_added',          // my setup image/item added
  'my_setup_updated',        // my setup image/item updated
  'my_setup_removed',        // my setup image/item removed
  'account_locked',
  'account_deleted',
] as const;
```

---

# 3. Schema and helper (unchanged idea; metadata carries session + details)

- **AuditLog schema** stays as before: `action`, `actorId`, `targetType`, `targetId`, `metadata`, `ip`, `userAgent`, `timestamp`.
- For **session/login**, pass something like:

```ts
await writeAuditLog(req, 'session_created', {
  actorId: String(user._id),
  metadata: {
    sessionId: String(session._id),
    deviceName: session.deviceName,
    source: 'google',  // or 'github' | 'otp' | 'signup_email' | 'qr_login' etc.
    expiresAt: session.expiresAt?.toISOString?.(),
  },
});
```

So “user login session … user ip browser and all data” = one row with `ip`/`userAgent` on the document and session + device + source in `metadata`.

---

# 4. Where to log each of the new/updated events

| What | Action | Where |
|------|--------|--------|
| Login / session created (with IP, browser, session id, device, source) | `session_created` and/or `user_signin` | After `createSession` in auth controller and in `app.ts` OAuth callbacks; include `sessionId`, `deviceName`, `source` in `metadata`. |
| Profile view | `profile_view` | In `recordProfileView` (analytics controller), after you write to ProfileViewEvent/AnalyticsEvent; `actorId` = viewer (if any), `targetType: 'profile'`, `targetId` = profile user id, `metadata` optional. |
| Open source added/updated/removed | `open_source_added` / `open_source_updated` / `open_source_removed` | In `updateProfile` when `updates.openSourceContributions` is present: compare previous vs new array (by repoUrl or index) and log add/update/remove per item. |
| Stack and tools add/remove (or bulk update) | `stack_tool_added`, `stack_tool_removed` or `stack_tools_updated` | In `updateProfile` when `updates.stackAndTools` is present: compare previous vs new; log added/removed items or one `stack_tools_updated` with `metadata: { added: [...], removed: [...] }`. |
| My setup add/update/remove | `my_setup_added`, `my_setup_updated`, `my_setup_removed` | In `updateProfile` when `updates.mySetup` is present: compare previous vs new (e.g. by label or index); log per-item add/update/remove. |

---

# 5. Detecting add/update/remove in `updateProfile`

- **Open source:** Load current `openSourceContributions` from DB; compare with `updates.openSourceContributions`. New length or new `repoUrl`/ids → add; same id/repo with changes → update; missing id/repo → remove. Log one audit row per change (e.g. `targetId` = user id, `metadata: { repoUrl, title }`).
- **Stack and tools:** Current and new are arrays of strings. Diff: in new but not old → `stack_tool_added` (e.g. `metadata: { tool: string }`); in old but not new → `stack_tool_removed`. Optionally a single `stack_tools_updated` with `metadata: { added: string[], removed: string[] }`.
- **My setup:** Current and new are arrays of `{ label, imageUrl, productUrl? }`. Same idea: new item → `my_setup_added`; same item (e.g. by index or label) with changed fields → `my_setup_updated`; removed item → `my_setup_removed`. Put in `metadata`: e.g. `label`, `imageUrl` (or “image updated” flag) so “image addition or deletion or updation” is clear.

---

# 6. Summary

- **Session/login:** One audit log entry per login/session creation with user, IP, userAgent, and in `metadata`: sessionId, deviceName, source (and optionally expiresAt). No password reset actions.
- **Views:** Log each profile view as `profile_view` in the audit log in addition to your existing analytics.
- **Open source:** Log `open_source_added`, `open_source_updated`, `open_source_removed` from `updateProfile` when `openSourceContributions` changes.
- **Stack and tools:** Log `stack_tool_added` / `stack_tool_removed` (or `stack_tools_updated`) from `updateProfile` when `stackAndTools` changes.
- **My setup:** Log `my_setup_added`, `my_setup_updated`, `my_setup_removed` from `updateProfile` when `mySetup` changes.

If you want this implemented in the repo (AuditLog model, helper, and all call sites), say “implement it” and switch to Agent mode so the edits can be applied.