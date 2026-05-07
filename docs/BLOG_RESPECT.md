# Blog Respect (product and behavior spec)

**Respect** is the platform’s positive reaction on a **published blog post**. It behaves like a familiar **like** control: a signed-in reader can **give** or **withdraw** Respect on a post, and the post exposes a **public count** of how many distinct accounts currently Respect it. Product copy and UI use **Respect** (verb/noun), not “like,” while the underlying interaction model stays the same as a standard toggle-like.

The first sections describe **intended product behavior and data shape**. Later sections cover **production architecture**—API contracts, consistency, failure semantics, scaling, and operations—and **operational stack** ideas (Redis, queues, observability, workers, deployment). This document does not include implementation source.

---

## Goals

- Let readers signal appreciation without commenting.
- Show **credible** engagement on post surfaces (card, post header, author context).
- Keep the interaction **idempotent** and **cheap** under retries and double taps.
- Align public profile **Respect** totals with **received** Respect across the author’s published work (once wired), replacing placeholder UI counts.

---

## User-facing rules

### Who can Respect

- Only **authenticated** users may add or remove Respect.
- **Anonymous** visitors see counts (if the post is public) but cannot give or withdraw Respect.

### Eligible posts

- Respect applies only to posts that are **published**, **not** soft-deleted, and visible through the same rules as normal public read (e.g. correct author username + slug resolution).
- **Drafts** and **trashed** posts: no public Respect; attempts to set Respect state should fail with a clear, non-leaky error.

### Self-Respect

- **Policy (recommended):** Authors **cannot** Respect their own posts. The control is hidden or disabled for the author, and the API returns a deterministic outcome equivalent to “not counted” (same idea as self-read exclusion for read streaks).
- Alternative (if product prefers): allow self-Respect for morale; still only **one** row per user per post so the count does not inflate artificially beyond one self-vote.

### Respect state (UX vs API)

- **UX:** The control behaves as **give / withdraw** (one action to Respect, another to undo). Copy and affordances can still read as a “toggle,” but the **wire contract** should not rely on ambiguous toggle-only payloads.
- **API contract (official):** Clients send **explicit desired state** `{ "respecting": true | false }`. The server applies idempotent rules (insert / delete / no-op per edge presence and desired state—see the production section). This removes retry, multi-device, and optimistic-UI ambiguity that pure “toggle” APIs create.
- **First apply:** no edge and `respecting: true` → insert edge; count increases by at most one when the write commits.
- **Withdraw:** edge present and `respecting: false` → remove edge; count decreases by at most one when the write commits.
- **Repeat requests** when state already matches must be **safe** (idempotent): no duplicate rows, no negative counts, no double increments.

### UX copy and accessibility

- Primary control label: **Respect** (not “Like”).
- **aria-pressed** (or equivalent) reflects whether the current user has Respected the post.
- Optional: short tooltip clarifying “Show appreciation; tap again to undo.”

---

## Data model (conceptual)

### Per-user–per-post edge

A durable record represents “user U Respects post P.” At most **one** such record per pair.

| Concept | Purpose |
|--------|---------|
| Reader / respecter id | Account that gave Respect |
| Post id | Which blog post |
| Created at | When Respect was added (optional but useful for analytics and “who reacted recently”) |

**Unique constraint:** one row per (respecter, post).

### Denormalized count on the post (optional but recommended)

| Concept | Purpose |
|--------|---------|
| Respect count on `BlogPost` (or sidecar) | Fast reads for listings without aggregating the edge collection on every card |

If the count is denormalized, updates should follow the **official counter consistency stance** in the production section: at early scale, edge and counter mutations should commit in the **same database transaction** when supported; at large scale, counters may become **eventually consistent projections**, with **idempotent reconciliation** as the authoritative repair path so drift cannot become permanent.

### Author-level aggregate

- **Profile Respect** (public stat): recommended definition is **total Respect received** across all **published, non-deleted** posts by that author—either maintained as a field on `User` updated on each successful Respect **state change**, or computed with a bounded query / cache. This matches the idea that Respect on blogs **increases** what others see on the author’s profile.

---

## API behavior (conceptual)

Endpoints should mirror how other blog actions are addressed today (path style, auth header), without prescribing exact URL strings here.

### Set Respect state (authenticated)

- **Method:** POST (or PUT) representing “set my Respect state.”
- **Inputs:** Resolve post by public route context (author username + slug) or internal post id, consistent with the rest of the blog API.
- **Body (official):** `{ "respecting": boolean }` — explicit desired state, not a free-standing “toggle” intent (see production **Make State-Setting the Official API Contract**).
- **Optional:** `Idempotency-Key` (or equivalent) on the request so retries after timeouts can safely return the same outcome.

**Successful responses** should include at least:

