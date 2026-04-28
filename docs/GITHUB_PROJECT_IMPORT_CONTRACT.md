# GitHub → projects import — uniqueness contract

Defines how we treat **duplicate repositories** when importing from GitHub into **`user.projects`** (open source flow and any batch client).

**Implementation references:** `server/src/routes/github.routes.ts` (`POST /repos/import-batch`), `webapp/src/lib/githubProjectIdentity.ts`, `OpenSourceContent` in `webapp/src/app/settings/page.tsx`.

---

## Identity of a GitHub-sourced project

| Field | Role |
|--------|------|
| **`repoFullName`** | Primary key for “same repo” (e.g. `octocat/Hello-World`). Compared **case-insensitively**. |
| **`publicationUrl`** | Secondary check; normalized to **`https://github.com/<owner>/<repo>`** with **lowercase** path segments for comparison. |
| **`source`** | Must be **`'github'`** for rules below to apply. Manual projects are not deduped by this contract unless they share the same URL / repo id. |

---

## Within a single batch request (`POST /api/github/repos/import-batch`)

- Input: **`fullNames: string[]`** (max 15 entries; invalid strings may appear in **`failed`**).
- **Duplicate `fullName` values** (after trim, compared **case-insensitively**): only the **first** occurrence is fetched; later duplicates are reported in **`failed`** with message **`Duplicate in request: same repository listed more than once.`**
- Response shape: `{ success, projects, failed[] }` — **`projects`** has **no** duplicate repos for the same logical `owner/repo`.

---

## Against the user’s existing `projects` array (client before PATCH)

Before calling the API or merging into **`projects`**, the client should skip add if **any** existing project matches:

1. **`source === 'github'`** and **`repoFullName`** (normalized) equals the candidate **case-insensitively**, **or**
2. **`publicationUrl`** (normalized) equals **`https://github.com/<owner>/<repo>`** (lowercase path) for the candidate.

Use **`projectMatchesGithubRepo(project, fullName)`** from `webapp/src/lib/githubProjectIdentity.ts`.

---

## Remove / list operations

- **Remove** by `repoFullName` from UI should use the same **`projectMatchesGithubRepo`** (or equivalent case-insensitive **`repoFullName`**) so removal works regardless of casing drift.

---

## Server-side enforcement on `PATCH` (optional future)

Today **uniqueness is enforced in the client** and **deduped in batch**. A stricter approach would reject **`projects`** payloads that contain two GitHub entries with the same normalized `repoFullName` (server Zod or service). Not required for correctness if the client follows this contract.

---

## Limits

- **Open Source UI:** up to **7** linked repos (`MAX_OPEN_SOURCE_REPOS` in settings).
- **Batch API:** at most **15** names per request.
