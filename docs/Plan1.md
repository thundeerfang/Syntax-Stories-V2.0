## Auth Migration Plan

Split [`server/src/modules/auth/auth.controller.ts`](server/src/modules/auth/auth.controller.ts) by feature slice, keep [`server/src/modules/auth/auth.routes.ts`](server/src/modules/auth/auth.routes.ts) as the single mount point, and avoid changing route URLs or middleware order during the refactor.

### Current handler map
Handlers already extracted:
- OTP lives in [`server/src/modules/auth/controllers/otp.controller.ts`](server/src/modules/auth/controllers/otp.controller.ts): `getAltchaChallenge`, `sendOtp`, `signupEmail`, `verifyOtp`

Handlers still in [`server/src/modules/auth/auth.controller.ts`](server/src/modules/auth/auth.controller.ts):
- Session / identity: `refresh`, `logout`, `revokeSessionByRefreshToken`, `me`
- Profile: `updateProfile`, `parseCv`
- 2FA: `setupTwoFactor`, `enableTwoFactor`, `disableTwoFactor`, `verifyTwoFactorLogin`
- QR login: `initQrLogin`, `approveQrLogin`, `pollQrLogin`
- Email change: `initEmailChange`, `verifyEmailChange`, `cancelEmailChange`
- OAuth linking: `linkRequest`, `disconnectProvider`
- Extra session/security endpoints not mounted here today: `listSessions`, `revokeSession`, `logoutAll`, `logoutOthers`, `listSecurityEvents`
- Account lifecycle: `createIntent`, `deleteAccount`

## Target file layout
Create these controller files under [`server/src/modules/auth/controllers/`](server/src/modules/auth/controllers/):
- `session.controller.ts`
- `profile.controller.ts`
- `twoFactor.controller.ts`
- `qrLogin.controller.ts`
- `emailChange.controller.ts`
- `oauthLink.controller.ts`
- `account.controller.ts`

Optionally add auth-only services under [`server/src/modules/auth/services/`](server/src/modules/auth/):
- `twoFactor.service.ts`
- `qrLogin.service.ts`
- `emailChange.service.ts`
- `accountIntent.service.ts`

## Safest extraction order

### Wave 1: Email change
Move:
- `initEmailChange`
- `verifyEmailChange`
- `cancelEmailChange`

Why first:
- Small cohesive workflow
- Limited blast radius
- Clear Redis/mail boundary
- Easier than session or profile

Destination:
- [`server/src/modules/auth/controllers/emailChange.controller.ts`](server/src/modules/auth/controllers/emailChange.controller.ts)

### Wave 2: OAuth linking
Move:
- `linkRequest`
- `disconnectProvider`

Why second:
- Small paired feature
- Low coupling to auth login core
- Easy route rewiring in [`server/src/modules/auth/auth.routes.ts`](server/src/modules/auth/auth.routes.ts)

Destination:
- [`server/src/modules/auth/controllers/oauthLink.controller.ts`](server/src/modules/auth/controllers/oauthLink.controller.ts)

### Wave 3: Profile
Move:
- `me`
- `updateProfile`
- `parseCv`

Why third:
- Strong feature cohesion around account/profile data
- `me` fits naturally with profile reads
- `parseCv` belongs near profile enrichment

Destination:
- [`server/src/modules/auth/controllers/profile.controller.ts`](server/src/modules/auth/controllers/profile.controller.ts)

Risk:
- `updateProfile` is the hardest handler in the file because it contains profile patching plus granular audit diff logging. Move it as one coherent block first; do not try to refactor its internals in the same PR.

### Wave 4: QR login
Move:
- `initQrLogin`
- `approveQrLogin`
- `pollQrLogin`

Why fourth:
- Self-contained flow
- Easier once profile/email-change churn is gone
- Depends on shared auth/session helpers but not as central as refresh/logout

Destination:
- [`server/src/modules/auth/controllers/qrLogin.controller.ts`](server/src/modules/auth/controllers/qrLogin.controller.ts)

### Wave 5: 2FA
Move:
- `setupTwoFactor`
- `enableTwoFactor`
- `disableTwoFactor`
- `verifyTwoFactorLogin`

Why fifth:
- More coupled to session issuance and auth challenge handling
- Better to move after QR and profile so shared auth helpers are clearer