- Whether the user **now** Respects the post.
- The post’s **public Respect count** after the operation.
- Optional: author’s **updated received Respect total** for profile sync.

**Error cases:**

- 401 if not logged in.
- 404 if post not found or not eligible.
- 403 if Respect is disallowed (e.g. blocked user, if you add social blocks later).
- 429 if rate limited.

### Read Respect state (for UI)

- **Public / optional-auth GET** on the post payload: include **count** always.
- If the request is authenticated, include **viewerHasRespected** so the client can render the pressed state without an extra round trip.
- **Feeds:** at scale, prefer **batched** or join-based hydration (e.g. `viewerRespectStates` keyed by post id) so a single feed response does not imply N per-post viewer-state queries—see production **Viewer State Optimization** and **Hot-Post Scaling Considerations**.

---

## Concurrency and idempotency

- Use the unique (user, post) constraint so duplicate inserts cannot create double counts.
- With **explicit desired state**, concurrent writes should converge on the **last successful** application to the Respect edge; the returned **viewer state** and **count** must match **committed** persistence.
- Retries from flaky networks should not permanently skew counts: `respecting: true` when an edge already exists is a no-op; `respecting: false` when absent is a no-op.

---

## Rate limiting and abuse

- Per-user limits on Respect **writes** (e.g. per minute) to reduce bot churn and oscillation spam.
- Optional: per-post burst cap from a single account is usually unnecessary if Respect is strictly one edge per user per post; focus on global write rate.
- Respect must **not** affect read streaks; it is a separate signal.

---

## Notifications (optional product)

- When user B Respects user A’s post, user A may receive an in-app notification (“B respected your post …”).
- Batching: multiple Respect events on the same post within a window can collapse to a summary.
- Respect **withdrawn** typically does **not** notify (reduces noise).

---

## Analytics and audit

- Emit an internal event type distinct from `like` if legacy analytics used that name—e.g. `blog_respect_added` / `blog_respect_removed` (or legacy `blog_respect` / `blog_respect_undo`)—so dashboards stay accurate.
- Treat outbound events as **at-least-once**, possibly **duplicated** or **reordered**; consumers must be **idempotent** and, where needed, reconcile against **current persisted edge state** (see production **Event guarantees**).
- Optional admin audit: staff-visible log of extreme abuse patterns (mass Respect scripts).

---

## Relation to existing features

- **Read streak:** orthogonal; Respect does not replace reading time or `BlogReadDay`.
- **Comments / bookmarks / share:** independent; Respect is the lightweight applause signal.
- **Trending / ranking (future):** Raw public counts are **engagement signals only**; trusted or ranking-weighted metrics may diverge (see production **Ranking note** and **Engagement classes**). Document weighting separately in ranking specs.

---

## Rollout checklist (engineering)

- Migrate or create indexes before high traffic.
- Backfill **respectCount** on posts if denormalizing (from edge collection).
- Backfill **user received Respect** if shown on profile.
- Feature flag optional: hide counts until data is stable.

---

## Open decisions (product)

- Exact **self-Respect** policy (forbidden vs allowed once).
- Whether to show **who** Respected (public list vs private vs friends-only).
- Whether Respect is visible on **preview** or **RSS** surfaces.

---

## Summary

Respect is **like** in mechanics—**one user, one post, on/off engagement, public integer count**—with **Respect** branding, **authenticated** writes, **published-only** targets, an **explicit desired-state** API for safe retries and concurrency, **idempotent** application rules, optional **denormalized counts** and **author totals** for profile stats, and clear separation from **read streak** and other social actions.

---

## Production-Grade Improvements for the Respect Architecture

Your current design is already solid for an MVP-to-growth phase system. The improvements below are the ones that actually matter in production environments with:

- retries
- queues
- multiple devices
- moderation
- analytics
- scaling
- future product evolution

---

### 1. Make State-Setting the Official API Contract

#### Current risk

Pure toggle APIs create race-condition ambiguity.

Example:

- Mobile device toggles
- Desktop toggles simultaneously
- Retry occurs after timeout

Final state becomes non-deterministic.

#### Better production design

Use explicit desired state:

```json
{
  "respecting": true
}
```

instead of:

```json
{
  "toggle": true
}
```

#### Why this matters

This gives:

- idempotency
- deterministic retries
- optimistic UI safety
- easier reconciliation
- easier queue replay
- easier audit recovery

#### Production rule

Server behavior should become:

| Existing Edge | Incoming State | Result |
| ------------- | -------------- | ------ |
| absent        | true           | insert |
| present       | true           | no-op  |
| present       | false          | delete |
| absent        | false          | no-op  |

This is one of the biggest architectural upgrades you can make.

---

### 2. Define Canonical Source of Truth

Right now it is implied. In production it must be explicit.

#### Source of truth

