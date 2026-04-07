# noticed AI issues

This is a blunt critique of the codebase from a “can we ship this reliably?” perspective. It focuses on patterns that commonly show up in AI-assisted code: duplicated logic, inconsistent abstractions, “best-effort” error handling, and data integrity gaps.

---

## High-level summary

The app is functional, but it’s **not consistently engineered for correctness**. The biggest risks are:

- **Two (or more) overlapping Firebase “DB layers”** (`src/firebase/db.js` vs `src/firebase/db/*`) that duplicate exports and drift over time.
- **Derived counters stored as “source of truth”** (e.g. `userPublicStats.studyMinutes`) that can silently become incorrect.
- **Best-effort patterns** (catch-and-ignore) used in places where correctness matters, hiding failures until users report broken state.
- **Business rules duplicated in the UI** instead of centralized (completion, XP awarding, review queue updates, etc.).
- **Inconsistent UI patterns** (multiple modals/forms doing similar jobs) leading to feature gaps and bugs.

If this were shipped at scale, you’d likely see: incorrect stats, confusing UX inconsistencies, and difficult-to-debug data drift in Firestore.

---

## Ship blockers (would block a production launch)

### 1) Duplicate / drifting database layers

**Where:**
- `src/firebase/db.js`
- `src/firebase/db/papers.js`
- `src/firebase/db/schedule.js`
- `src/firebase/db/profile.js`
- `src/firebase/db/social.js`

**Why it’s bad:**
- There are multiple modules that export similar functions (ex: `recordCompletion`, `updateCompletion`, `logAdhocPaper`, completed papers queries).
- This is a classic drift vector: one file gets a bugfix/feature; the other doesn’t. That produces **inconsistent behavior** depending on which import path a page uses.

**Why it prevents clean shipping:**
- You can’t guarantee app-wide behavior without auditing every call site.
- Tests (if any) don’t protect you because the app can be calling the “other” version.

**What “good” looks like:**
- One canonical Firestore access layer, split by domain (papers/schedule/profile/etc.), with a single public import surface.
- Or: `src/firebase/db/index.js` re-exporting from domain files, and pages import only from that index.

---

### 2) Data integrity: cached counters used as truth

**Where:**
- `userPublicStats.studyMinutes` is incrementally updated (ex: `src/firebase/db/papers.js`, `src/firebase/db.js`)
- Dashboard previously read `studyMinutes` directly; charts computed from completions.

**Why it’s bad:**
- Incremental counters can drift (missed writes, old records lacking fields, partial migrations, retries, offline writes).
- The same screen can show conflicting answers (charts vs headline stat), eroding trust.

**Why it prevents clean shipping:**
- Users treat stats as “truth.” Once they see mismatches, confidence drops and support load increases.

**What “good” looks like:**
- Derived stats are either:
  - computed from the canonical event log (`completedPapers`) when needed, or
  - maintained by a server-side job/function with backfill and reconciliation, not by scattered client updates.

---

### 3) “Best-effort” error swallowing hides real failures

**Where (examples):**
- `src/firebase/config.js` (analytics init silently ignored on failure)
- `src/firebase/db/papers.js`, `src/firebase/db.js` (multiple `.catch(() => {})` and `/* best-effort */` blocks)
- pages like `src/pages/DashboardPage.jsx` and `src/components/FullscreenTimer.jsx` frequently suppress failures and continue

**Why it’s bad:**
- “Best-effort” is fine for non-critical telemetry, but it’s used around **core business actions** (stats refresh, streak updates, queue updates, etc.).
- Suppressing errors without user-visible state often produces **quiet partial writes** (some docs updated, others not).

**Why it prevents clean shipping:**
- Production issues become “ghost bugs”: no logs, no visible errors, inconsistent user state.

**What “good” looks like:**
- A clear policy:
  - telemetry failures can be ignored
  - user-facing state changes must surface errors and/or retry
  - data writes spanning multiple documents must be atomic or compensating

---

### 4) Client-side business rules duplicated across entry points

**Where (examples):**
- Completion flows exist in multiple places:
  - `src/pages/DashboardPage.jsx`
  - `src/pages/CalendarPage.jsx`
  - `src/components/FullscreenTimer.jsx`
  - `src/pages/HistoryPage.jsx`