Destination:
- [`server/src/modules/auth/controllers/twoFactor.controller.ts`](server/src/modules/auth/controllers/twoFactor.controller.ts)

### Wave 6: Session / identity
Move:
- `refresh`
- `logout`
- `revokeSessionByRefreshToken`
- extra session endpoints if you intend to expose them: `listSessions`, `revokeSession`, `logoutAll`, `logoutOthers`, `listSecurityEvents`

Why late:
- Highest live-path risk
- Touches JWT/session semantics directly
- Should happen after smaller slices prove the pattern

Destination:
- [`server/src/modules/auth/controllers/session.controller.ts`](server/src/modules/auth/controllers/session.controller.ts)

### Wave 7: Account lifecycle
Move:
- `createIntent`
- `deleteAccount`

Why last:
- Highest blast radius
- Uses intent tokens and destructive account actions
- Best done after helper extraction is settled

Destination:
- [`server/src/modules/auth/controllers/account.controller.ts`](server/src/modules/auth/controllers/account.controller.ts)

## Shared helpers to extract or reuse first
Before or during the first 1-2 waves, consolidate these helpers so new files do not duplicate them again:

Reuse existing files:
- [`server/src/services/session.service.ts`](server/src/services/session.service.ts)
- [`server/src/services/authLogin.service.ts`](server/src/services/authLogin.service.ts)
- [`server/src/modules/auth/securityEventLog.ts`](server/src/modules/auth/securityEventLog.ts)
- [`server/src/shared/redis/keys.ts`](server/src/shared/redis/keys.ts)
- [`server/src/shared/audit/auditLog.ts`](server/src/shared/audit/auditLog.ts)
- [`server/src/shared/audit/events.ts`](server/src/shared/audit/events.ts)
- [`server/src/utils/authChallenge.ts`](server/src/utils/authChallenge.ts)

Extract from `auth.controller.ts` into lower-level shared/auth service files:
- `getClientMeta`
- `hashToken`
- `storeIntent`
- `getTwoFactorSetupSecret`
- `storeTwoFactorSetupSecret`

Best placement:
- request metadata helper in `shared/` or `utils/`
- token hashing helper in `shared/` or `services/`
- intent / 2FA setup Redis helpers in `modules/auth/services/`

## Route rewiring rule
Each wave should only:
1. Move handlers to a new controller file
2. Update imports in [`server/src/modules/auth/auth.routes.ts`](server/src/modules/auth/auth.routes.ts)
3. Leave route paths and middleware order unchanged

Example pattern in `auth.routes.ts` after a few waves:
- OTP imports from `controllers/otp.controller`
- Email-change imports from `controllers/emailChange.controller`
- Profile imports from `controllers/profile.controller`
- Remaining handlers still temporarily imported from `auth.controller`

That keeps each PR small and reversible.

## Dependency rules to avoid circular imports
- Controllers must import services/shared/config/models, not other controllers
- Keep [`server/src/modules/auth/auth.routes.ts`](server/src/modules/auth/auth.routes.ts) as the only place combining controller imports
- Do not create a barrel that re-exports both controllers and services from the same auth index file
- Do not import Express response helpers upward into service code

## Suggested PR breakdown
1. PR 1: extract `emailChange.controller.ts`
2. PR 2: extract `oauthLink.controller.ts`
3. PR 3: extract `profile.controller.ts` with `me` and `parseCv`, then move `updateProfile`
4. PR 4: extract `qrLogin.controller.ts`
5. PR 5: extract `twoFactor.controller.ts`
6. PR 6: extract `session.controller.ts`
7. PR 7: extract `account.controller.ts`
8. PR 8: delete or shrink leftover [`server/src/modules/auth/auth.controller.ts`](server/src/modules/auth/auth.controller.ts)

## Success criteria
- [`server/src/modules/auth/auth.routes.ts`](server/src/modules/auth/auth.routes.ts) keeps the same public API
- No controller-to-controller imports
- `auth.controller.ts` shrinks each wave
- Shared helpers stop duplicating request meta / token hash logic
- Typecheck stays green after each slice

If you want, the next step can be a **PR-by-PR checklist for Wave 1 and Wave 2**, including exact imports to move and what to test after each extraction.