The Respect edge collection/table is authoritative.

The following are derived state:

- post `respectCount`
- author received Respect totals
- trending/ranking signals
- analytics aggregates
- notification summaries

Derived state may be recomputed from edges during repair or migration jobs.

#### Why this matters

Eventually:

- cache drift happens
- queue failures happen
- backfills happen
- migrations happen

Without canonical ownership: teams accidentally trust stale counters.

---

### 3. Add Strong Data Invariants

This is extremely important in mature systems.

#### System invariants

The system must guarantee:

- `respectCount >= 0`
- One active Respect edge per `(userId, postId)`
- Draft/deleted posts cannot expose public Respect
- Counts returned by APIs reflect committed persisted state
- Author totals only include eligible published posts
- Removing a Respect edge decrements counts at most once
- Creating a Respect edge increments counts at most once

#### Why this matters

These become:

- test contracts
- migration validation rules
- repair-job checks
- monitoring assertions

---

### 4. Add Repair/Reconciliation Architecture

This is missing and VERY important.

In production:

- counters drift
- jobs fail
- deploys partially succeed
- queues duplicate

You need a recovery story.

#### Reconciliation jobs

Periodic repair jobs may:

- recompute `respectCount`
- recompute author totals
- detect impossible negative counts
- repair drift from edge truth

Repair jobs must be idempotent.

#### This is critical

Without reconciliation: small corruption becomes permanent.

---

### 5. Clarify Transaction Strategy (official counter consistency stance)

The phrase “same logical transaction” is easy to misread. There are **three** distinct architectures often blurred together:

| Model | Characteristics |
| ----- | ----------------- |
| Fully transactional | Respect edge and denormalized counters **commit together** in one database transaction. |
| Async event-driven | Edge write is authoritative; counters and projections **update eventually** via consumers. |
| Hybrid | Synchronous edge + counter on the hot path; **async repair** and reconciliation correct drift. |

These behave **very** differently operationally. **Pick one officially** per lifecycle stage and document it.

#### Counter consistency

If denormalized counters are maintained **synchronously**:

- edge mutation and counter mutation should **commit atomically** when the datastore supports it.

If **eventual** consistency is used for counts or projections:

- derived values must **converge deterministically**,
- and **idempotent reconciliation jobs** must exist as the repair authority.

#### Recommended official production stance

**MVP / early scale**

- Respect edge insertion/removal is **authoritative**.
- Post (and author) counters update **synchronously in the same database transaction** as the edge mutation when supported.

**Large-scale evolution**

- Counters and read projections may become **eventually consistent** and maintained **asynchronously**.
- **Reconciliation jobs** remain the authoritative repair mechanism when projections lag or fail.

#### Why this matters

Teams need explicit clarity when choosing among transactional databases, queue/event pipelines, and CQRS-style systems—so on-call behavior and failure modes stay predictable.

---

### 6. Define Soft Delete / Restore Lifecycle

This is a major missing edge case.

#### Post lifecycle interaction

When a post becomes:

- unpublished
- soft-deleted
- moderated
- hidden

its Respect edges may remain stored, but must stop contributing to:

- public counts
- author totals
- ranking systems

If restored:

- counts and totals may be restored automatically.

#### Why this matters

Otherwise you create:

- irreversible engagement loss
- inconsistent author totals
- moderation nightmares

---

### 7. Add Moderation Layer

This is absolutely necessary before scale.

#### Missing production problem

Bad actors can:

- spam Respect
- mass-create accounts
- manipulate rankings

#### Moderation and trust

The system may exclude:

- suspended accounts
- spam accounts
- rate-abuse accounts
- shadow-banned accounts

from:

- ranking systems
- recommendation systems
- trending systems

while optionally preserving raw public counts.

#### This separation is VERY important

Public counts ≠ trusted ranking signals. Never couple them tightly.

---

### 8. Add Event-Driven Architecture Hooks

Your analytics section is good but incomplete.

#### Domain events

Successful Respect state transitions may emit events:

- `blog_respect_added`
- `blog_respect_removed`

Consumers may include:

- notifications
- analytics
- ranking systems
- recommendation systems
- fraud detection

Event consumers must be idempotent.

#### Event guarantees

Respect-related domain events should be documented as:

- **at-least-once** delivered,
- **potentially duplicated**,
- **not guaranteed globally ordered** (e.g. a `removed` event may be observed before an `add` in some pipelines).

Consumers must be **idempotent** and, when correctness depends on current truth, **reconcile against persisted Respect edge state** (or a trusted read model derived from it)—not against event order alone.

#### Why this matters

Prevents future tight coupling and avoids broken analytics, notifications, or rankers when streams reorder or replay.

---

### 9. Add Write De-Duplication Support

This matters under:

- mobile retries
- flaky networks
- offline queues

