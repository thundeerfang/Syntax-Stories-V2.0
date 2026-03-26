Here’s the **target backend architecture** I’d aim for next, based on where your codebase is now.

## Target shape

```text
server/src/
  app.ts
  index.ts

  bootstrap/
    index.ts
    registerApiRoutes.ts
    registerAuthModuleRoutes.ts
    registerOAuthRoutes.ts
    registerUploadRoutes.ts
    registerAppListeners.ts

  modules/
    auth/
      auth.routes.ts
      controllers/
        otp.controller.ts
        session.controller.ts
        profile.controller.ts
        twoFactor.controller.ts
        qrLogin.controller.ts
        emailChange.controller.ts
        account.controller.ts
        oauthLink.controller.ts
      services/
        authChallenge.service.ts
        twoFactor.service.ts
        qrLogin.service.ts
        emailChange.service.ts
        accountIntent.service.ts
      policies/
        authResponse.mapper.ts
      types/
        auth.types.ts
      index.ts

    follow/
      follow.routes.ts
      follow.controller.ts
      follow.service.ts
      follow.contracts.ts

    analytics/
      analytics.routes.ts
      analytics.controller.ts
      analytics.service.ts

    uploads/
      upload.routes.ts
      upload.controller.ts
      upload.service.ts
      imageProcessing.service.ts
      upload.contracts.ts

  services/
    session.service.ts
    token.service.ts
    revoke.service.ts
    authLogin.service.ts

  infrastructure/
    mail/
      sendAuthEmail.ts
      provider/
        smtpProvider.ts
        resendProvider.ts
    storage/
      localDiskUploadStorage.ts
      s3UploadStorage.ts
      r2UploadStorage.ts
    logging/
      logger.ts

  shared/
    audit/
      auditLog.ts
      events.ts
    contracts/
      authApi.ts
      followApi.ts
      uploadApi.ts
    events/
      appEvents.ts
    errors/
      httpErrors.ts
      sendAppHttpError.ts
    metrics/
    redis/
      keys.ts
```

## What to move first

### 1. Split `auth.controller.ts`
Move by behavior, not by helper type.

- `session.controller.ts`
  - `refresh`
  - `logout`
  - `revokeSessionByRefreshToken`
  - maybe session list/revoke helpers if you add them
- `profile.controller.ts`
  - `me`
  - `updateProfile`
  - `parseCv`
- `twoFactor.controller.ts`
  - `setupTwoFactor`
  - `enableTwoFactor`
  - `disableTwoFactor`
  - `verifyTwoFactorLogin`
- `qrLogin.controller.ts`
  - `initQrLogin`
  - `approveQrLogin`
  - `pollQrLogin`
- `emailChange.controller.ts`
  - `initEmailChange`
  - `verifyEmailChange`
  - `cancelEmailChange`
- `account.controller.ts`
  - delete-account / intent-token style handlers
- `oauthLink.controller.ts`
  - `linkRequest`
  - `disconnectProvider`

Keep `auth.routes.ts` as the single mount point.

## Controller rule going forward

Controllers should mostly do only this:

1. Read request input
2. Call service
3. Return mapped JSON
4. Throw typed HTTP errors when needed

That means:
- move Redis token storage helpers out of `auth.controller.ts`
- move 2FA setup persistence out
- move QR login state ops out
- move email-change workflow out

## Service boundaries

### Keep in `services/`
Cross-module services:
- `session.service.ts`
- future `token.service.ts`
- future `revoke.service.ts`

### Put inside `modules/auth/services/`
Auth-only workflow services:
- `authChallenge.service.ts`
- `twoFactor.service.ts`
- `qrLogin.service.ts`
- `emailChange.service.ts`
- `accountIntent.service.ts`

That gives you a clean split:
- `services/` = reusable platform/domain services
- `modules/auth/services/` = auth feature workflows

## Error architecture target

You already have the right primitives. The missing part is adoption.

Target policy:
- service detects business problem
- throw `ValidationHttpError`, `AuthHttpError`, `RateLimitHttpError`
- controller either:
  - lets it bubble to `errorHandler`, or
  - if inside transactional catch logic, uses `sendAppHttpError`

Use typed errors for:
- missing/invalid 2FA challenge
- invalid OTP / expired OTP
- disabled account
- Redis-required workflow unavailable
- invalid email-change tokens
- session not found / revoked
- rate-limit conditions

## Event architecture target

Current event bus is good as a seam, but expand it into a real internal event layer.

Add events like:
- `auth.otp.sent`
- `auth.otp.verify.failed`
- `auth.login.success`
- `auth.session.revoked`
- `mail.send.failed`
- `upload.completed`

Then listeners in `registerAppListeners.ts` can handle:
- audit
- metrics
- alerts/logging

Rule:
- controllers/services emit events
- listeners do side effects
- avoid putting metrics/audit directly inline everywhere

## Upload architecture target

Right now uploads are still route-driven and disk-driven.

Target:
- `upload.controller.ts` handles request/response only
- `upload.service.ts` handles workflow
- `imageProcessing.service.ts` handles `sharp` transforms
- storage implementations handle persistence:
  - `localDiskUploadStorage.ts`
  - `s3UploadStorage.ts`
  - `r2UploadStorage.ts`

Ideal flow:

```text
request
-> upload.controller
-> upload.service
-> imageProcessing.service
-> UploadStorage.save(...)
-> return public URL / metadata
```

That removes `fs/path/multer.diskStorage` assumptions from the route layer.

## Contracts target

Auth is already the pattern. Extend it to:
- `shared/contracts/followApi.ts`
- `shared/contracts/uploadApi.ts`
- maybe `shared/contracts/profileApi.ts`

Then webapp clients can import from `@contracts/*` the same way auth already does.

## Observability target

Add:
- `infrastructure/logging/logger.ts`
- structured JSON logs
- request ID attached automatically
- event listeners emitting counters
- mail failure metrics
- OTP success/failure metrics
- upload failure metrics

## Recommended implementation order

1. Split `auth.controller.ts` into feature controllers
2. Move auth helper/workflow logic into `modules/auth/services/*`
3. Adopt typed HTTP errors across auth flows
4. Expand `AppEventMap` and listeners
5. Extract upload workflow into controller/service/storage layers
6. Add non-auth shared contracts
7. Add structured logging and ops metrics

## Bottom-line target

You want the system to become:

- `bootstrap/` for app assembly
- `modules/*` for feature entrypoints
- `modules/*/controllers` for HTTP only
- `modules/*/services` for feature workflows
- `services/` for reusable domain services
- `infrastructure/` for providers/adapters
- `shared/` for cross-cutting contracts, errors, events, audit, metrics

That would fit your current codebase well without rewriting everything.

If you want, I can next turn this into a **concrete migration plan for `auth.controller.ts`**, with exact handler-to-file mapping and safest extraction order.