**Why it’s bad:**
- The same “completion” concept was historically implemented via multiple modals and handlers.
- This leads to missing features (ex: review topics available in one completion UI but not another) and inconsistent writes.

**Why it prevents clean shipping:**
- Every new feature touching completion requires multiple updates and is easy to get wrong.

**What “good” looks like:**
- One “completion service” function that is the single entry point for:
  - writing to `completedPapers`
  - updating schedule `weeklySchedules`
  - updating `userPublicStats`
  - updating `reviewQueue`
  - awarding XP / badges / streak changes

---

## Serious quality issues (not necessarily blockers, but make the codebase “bad”)

### 5) Inconsistent UI component design / styling

**Where:**
- `src/components/LogPaperModal.jsx` vs `src/components/PaperCompleteModal.jsx` historically had different styles and field sets.
- Some components use the newer design tokens (`var(--color-*)`), others use hardcoded `gray-*` / `indigo-*`.

**Why it’s bad:**
- UI inconsistency feels unpolished and reduces perceived quality.
- It also causes functional drift: fields/validation differ.

---

### 6) Performance scaling risks with Firestore reads

**Where:**
- Several functions fetch entire subcollections or large pages:
  - reading all `completedPapers` (or large limits) to compute stats/charts
  - scanning for subject counts in XP awarding logic (see `awardXpAndBadges` in `src/firebase/db.js`, also similar in `src/firebase/db/social.js`)

**Why it’s bad:**
- Works for small datasets, but it scales poorly and becomes costly/slow as users accumulate history.

**What “good” looks like:**
- Aggregate views / cached projections maintained by backend jobs or Cloud Functions.
- Pagination everywhere for user history + charts, and/or precomputed weekly rollups.

---

### 7) Weak separation of concerns (pages do orchestration + business logic)

**Where:**
- Pages and UI components call Firestore and implement business rules directly (ex: completion handlers in pages).

**Why it’s bad:**
- Hard to test.
- Hard to reuse behavior.
- Hard to guarantee invariants.

**What “good” looks like:**
- Domain services (pure-ish functions) that are reused by all pages.
- UI components that render and call high-level actions, not do orchestration.

---

### 8) Lack of automated safety net

**Where:**
- There’s a `vitest` script, but the overall codebase shows no clear tests around core invariants (completion writes, stat derivation, queue sync, XP awarding).

**Why it’s bad:**
- Without tests, any refactor or feature addition risks breaking core flows.

**What “good” looks like:**
- A small suite of unit tests for:
  - time parsing (`inputToSecs`, `secsToInput`)
  - completion update shapes
  - reviewQueue sync behavior (added/removed topics)
  - stat computation from `completedPapers`

---

## “AI-ish” smells (why it reads like AI code)

These are patterns that commonly come from generating code in small fragments without consolidating architecture:

- **Duplicate implementations** of the same API (DB modules drifting).
- **Inconsistent naming and boundaries** (some “db” functions live in `db.js`, others in `db/papers.js`).
- **Catch-and-ignore** used as duct tape to prevent crashes, not as a deliberate error policy.
- **Feature parity gaps** (one completion UI supports review topics; another doesn’t) because code paths were built separately.
- **Overly-large “god files”** (a single DB file holding many unrelated domains) alongside smaller domain files, indicating merging without cleanup.

---

## Why it “couldn’t be shipped properly” (in plain language)

Even if it “works on my machine,” shipping means:

- **Users can’t get into broken partial states** (some writes succeed, others silently fail).
- **Stats are consistent and correct** across the app.
- **New changes don’t break old flows** because they all share the same business logic.
- **Performance stays acceptable** as users accumulate data.

Right now, the architecture makes those guarantees hard, because:

- There isn’t a single source of truth for DB behavior.
- There isn’t a single source of truth for completion behavior.
- Failures can be suppressed without visibility.
- Derived counters can drift from the event log.

---

## Concrete next steps (if you want this to become shippable)

- **Collapse DB layer** into one consistent module structure and update imports.
- **Centralize “completion”** into one function (schedule update + history write + XP/queue).
- **Define an error policy** (what can be best-effort vs must be strict).
- **Add a minimal test suite** for the 5–10 highest-risk functions.
- **Add a reconciliation job** (or admin tool) to rebuild derived stats from `completedPapers` when needed.

