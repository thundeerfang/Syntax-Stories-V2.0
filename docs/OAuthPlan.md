# OAuth rollout plan (week by week)

Yes — you can develop it **week by week**, and the order you listed is a **reasonable ROI order**. A few practical notes so the phases don’t fight each other:

### Week 1 — Provider registry + route factory
- **Low risk**, mostly mechanical: extract config, loop `app.get(...)`, keep the **same URLs** (`/auth/google/login`, etc.) so the webapp and OAuth app configs don’t change yet.
- **Do this first** so Weeks 2–4 touch fewer duplicated strings.
- **Add a short comment or test** documenting that `/auth` JSON router must still not swallow OAuth paths (or plan Week 4 prefix split).

### Week 2 — Shared `oauth.service` (normalize + `handleProviderAuth`)
- **Higher churn**: you’ll move logic out of `passport/*.ts` into one service while keeping behavior identical (login / signup / link / errors).
- **Strategy**: keep Passport strategies as **thin wrappers** that call `oauthService.handleProviderAuth` — don’t rip out Passport in this week.
- **Ship in slices** if needed: e.g. Google + GitHub first, then Facebook/Discord/X, with parity tests or manual checklist per provider.

### Week 3 — Redis exchange code (no tokens in URL)
- **Highest security ROI**; can be done **before or after** Week 2, but **after Week 1** is easiest (one place to change redirects).
- **Contract change**: backend redirect becomes `?code=...` (and for 2FA maybe `?challenge=...` only — your doc’s ideal); frontend **must** call `POST /auth/oauth/exchange` (or whatever path you choose) before `setAuth`.
- **Coordinate**: all five callback pages (or one unified page in Week 4) need the same exchange call.
- **Backward compatibility** (optional): support **both** old query tokens and new code for one release behind a flag, then remove old path — reduces downtime if you have users mid-deploy.

### Week 4 — Unified Next.js callback (`/auth/callback/[provider]` or single page + query)
- **Mostly frontend + redirects**: update `clientCallbackSlug` in config to match one route pattern; delete or redirect old routes.
- Easiest **after** Week 3 so you only wire **one** “read `code` → exchange → setAuth” flow (and one 2FA branch).

### Cross-cutting things to not forget
- **OAuth provider dashboards**: callback URLs must stay valid if you change paths (e.g. if you later move to `/auth/oauth/google/callback`).
- **Fix the Facebook Redis key inconsistency** when you touch link flow (if still present) — fits Week 2 or 3.
- **Mobile / future clients**: exchange endpoint is JSON — good for apps; document it as the **only** way to get tokens after browser OAuth.

### Honest pacing
- **Week 1**: often 1–2 days if routes are copy-paste.
- **Week 2**: usually **more than** a week if you want zero behavioral drift across five providers — plan **two weeks** or narrow scope per release.
- **Week 3**: backend + frontend + deploy discipline; the exchange API is the **critical path**.
- **Week 4**: cleanup; quicker if Week 3 already uses a single exchange helper.

So: **yes, week-wise is viable**; treat **Week 2 as the longest / most test-heavy**, and **ship Week 3’s exchange as soon as the shared redirect path is stable** (even if provider registry landed in Week 1).

**Implemented status** and hardening notes: see [OAuth-plan-comparison.md](./OAuth-plan-comparison.md).