#### Production improvement

Support optional:

```http
Idempotency-Key
```

header.

#### Why useful

If:

- client times out
- retries same request

server can safely return previous outcome.

Especially useful later for:

- mobile apps
- queues
- edge networks

---

### 10. Add Read Model Separation

Important at scale.

#### Current problem

Eventually:

- post cards
- feeds
- rankings
- author profiles

become too expensive if tied directly to write tables.

#### Better production architecture

Separate:

**Write model**

- Respect edges

**Read model**

- post counters
- viewer state cache
- profile aggregates
- ranking projections

#### Why this matters

Lets you:

- shard independently
- cache aggressively
- rebuild projections safely

---

### 11. Add Hot-Post Scaling Considerations

Critical for viral posts.

#### Problem

A single viral post can:

- receive thousands of writes/sec
- hammer same row counter

creating DB contention.

#### Production mitigation

Eventually support:

- batched counter updates
- async aggregation
- Redis buffering
- sharded counters

You do NOT need this now, but you should acknowledge future scaling path.

#### Separate concerns (typical bottlenecks)

| Problem | Directional mitigation |
| ------- | ------------------------ |
| Write contention on one post | Sharded or buffered counters; async aggregation |
| Read amplification on feeds | Cache and **read models**; denormalized card fields |
| **viewerHasRespected** across many posts | **Batched** or join-based hydration; feed-oriented APIs |
| Trending / ranking recalculation | **Async** projections; throttle under load |

#### Feed and viewer-state bottleneck

The **dominant** cost at scale is often **not** raw Respect edge inserts—it is **viewer state hydration** (`viewerHasRespected` / map of states) across **feeds and listings**. Document **batched hydration**, **feed-oriented read APIs**, and **viewer-state joins** explicitly (see **Viewer State Optimization**).

---

### 12. Add Viewer State Optimization

This becomes important in feeds.

#### Problem

Rendering 50 posts can cause: 50 viewer-state queries.

#### Better design

Support batched hydration:

```json
{
  "viewerRespectStates": {
    "post1": true,
    "post2": false
  }
}
```

or join-based hydration.

---

### 13. Add Audit Strategy

Very important later.

#### Hard delete vs soft-delete on the edge

**Hard delete** of the active edge:

- simpler mental model,
- smaller active table.

**Soft-delete / tombstone** on the edge row:

- can support analytics recovery and replay,
- but complicates uniqueness (`userId`, `postId`) and “current state” queries.

#### Recommended production stance (social systems)

- **Active edge:** represents **binary current state** only (Respecting or not).
- **Historical events:** optional **immutable append-only** log (or event stream) for adds/removes, abuse investigation, and training—often **cleaner** than overloading the edge table with soft-delete semantics.

#### Audit retention

Respect removal may:

- delete the active edge only, with history living in the **event log**, or
- tombstone/archive interaction history on the edge or in cold storage,

depending on compliance, analytics, or abuse-investigation requirements.

#### Why this matters

Eventually:

- abuse investigations
- moderation disputes
- analytics accuracy

need historical evidence.

---

### 14. Add Ranking Decoupling

Critical future-proofing.

#### Current danger

People later misuse:

```text
respectCount
```

as direct ranking score. Bad idea.

#### Ranking note

Raw Respect count is an engagement signal only.

Ranking systems may additionally consider:

- account trust
- post age decay
- read depth
- comment quality
- follow graph
- spam heuristics

#### Engagement classes

To avoid rankers coupling directly to public UI counters, the platform may maintain **independently**:

- **raw engagement** metrics (what happened in the system, including noisy or abusive traffic),
- **trusted engagement** metrics (filtered by account trust / moderation policy),
- **ranking-weighted engagement** metrics (decayed, normalized, or blended signals for sort and recommendation).

Public **`respectCount`** need not equal any of these internal scores.

---

### 15. Add Caching Semantics

Missing but important.

#### Production clarification

Counts may be:

- eventually cached
- edge-cached
- CDN-cached

but authenticated viewer state should avoid stale pressed-state inconsistencies.

---

### Failure handling (failure semantics)

Success paths and retries are not enough: **partial failures** must be defined.

Examples of ambiguous scenarios without this section:

| Failure | Risk if undefined |
| ------- | ------------------- |
| Edge insert succeeds, counter update fails | Split brain between edge truth and counts |
| Domain event emitted twice | Double notifications or inflated downstream metrics |
| Notification or analytics queue fails | Operators unsure whether to roll back Respect |
| Reconciliation job crashes mid-run | Unknown partial repair state |

**Rule:** The Respect **edge mutation** (authoritative user–post state) is the **canonical** user-visible outcome once committed.

Failures in:

- notifications,
- analytics,
- ranking pipelines,
- cache invalidation,
- projection updates

