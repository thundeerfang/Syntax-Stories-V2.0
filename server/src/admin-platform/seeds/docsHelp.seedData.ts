import type { DocsHelpSeedItem } from './documentationHelpSeed.types.js';

export type { DocsHelpSeedItem };

/** Default product documentation for `/docs` — seeded via `npm run seed:docs`. */
export const DOCS_HELP_SEED: DocsHelpSeedItem[] = [
  {
    slug: 'syntax-overview',
    title: 'Syntax Overview',
    icon: 'sparkles',
    sortOrder: 0,
    tags: ['overview'],
    summary:
      'What Syntax Stories is, how the platform is organized, and where product documentation lives.',
    body: `# Syntax Overview

Syntax Stories is a community platform for developers who read, write, and share technical stories. This documentation describes how the product works from a user and integrator perspective.

## What you can do

- **Read** posts on the home feed, **Explore**, **Trending**, and topic pages.
- **Write** markdown blogs from the **Write** workspace.
- **Follow** writers and topics; manage **Bookmarks** and **Squads**.
- **Sign in** with email OTP or OAuth (Google, GitHub, Twitch, and more).

## Documentation vs Help

| Surface | URL | CMS category | Purpose |
|--------|-----|--------------|---------|
| Product docs | \`/docs\` | \`documentation\` | Longer guides (this site) |
| Help center | \`/help\` | \`general\` | Short FAQ answers |

Articles in category **documentation** are listed automatically by the public Help API and appear in the docs sidebar after you run \`npm run seed:docs\`.

## Related topics

- [Syntax Stories platform](/docs/syntax-stories) — product positioning and core areas.
- [Users & accounts](/docs/users-and-accounts) — sign-up, sign-in, and OAuth journeys.
- [Blogs overview](/docs/blogs-overview) — write, publish, engage (after \`npm run seed:docs:blogs\`).
`,
  },
  {
    slug: 'syntax-stories',
    title: 'Syntax Stories',
    icon: 'book-open',
    sortOrder: 10,
    tags: ['overview'],
    summary:
      'The Syntax Stories product: reading, writing, squads, profiles, and how authenticated features fit together.',
    body: `# Syntax Stories

Syntax Stories connects developers through long-form posts, profiles, and community spaces.

## Core surfaces

- **Feed & Explore** — discover posts outside your following graph.
- **Write** (\`/blogs/write\`) — create and publish markdown articles.
- **Profile** (\`/u/username\`) — public identity, projects, and activity.
- **Squads** (\`/squads\`) — themed communities with join/request flows.
- **Settings** (\`/settings\`) — profile, security, connected OAuth accounts, and email.

## Accounts

Most journeys start at **/signup** or **/login**. Those routes open the global **auth dialog** on the home page. Email sign-in uses a **one-time code** (OTP) sent to your inbox—not a traditional password on the public app.

Social sign-in uses OAuth: you leave the site briefly, approve the provider, and return to \`/auth/callback/{provider}\` where the session is established.

## Where to go next

Start with [Users & accounts](/docs/users-and-accounts), then follow the sign-up, sign-in, and OAuth articles in order. For publishing and engagement, see [Blogs overview](/docs/blogs-overview).
`,
  },
  {
    slug: 'users-and-accounts',
    title: 'Users & Accounts',
    icon: 'user-plus',
    sortOrder: 100,
    tags: ['users', 'auth'],
    summary:
      'Section guide for account creation, sign-in, email OTP, recovery, and OAuth providers.',
    body: `# Users & Accounts

This section documents every public authentication journey on Syntax Stories.

## Entry routes

| Route | Behavior |
|-------|----------|
| \`/signup\` | Opens auth dialog in **Create account** mode; stores \`?ref=\` invite codes in session storage. |
| \`/login\` | Opens auth dialog in **Sign in** mode; shows OAuth errors from \`?error=\` in the URL. |

Both routes redirect to \`/\` with the dialog open once the client hydrates.

## Auth dialog steps

1. **Welcome** — OAuth grid + “Sign in with email”.
2. **Create account** — OAuth (requires Terms + Privacy) or email signup.
3. **Sign up with email** — name + email → OTP.
4. **Sign in with email** — email → OTP.
5. **Check your inbox** — 6-digit code; optional authenticator step if 2FA is enabled.

## Articles in this section

| Topic | Doc |
|-------|-----|
| Sign up (email + invite) | [Sign up journey](/docs/signup-journey) |
| Sign in (email OTP) | [Sign in journey](/docs/sign-in-journey) |
| OTP verification | [Email OTP verification](/docs/email-otp-verification) |
| Recovery & email change | [Account recovery](/docs/account-recovery) |
| OAuth overview | [OAuth sign-in & sign-up](/docs/oauth-overview) |
| Google | [Google OAuth](/docs/oauth-google) |
| GitHub | [GitHub OAuth](/docs/oauth-github) |
| Twitch | [Twitch OAuth](/docs/oauth-twitch) |
| Other providers | [Facebook, Discord, and X](/docs/oauth-other-providers) |
| Linked accounts | [Connected accounts](/docs/connected-accounts) |

For quick troubleshooting, see **/help/sign-in** on the main webapp.
`,
  },
  {
    slug: 'signup-journey',
    title: 'Sign Up Journey',
    icon: 'user-plus',
    sortOrder: 110,
    tags: ['users', 'auth', 'signup'],
    summary:
      'End-to-end account creation: /signup, legal consent, email OTP, invite referrals, and OAuth signup URLs.',
    body: `# Sign Up Journey

## 1. Open signup

Visit **/signup** (or choose **Create one** from the welcome step). If you are already signed in, you are redirected to **/**.

### Invite / referral (\`?ref=\`)

When the URL contains \`?ref=CODE\`, the webapp stores \`pendingReferralCode\` in **sessionStorage** (uppercased). OAuth signup links append the same code as \`?ref=\` on the API start URL so referrals attach to new accounts.

## 2. Choose a method

### OAuth signup

On **Create account**, accept **Terms of Service** and **Privacy Policy** (both required). Social buttons then navigate to:

- \`{API}/auth/google/signup\`
- \`{API}/auth/github/signup\`
- \`{API}/auth/twitch/signup\`
- …and the same pattern for Facebook, Discord, and X.

See [OAuth sign-in & sign-up](/docs/oauth-overview) for the return path.

### Email signup

1. Tap **Sign up with email**.
2. Enter **full name** and **email**.
3. Submit **Create account** (ALTCHA may be required when enabled).
4. Move to **Check your inbox** — see [Email OTP verification](/docs/email-otp-verification).

## 3. After verification

A valid OTP creates the session (JWT in client storage), closes the dialog, and lands you on the app. Complete your profile under **Settings** when prompted.

## Common issues

- **Codes expired** — request a new code from the verify step (respect cooldown).
- **OAuth disabled** — Terms/Privacy must both be checked before provider buttons activate.
- **Already have an account** — use [Sign in journey](/docs/sign-in-journey) instead.
`,
  },
  {
    slug: 'sign-in-journey',
    title: 'Sign In Journey',
    icon: 'key',
    sortOrder: 120,
    tags: ['users', 'auth', 'signin'],
    summary:
      'Complete email and OAuth sign-in flow from /login through the auth dialog and session establishment.',
    body: `# Sign In Journey

## 1. Open sign-in

Visit **/login**. The page:

1. Waits for auth store hydration.
2. If already signed in → redirect **/**.
3. Otherwise reads \`?error=\` (OAuth failures show a toast) and opens the auth dialog on **/** in login mode.

## 2. Welcome step

Pick a provider (Google, GitHub, Twitch, Facebook, Discord, X) or **Sign in with email**.

OAuth starts at \`{API}/auth/{provider}/login\` in the same browser tab. The app sets a short-lived “OAuth pending” flag so loaders behave correctly while you are on the provider site.

## 3. Email sign-in

1. **Sign in with email** → enter address → **Send login code**.
2. Check inbox (and spam) for a 6-digit OTP.
3. Enter the code on **Check your inbox**.

Details: [Email OTP verification](/docs/email-otp-verification).

## 4. Two-factor (optional)

If your account has authenticator 2FA enabled, the verify step collects a **TOTP code** instead of (or after) email OTP, depending on server challenge state.

## 5. Session

Successful verification stores the access token client-side and refreshes the user profile (including linked OAuth flags).

## Help links

- **Trouble signing in?** → **/help/sign-in** (static tips + FAQ).
- OAuth errors on **/login?error=...** are surfaced once per visit (deduped toast).
`,
  },
  {
    slug: 'email-otp-verification',
    title: 'Email OTP Verification',
    icon: 'mail',
    sortOrder: 130,
    tags: ['users', 'auth', 'email'],
    summary:
      'How login and signup codes are sent, entered, resent, and validated—including ALTCHA and attempt limits.',
    body: `# Email OTP Verification

Syntax Stories uses **email one-time passwords** for both signup and sign-in. There is no separate “password” field on the public auth dialog.

## Flow

1. User submits email (login or signup form).
2. API sends a **6-digit code** to that address.
3. UI step **Check your inbox** shows the target email and a numeric input (\`one-time-code\` autocomplete).
4. User submits the code; API returns tokens or an error with **attempts remaining**.

## Resend

From the verify step, **Resend code** may open an ALTCHA challenge when bot protection is on. A **cooldown timer** prevents rapid resends. Resend uses the same email and repeats either \`sendLoginOtp\` or \`signUp\` depending on whether you arrived from login or signup.

## ALTCHA

When \`altchaOn\` is enabled, send and resend actions include an ALTCHA payload to reduce abuse.

## 2FA overlap

If the server returns a two-factor challenge, the verify form switches to **Authenticator code** mode until \`verifyTwoFactor\` succeeds.

## Tips

- Codes are time-limited; request a fresh one if expired.
- Use the same email you registered with.
- For account access issues, see [Account recovery](/docs/account-recovery).
`,
  },
  {
    slug: 'account-recovery',
    title: 'Account Recovery',
    icon: 'lock',
    sortOrder: 140,
    tags: ['users', 'auth', 'email'],
    summary:
      'Regain access with a new login OTP, troubleshoot sign-in, and change your primary email in Settings.',
    body: `# Account Recovery

The public app does **not** use email/password credentials for members. Recovery means proving access to your email (OTP) or linked OAuth providers.

## Sign-in again

1. Go to **/login** → **Sign in with email**.
2. Request a **new login code** for the address on the account.
3. Enter the OTP on the verify step.

If you use OAuth, sign in with the same provider you used when creating the account ([OAuth overview](/docs/oauth-overview)).

## Wrong or lost email

- Try every address you may have used (work vs personal).
- If you still have an OAuth link, use that provider button on the welcome step.
- Visit **/help/sign-in** for FAQ-style troubleshooting.

## Change primary email (signed in)

**Settings → Security → Email** runs a two-step verification:

1. **Initiate** — enter the new address; codes are sent to **current** and **new** inboxes.
2. **Verify** — submit both 6-digit codes.

On success, the profile email updates and **OAuth sessions may be terminated** so you can re-link providers safely.

## Security notes

- Never share OTP codes.
- Report suspicious login emails to support via **/contact**.
- Review **Connected accounts** after an email change.
`,
  },
  {
    slug: 'oauth-overview',
    title: 'OAuth Sign-In & Sign-Up',
    icon: 'shield',
    sortOrder: 150,
    tags: ['users', 'auth', 'oauth'],
    summary:
      'How OAuth works on Syntax Stories: start URLs, callbacks, exchange, signup vs login, and linking accounts.',
    body: `# OAuth Sign-In & Sign-Up

OAuth lets users authenticate with a trusted provider instead of email OTP.

## Supported providers

| Provider | Login start | Signup start | Callback |
|----------|-------------|--------------|----------|
| Google | \`/auth/google/login\` | \`/auth/google/signup\` | \`/auth/callback/google\` |
| GitHub | \`/auth/github/login\` | \`/auth/github/signup\` | \`/auth/callback/github\` |
| Twitch | \`/auth/twitch/login\` | \`/auth/twitch/signup\` | \`/auth/callback/twitch\` |
| Facebook | \`/auth/facebook/login\` | \`/auth/facebook/signup\` | \`/auth/callback/facebook\` |
| Discord | \`/auth/discord/login\` | \`/auth/discord/signup\` | \`/auth/callback/discord\` |
| X | \`/auth/x/login\` | \`/auth/x/signup\` | \`/auth/callback/x\` |

Legacy paths like \`/google-callback\` redirect permanently to \`/auth/callback/google\`.

## Browser journey

1. User clicks a social button → full navigation to API host.
2. Provider consent screen.
3. Provider redirects to \`auth/callback/{provider}\` on the webapp.
4. Client calls \`POST /auth/oauth/exchange\` with the callback payload.
5. Session token stored; user redirected into the app.

Signup requires **Terms + Privacy** acceptance before buttons are enabled.

## Linking while logged in

Authenticated users can connect or disconnect providers under **Settings → Connected accounts** (see [Connected accounts](/docs/connected-accounts)).

## Deep dives

- [Google OAuth](/docs/oauth-google)
- [GitHub OAuth](/docs/oauth-github)
- [Twitch OAuth](/docs/oauth-twitch)
- [Facebook, Discord, and X](/docs/oauth-other-providers)
`,
  },
  {
    slug: 'oauth-google',
    title: 'Google OAuth',
    icon: 'key',
    sortOrder: 160,
    tags: ['users', 'auth', 'oauth', 'google'],
    summary:
      'Google login and signup URLs, callback handling, and linking Google to an existing Syntax Stories account.',
    body: `# Google OAuth

## Sign in

From the auth dialog **Welcome** step, **Google** links to:

\`\`\`
{API_BASE}/auth/google/login
\`\`\`

## Sign up

From **Create account** (with legal checkboxes checked):

\`\`\`
{API_BASE}/auth/google/signup
\`\`\`

If \`pendingReferralCode\` exists in session storage, the signup URL includes \`?ref=CODE\`.

## Callback

The provider returns to:

\`\`\`
/auth/callback/google
\`\`\`

The webapp exchanges the callback for a session via the OAuth exchange API. Unknown callback paths redirect to **/login**.

## Account data

Google may supply email, name, and avatar used to populate or update your Syntax Stories profile. Existing users match on \`googleId\`.

## Manage connection

**Settings → Connected accounts** — connect, disconnect, or sign in again with Google. Disconnect clears stored Google tokens server-side.

## Errors

Failed OAuth often redirects to **/login?error=...** with a human-readable message. Retry or use [email OTP](/docs/email-otp-verification) if your account was created with email first.
`,
  },
  {
    slug: 'oauth-github',
    title: 'GitHub OAuth',
    icon: 'key',
    sortOrder: 170,
    tags: ['users', 'auth', 'oauth', 'github'],
    summary:
      'GitHub login and signup, profile URL import, repo sync, and connected-account settings.',
    body: `# GitHub OAuth

## Sign in & sign up

| Action | URL |
|--------|-----|
| Login | \`{API_BASE}/auth/github/login\` |
| Signup | \`{API_BASE}/auth/github/signup\` (+ optional \`?ref=\`) |

Callback route: **/auth/callback/github**.

## Profile & projects

GitHub connection can populate:

- Public **GitHub profile URL** on your Syntax Stories profile.
- **Imported repositories** as portfolio projects (Settings → Projects / Open Source).

Repo identity follows \`owner/repo\` uniqueness—see the GitHub project import contract in the repo docs.

## Settings

**Security → Connected accounts** shows whether GitHub is linked. Disconnect removes \`gitId\` / token fields server-side.

Some features (e.g. open-source section) prompt you to connect GitHub if repos are missing.

## Tips

- Authorize the Syntax Stories OAuth application with the GitHub account you want displayed.
- If login fails, ensure your GitHub email is visible to the app or fall back to [email OTP](/docs/email-otp-verification).
`,
  },
  {
    slug: 'oauth-twitch',
    title: 'Twitch OAuth',
    icon: 'key',
    sortOrder: 180,
    tags: ['users', 'auth', 'oauth', 'twitch'],
    summary:
      'Twitch login and signup flows, callback route, and username handling for new accounts.',
    body: `# Twitch OAuth

## URLs

| Action | URL |
|--------|-----|
| Login | \`{API_BASE}/auth/twitch/login\` |
| Signup | \`{API_BASE}/auth/twitch/signup\` |

The auth dialog shows Twitch with the brand SVG from \`/svg/twitch.svg\`.

## Callback

\`\`\`
/auth/callback/twitch
\`\`\`

Exchange follows the same browser OAuth pattern as Google and GitHub.

## Profile normalization

Twitch supplies \`login\`, \`display_name\`, and \`profile_image_url\`. The server derives a base username and may append random suffixes to avoid collisions when creating new users.

## Errors

Twitch-specific misconfiguration (redirect URI, revoked app) surfaces provider error text on redirect—often as **/login?error=...**.

## Connected accounts

Link or unlink Twitch while signed in under **Settings → Connected accounts** alongside other providers.
`,
  },
  {
    slug: 'oauth-other-providers',
    title: 'Facebook, Discord, and X OAuth',
    icon: 'globe',
    sortOrder: 190,
    tags: ['users', 'auth', 'oauth'],
    summary:
      'Login and signup paths for Facebook, Discord, and X.com (Twitter) on the auth dialog welcome and signup steps.',
    body: `# Facebook, Discord, and X OAuth

These providers use the same **login** vs **signup** URL pattern as Google and GitHub.

## Facebook

- Login: \`{API_BASE}/auth/facebook/login\`
- Signup: \`{API_BASE}/auth/facebook/signup\`
- Callback: \`/auth/callback/facebook\`

## Discord

- Login: \`{API_BASE}/auth/discord/login\`
- Signup: \`{API_BASE}/auth/discord/signup\`
- Callback: \`/auth/callback/discord\`
- Icon: bundled Discord mark in the social grid.

## X (Twitter)

- Login: \`{API_BASE}/auth/x/login\`
- Signup: \`{API_BASE}/auth/x/signup\`
- Callback: \`/auth/callback/x\`

## Signup requirements

All signup buttons stay disabled until **Terms** and **Privacy** checkboxes are checked (same as Google/GitHub/Twitch).

## Linking

Signed-in users can connect or disconnect these providers via the link API (\`google\`, \`github\`, \`facebook\`, \`x\`, \`discord\`, \`twitch\`) documented under [Connected accounts](/docs/connected-accounts).
`,
  },
  {
    slug: 'connected-accounts',
    title: 'Connected Accounts',
    icon: 'settings',
    sortOrder: 200,
    tags: ['users', 'auth', 'oauth', 'settings'],
    summary:
      'Link and unlink OAuth providers after sign-in, session impact, and GitHub-specific features.',
    body: `# Connected Accounts

After you have a session, manage OAuth links in **Settings → Security → Connected accounts**.

## Connect

Choosing **Connect** for a provider starts the same OAuth handshake as login, but in **link** mode for an already authenticated user. Successful linking updates flags on your user profile (visible after refresh).

## Disconnect

Disconnect clears provider IDs and sealed tokens server-side for that provider. You can still sign in with email OTP or another linked provider.

Supported disconnect keys: \`google\`, \`github\`, \`facebook\`, \`x\`, \`discord\`, \`twitch\`.

## GitHub-specific

GitHub linking unlocks repository import and open-source sections. If disconnected, GitHub-sourced projects may remain but sync actions prompt reconnection.

## Email change impact

Changing your primary email can **terminate OAuth sessions** so you re-authenticate providers intentionally. Plan to re-link after a successful email change.

## Audit

Server audit events record \`auth.oauth.connected\`, \`auth.oauth.login\`, and \`auth.oauth.disconnected\` for security review in admin tooling.
`,
  },
];