must **not** roll back committed Respect state. Derived systems **recover** via retries, idempotent consumers, or **reconciliation** against edge truth.

---

### Cache invalidation

Without explicit rules, Respect writes cause **stale UI** across surfaces (feed cards, post detail, author profile, trending).

Successful Respect state changes may **invalidate or schedule refresh** of:

- post engagement caches,
- feed projections,
- author profile aggregates,
- ranking or trending snapshots.

Invalidation should **tolerate delayed propagation** (eventual freshness), while **authenticated viewer-pressed state** should stay consistent enough with the user’s last successful write to avoid obvious contradictions.

---

### Operational protections (overload and backpressure)

Under abuse spikes or viral traffic (e.g. extreme Respect **write** rates), the platform may:

- **degrade non-critical derived systems** (delay notifications, async analytics),
- **queue** heavy recomputation,
- **temporarily suppress** expensive ranking or trending refreshes,

while keeping **canonical Respect writes** and **core read APIs** prioritized within capacity limits.

Document this philosophy so incidents do not force ad-hoc “turn everything off” decisions.

---

### Distributed deployment note

Full multi-region design is not required early. If the platform grows globally, expect:

- **replication lag** and **eventually consistent** counts or viewer state across regions,
- occasional **stale reads** of aggregates.

**Canonical edge uniqueness** for `(userId, postId)` must still be **globally enforced** (single-writer region, global constraint, or equivalent)—so Respect state cannot permanently fork by region.

---

### Final Architectural Assessment

Your current architecture is already:

- far above average MVP quality
- concurrency-aware
- scalable in concept
- extensible

To make it truly production-grade, the biggest upgrades are:

| Priority | Improvement                           |
| -------- | ------------------------------------- |
| Critical | explicit state-setting API            |
| Critical | canonical source-of-truth declaration |
| Critical | reconciliation/repair strategy        |
| Critical | lifecycle/moderation rules            |
| High     | domain events                         |
| High     | invariants                            |
| High     | ranking separation                    |
| Medium   | idempotency keys                      |
| Medium   | hot-post scaling                      |
| Medium   | read-model separation                 |
| Critical | failure semantics (canonical edge vs derived systems) |
| Critical | event ordering and at-least-once consumer rules |
| High     | cache invalidation strategy           |
| High     | authoritative consistency model (official stance) |
| High     | feed hydration / viewer-state batching |

With those additions, the design becomes strong enough for:

- large social blogging platforms
- event-driven systems
- high-concurrency mobile usage
- analytics-heavy environments
- long-term maintainability.

---

## Deeper production analysis

This version crosses from **feature behavior spec** into **production systems design** territory. The architecture is mature enough that the next improvements are less about adding features and more about **reducing operational pain**, **simplifying engineering decisions**, and **avoiding hidden scalability traps**.

The sections above encode the concrete rules (explicit state, source of truth, reconciliation, failure semantics, events, caching, overload behavior, multi-region notes). What follows is a **prioritized reading** of maturity, remaining gaps, and what to defer.

### Biggest improvement you already made

The strongest upgrade is **explicit desired state instead of ambiguous toggle semantics**. That single choice removes a large class of:

- race conditions,
- mobile retry bugs,
- optimistic UI corruption,
- multi-device inconsistency.

It is the most important architectural correction for Respect as a subsystem.

### What is now production-grade

| Area | Status |
| ---- | ------ |
| Idempotency | Strong |
| Concurrency awareness | Strong |
| Denormalized counters | Good |
| Source-of-truth separation | Strong |
| Reconciliation thinking | Excellent |
| Moderation extensibility | Strong |
| Event-driven extensibility | Strong |
| Future scaling awareness | Good |
| Ranking decoupling | Excellent |
| Retry safety | Strong |

Most teams never document half of this.

### Remaining architectural gaps (why the subtle issues matter)

The remaining problems are the kind that only show up **at scale**, in **outages**, in **migrations**, or after **several teams** touch the system. The production sections above are the **authoritative** spec; below is the **analysis** that motivated them.

#### 1. Counter consistency model (three hidden architectures)

Wording like “same logical transaction” can hide **three** different systems:

| Model | Characteristics |
| ----- | --------------- |
| Fully transactional | Edge + counter commit together |
| Async event-driven | Edge authoritative; counters eventually update |
| Hybrid | Sync write + async repair |

They behave very differently in operations. **Mitigation:** choose an **official stance** per stage—see **§5 Clarify Transaction Strategy (official counter consistency stance)**.

#### 2. Failure semantics

Success and retries were documented first; **partial failures** were the largest missing production section.

| Failure | Why it must be defined |
| ------- | ---------------------- |
| Edge insert succeeds, counter update fails | Split brain between truth and UI |
| Event emitted twice | Duplicate side effects if consumers are naive |
| Notification queue fails | Risk of wrongly rolling back Respect |
| Reconciliation job crashes halfway | Unknown partial repair |

**Mitigation:** Respect **edge mutation** is canonical once committed; derived pipelines recover via retries and reconciliation—see **Failure handling (failure semantics)**.

#### 3. Event ordering

Domain events help, but consumers must assume **late**, **duplicated**, and **out-of-order** delivery—for example `remove` observed before `add`.

**Mitigation:** document **at-least-once**, **idempotent** consumers and reconciliation against **persisted state**—see **Event guarantees** under **Domain events**.

#### 4. Tombstone strategy

“Delete edge” vs “soft-delete edge” trades simplicity against investigation and training data.

**Mitigation:** prefer **binary active edge** plus optional **immutable append-only historical events** rather than overloading soft-delete on the edge—see **§13 Add Audit Strategy**.

#### 5. Hot-post and feed strategy (separate the bottlenecks)

Scaling discussion should separate:

| Problem | Solution direction |
| ------- | ------------------ |
| Write contention | Sharded / buffered counters |
| Read amplification | Cache / read model |
| Feed hydration | Batched viewer state |
| Trending recalculation | Async projections |

The **real** bottleneck at scale is often **not** edge inserts—it is **`viewerHasRespected` hydration across feeds**.

**Mitigation:** batched hydration, feed-oriented read APIs, viewer-state joins—see **§11**, **§12**, and **Read Respect state (for UI)** in the product section.

#### 6. Cache invalidation

Caches without invalidation rules produce **stale UI** across cards, detail, profile, and trending after a single click.

**Mitigation:** explicit invalidation targets and **tolerance for delay**—see **Cache invalidation**.

#### 7. Backpressure and abuse spikes

Example: extreme Respect **writes** per minute from automation. Without a philosophy, teams panic-turn off features.

**Mitigation:** degrade **non-critical** derived work; keep canonical writes prioritized—see **Operational protections (overload and backpressure)**.

#### 8. Ranking separation (raw vs trusted engagement)

Decoupling `respectCount` from ranking score is necessary but not sufficient: define **raw** vs **trusted** vs **ranking-weighted** engagement.

**Mitigation:** **Engagement classes** under **§14**.

#### 9. Multi-region

Global deployment introduces lag, stale counters, and conflicting-write risk.

**Mitigation:** short **distributed deployment note**—global **uniqueness** of the edge must still hold.

#### 10. Reconciliation (keep investing here)

Most specs never mention repair. Explicit **repair jobs**, **drift correction**, and **recomputation** from edge truth are unusually mature—and that discipline dominates long-term operability.

**Mitigation:** keep **§4** and **Failure handling** as living requirements, not optional “later” ideas.

### What you should not add yet

Avoid prematurely adding:

- reaction types or emoji reactions,
- weighted voting,
- reputation scoring,
- blockchain-style immutable public vote history,
- public “who Respected” lists at scale without privacy and performance design.

Those features sharply increase cost in **moderation**, **ranking**, **privacy**, **caching**, and **query performance**. The current **binary** Respect model is the right default.

### Final assessment (subsystem maturity)

The design is approaching **senior backend** and **scalable social engagement** quality: explicit state-setting, **repairable** data ownership, **decoupled** ranking, and **extensible** events form a coherent subsystem—not merely a like button.

| Strongest area | Why it matters |
| -------------- | -------------- |
| Explicit state-setting | Removes concurrency and retry ambiguity |
| Source-of-truth separation | Enables reconciliation and migrations |
| Reconciliation philosophy | Operational maturity under drift and partial failure |
| Ranking decoupling | Prevents product and ML from overfitting public counts |
| Event extensibility | Scales to notifications, analytics, fraud, rankers |
| Invariant thinking | Becomes tests, monitors, and migration gates |

### Highest-value remaining improvements (if prioritizing further work)

| Priority | Improvement |
| -------- | ----------- |
| Critical | Failure semantics (canonical edge vs derived pipelines)—**now documented above** |
| Critical | Event ordering and delivery guarantees—**now documented above** |
| High | Cache invalidation strategy—**now documented above** |
| High | Authoritative consistency model (pick transactional vs async explicitly)—**now documented above** |
| High | Feed hydration and batched viewer state—**now documented above** |
| Medium | Overload / backpressure behavior—**now documented above** |
| Medium | Engagement-class separation (raw vs trusted vs ranking-weighted)—**now documented above** |
| Medium | Distributed deployment note—**now documented above** |

At this point the architecture is no longer “just a like system.” It is a **properly bounded social engagement subsystem** with a path to growth without rewriting core semantics.

---

## Production infra and tooling (Redis, queues, observability, runtime)

This architecture is now entering **serious production-system** territory. The sections below cover Redis, queues, observability, workers, and deployment patterns.

You already covered:

- concurrency,
- retries,
- reconciliation,
- distributed consistency,
- ranking separation,
- feed hydration,
- failure semantics.

The next step is improving the **operational stack**, **infra tooling**, and **runtime architecture** around the Respect subsystem. That includes:

- Redis
- queues
- observability
- caching
- streaming
- background workers
- resilience
- abuse protection
- deployment topology

---

### 1. Redis layer (very important)

Right now Redis is only lightly implied. In production, Redis is often one of the most important components around engagement.

#### Recommended Redis usage

| Use case | Redis role |
| -------- | ---------- |
| Hot counters | Ultra-fast reads |
| Feed hydration | Viewer state batching |
| Rate limiting | Token bucket / sliding window |
| Idempotency keys | Retry protection |
| Queue buffering | BullMQ / streams |
| Cache invalidation | Pub/sub |
| Trending windows | Rolling aggregations |
| Abuse detection | Short-term write spikes |

#### Strong production architecture

**Canonical truth**

```text
Postgres / MongoDB
```

**Fast volatile layer**

```text
Redis
```

#### Recommended Redis patterns

**Counter cache**

```text
respect:count:{postId}
```

Useful for:

- feed cards,
- trending,
- post headers.

**Viewer state cache**

```text
respect:user:{userId}
```

Example hash-style payload:

```json
{
  "post123": true,
  "post456": true
}
```

Or a Redis set with `SISMEMBER` (or set-per-user membership patterns). Useful for:

- feed hydration,
- avoiding N+1 DB lookups.

**Idempotency protection**

```text
idempotency:{key}
```

with TTL. Protects:

- mobile retries,
- duplicate submits,
- offline replay.

---

### 2. Queue architecture

Async systems are described above; **queues** should be first-class in the runtime design.

#### Recommended production queues (examples)

| Tool | Usage |
| ---- | ----- |
| BullMQ | Node.js + Redis queues |
| RabbitMQ | Reliable broker |
| Kafka | Event streaming |
| SQS | Managed queueing |
| NATS | Lightweight event infra |

#### Suggested event flow

```text
User clicks Respect
        ↓
API writes canonical edge
        ↓
Emit domain event
        ↓
Queue consumers process:
  - notifications
  - analytics
  - ranking
  - fraud detection
  - cache refresh
```

#### Key production principle

- User-facing write succeeds **fast**.
- Do **not** block the request on: notifications, analytics, ranking recompute, email, or recommendations.

---

### 3. Event streaming architecture

This is where systems typically mature.

#### Recommended evolution

Eventually move toward **CDC / event streams** using, for example:

- Kafka,
- Debezium,
- Redis Streams.

#### Why useful

Enables analytics replay, recommendation systems, ML pipelines, engagement ranking, and historical reconstruction **without** hammering the primary database.

#### Strong production pattern

```text
DB edge mutation
    ↓
Outbox table
    ↓
Event stream
    ↓
Consumers
```

Avoids lost events and dual-write inconsistency when done with a proper outbox (see below).

---

### 4. Outbox pattern (very important)

A naive pattern:

```text
write DB + emit event
```

is dangerous when the event publish fails after commit.

#### Failure problem

```text
DB commit succeeds
Event publish fails
```

#### Recommended production fix: transactional outbox

```text
DB transaction:
  - write edge
  - write outbox row
COMMIT
```

A worker publishes events afterward. This is one of the largest reliability jumps from “startup backend” to **dependable distributed** behavior.

---

### 5. Observability stack

Production systems need observability.

#### Metrics

Track, for example:

- Respect writes/sec,
- failure rate,
- retry rate,
- cache hit ratio,
- reconciliation drift,
- queue lag,
- hot posts,
- abuse spikes.

Tools (examples): Prometheus, Grafana, Datadog.

#### Logging

Structured logs, for example:

```json
{
  "event": "respect_added",
  "postId": "...",
  "userId": "...",
  "requestId": "...",
  "region": "..."
}
```

Tools (examples): Loki, ELK, CloudWatch.

#### Tracing

Distributed tracing (examples): OpenTelemetry, Jaeger, Tempo.

---

### 6. Circuit breakers

If the notification service (or another derived dependency) fails, the **Respect API** should still accept canonical writes.

#### Recommended architecture

Derived systems should be **isolated**, **retryable**, and **failure-tolerant**. Use circuit breakers, retry queues, and exponential backoff where appropriate (patterns/tools vary by stack: e.g. resilience libraries, broker retry policies).

---

### 7. Abuse and fraud pipeline

Moderation is covered in the product architecture; production systems also benefit from **automated** fraud-style signals.

#### Real-time heuristics (examples)

Detect:

- account farms,
- rapid Respect oscillation,
- IP clusters,
- device fingerprint abuse,
- coordinated spikes.

#### Infra patterns (examples)

Redis sliding windows, stream processing, analytics stores (e.g. ClickHouse), anomaly jobs.

#### Important separation

```text
Public respectCount
```

must not be equated with:

```text
trusted engagement score
```

(Already called out under engagement classes and moderation.)

---

### 8. Search and analytics storage

Do not overload the primary database for heavy analytics.

#### Recommended split (conceptual)

| System | Purpose |
| ------ | ------- |
| Postgres / Mongo | Canonical truth |
| Redis | Hot cache |
| Kafka | Streams |
| ClickHouse | Analytics |
| Elasticsearch / OpenSearch | Search / trending |

Trending queries become expensive quickly—plan for offload early in growth.

---

### 9. CDN and edge cache strategy

| Data | Cache strategy |
| ---- | ---------------- |
| Public `respectCount` | CDN-cacheable (with TTL / SWR policy) |
| `viewerHasRespected` | Private / auth-scoped cache |
| Trending lists | Short TTL |
| Feed hydration | Edge or API cache with careful auth boundaries |

Good ideas: **stale-while-revalidate**, short TTLs, edge APIs where product allows.

---

### 10. Worker architecture

Queues imply **workers** with explicit ownership.

| Worker | Responsibility |
| ------ | -------------- |
| Notification worker | Sends notifications |
| Analytics worker | Aggregates metrics |
| Ranking worker | Updates scores |
| Reconciliation worker | Repairs counters |
| Fraud worker | Detects abuse |
| Cache worker | Refreshes projections |

**Production lesson:** avoid doing heavy async work inline on API servers; offload to workers and bounded jobs.

---

### 11. Database scaling strategy

#### Recommended future architecture

**Early scale**

```text
single primary DB
```

**Growth**

```text
primary + replicas
```

**Large scale**

```text
sharded engagement tables
```

#### Important bottleneck (recap)

Often **viewer state queries** and **feed hydration**, not raw edge inserts.

---

### 12. Schema evolution strategy

Changing counters, edge schema, or ranking fields can break production without discipline.

#### Migration philosophy

- Backward-compatible API changes first.
- Dual-read / dual-write during migrations where needed.
- Backfills before cutover.
- Feature flags around projections and risky paths.

---

### 13. SLO and SLA thinking

Reliability goals make architecture measurable.

#### Example SLOs (illustrative, tune to product)

| Metric | Example goal |
| ------ | ------------ |
| Respect write latency | p95 under 150ms |
| Feed hydration | p95 under 100ms |
| Counter consistency drift | under 0.01% |
| Queue lag | under 30s |

---

### 14. Security hardening

Important for social systems.

#### Recommended protections

- CSRF protection (where cookies/session apply),
- auth token validation,
- replay protection,
- bot mitigation,
- rate limiting,
- signed requests (mobile, if used),
- device fingerprinting (policy-dependent),
- WAF rules at the edge.

#### Tools (examples)

| Tool | Purpose |
| ---- | ------- |
| Cloudflare | Edge / WAF |
| Fail2Ban | Host-level abuse (where applicable) |
| Redis | Rate limiting |
| JWT / OAuth | Auth |

---

### 15. Deployment and infra strategy

| Layer | Example |
| ----- | ------- |
| Containers | Docker |
| Orchestration | Kubernetes |
| CI/CD | GitHub Actions |
| Infra as code | Terraform |
| Secrets | Vault / managed secrets |
| Monitoring | Grafana, etc. |

**Strong deployment principle:** the Respect subsystem should support rolling deploys, zero-downtime migrations where possible, and rollback-safe releases.

---

### Best additional production tools (reference)

| Category | Recommended tools (examples) |
| -------- | ---------------------------- |
| Cache | Redis |
| Queue | BullMQ / Kafka |
| Analytics | ClickHouse |
| Search | OpenSearch |
| Monitoring | Prometheus + Grafana |
| Logging | ELK / Loki |
| Tracing | OpenTelemetry |
| Infra | Kubernetes |
| CDN | Cloudflare |
| DB migration | Prisma / Flyway |
| Feature flags | LaunchDarkly / open-source equivalents |
| Secrets | Vault |
| Abuse detection | Redis + stream jobs |

---

### Overall assessment (infra layer)

This subsystem is evolving toward:

- a scalable engagement platform,
- event-driven social architecture,
- production-grade distributed behavior,
- operationally repairable infrastructure,
- a future ranking and recommendation foundation.

The strongest shift is thinking in **invariants**, **reconciliation**, **canonical truth**, **distributed failure**, and **operational recovery**—instead of only “store likes in DB.” That is the gap between basic backend implementation and **scalable systems architecture**.

