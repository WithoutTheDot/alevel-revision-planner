# A-Level Planner — Codebase Reference

> Complete technical reference for every system, algorithm, and data flow in the app.

---

## Table of Contents

1. [Tech Stack & Project Structure](#1-tech-stack--project-structure)
2. [Firebase Data Model](#2-firebase-data-model)
3. [Application Bootstrap & Routing](#3-application-bootstrap--routing)
4. [Context Providers (Global State)](#4-context-providers-global-state)
5. [Core Algorithms](#5-core-algorithms)
   - 5.1 Paper Tree & Path System
   - 5.2 Schedule Generation Algorithm
   - 5.3 Bin-Packing (Time Block Scheduler)
   - 5.4 XP & Streak System
   - 5.5 Badge System
   - 5.6 Coverage Tracking
6. [Firebase DB Layer](#6-firebase-db-layer)
7. [Pages](#7-pages)
8. [Key Components](#8-key-components)
9. [Utilities & Libraries](#9-utilities--libraries)
10. [Hooks](#10-hooks)
11. [Data Flows (End-to-End)](#11-data-flows-end-to-end)

---

## 1. Tech Stack & Project Structure

| Layer | Choice |
|---|---|
| Framework | React 18 (Vite) |
| Routing | React Router v6 |
| Styling | Tailwind CSS + CSS custom properties (theme tokens) |
| Backend | Firebase (Firestore + Auth + Analytics) |
| Testing | Vitest |
| Charts | Recharts |
| Date handling | date-fns |

```
src/
├── App.jsx                  # Root router + provider tree
├── main.jsx                 # Vite entry point
├── contexts/                # Global state (React Context)
│   ├── AuthContext.jsx      # Firebase auth + profile loading
│   ├── TimerContext.jsx     # Live countdown timer state
│   ├── SubjectsContext.jsx  # User's subject list
│   ├── NudgeContext.jsx     # Class nudge notifications
│   ├── TutorialContext.jsx  # Onboarding tutorial state
│   └── ThemeContext.jsx     # Dark/light mode
├── firebase/
│   ├── config.js            # Firebase app init + exports
│   └── db/                  # Firestore operations, split by domain
│       ├── index.js         # Re-exports all db functions
│       ├── papers.js        # Completed papers, custom papers, PBs
│       ├── profile.js       # User profile, settings, durations, active session
│       ├── schedule.js      # Week templates, term calendar, weekly schedules
│       ├── social.js        # XP, streaks, badges, classes, nudges
│       ├── review.js        # Review queue (weak topics)
│       ├── completion.js    # Orchestrator: completes a paper end-to-end
│       ├── reconciliation.js# Admin tools: rebuild stats, reconcile badges
│       └── admin.js         # Admin-only operations
├── lib/                     # Pure business logic, no React
│   ├── paperTrees.js        # Decision tree definitions for all subjects
│   ├── paperPaths.js        # Path → string and display name conversion
│   ├── generateSchedule.js  # Main schedule generation + bin-packing
│   ├── xpUtils.js           # XP and streak calculations (pure functions)
│   ├── badges.jsx           # Badge definitions and XP helpers
│   ├── coverageUtils.js     # Coverage grid utilities
│   ├── pmtLinks.js          # PMT/OCR PDF URL builder
│   ├── random.js            # Weighted random selection
│   ├── dateUtils.js         # Calendar pixel/time conversions
│   ├── exportCalendar.js    # ICS and PDF export
│   ├── allSubjects.js       # Subject list and FM module definitions
│   ├── builtInFamilies.js   # Built-in paper families
│   ├── gradeUtils.js        # Grade colour helpers
│   ├── constants.js         # App-wide constants
│   ├── styles.js            # Shared className helpers
│   ├── timeUtils.js         # Time formatting
│   └── authErrors.js        # Firebase auth error → human message
├── pages/                   # One file per route
└── components/              # Shared UI components
```

---

## 2. Firebase Data Model

All data lives in Firestore. Here is the full schema.

### Top-level collections

```
/users/{uid}/                       User's private data
/userPublicStats/{uid}              Public stats visible to leaderboards
/classes/{classId}                  Class groups
```

### `/users/{uid}/` subcollections

| Subcollection | Document ID | Key Fields |
|---|---|---|
| `profile/main` | fixed | `subjects[]`, `onboardingComplete`, `displayName` |
| `profile/activeSession` | fixed | `paperPath`, `isRunning`, `isPaused`, `elapsedSeconds`, `startedAt` (timestamp) |
| `settings/main` | fixed | `defaultPaperDuration`, `breakDuration`, `calendarStartHour`, `calendarEndHour`, `reviewModeEnabled` |
| `settings/durations` | fixed | Map of `{ paperPath: minutes, _default: 120 }` |
| `weekTemplates/{templateId}` | custom | `templateName`, `subjects[]`, `maxPapersPerSubject`, `mostCommonPapersPerSubject`, `maxTotalPapers`, `breakDuration`, `timeBlocks[]` |
| `termCalendar/{mondayDate}` | `YYYY-MM-DD` | `weekStart`, `weekType`, `templateId` |
| `weeklySchedules/{weekId}` | `YYYY-MM-DD` | `weekId`, `weekStart`, `weekType`, `generatedAt`, `papers[]`, `dismissedOverdue` |
| `completedPapers/{autoId}` | auto | `paperPath`, `subject`, `displayName`, `weekId`, `marks`, `grade`, `comment`, `completedAt`, `xpAwarded`, `source`, `actualDurationSeconds`, `reviewTopics[]` |
| `customPapers/{familyId}` | custom | `familyName`, `subject`, `yearStart`, `yearEnd`, `duration` |
| `examTimetable/{autoId}` | auto | `subject`, `paperLabel`, `date`, `time`, `durationMins` |
| `reviewQueue/{autoId}` | auto | `topic`, `subject`, `status` (pending/scheduled/done), `addedAt`, `scheduledWeekId`, `completedAt` |
| `badges/{badgeId}` | badge id | `badgeId`, `earnedAt`, `xpAwarded` |
| `nudges/{autoId}` | auto | `fromDisplayName`, `sentAt` |

### `/userPublicStats/{uid}`

```js
{
  displayName: string,
  papersCompleted: number,       // incremented atomically on every completion
  studyMinutes: number,          // incremented atomically on every completion
  xp: number,
  level: number,                 // floor(xp / 500) + 1
  badgeIds: string[],            // array of earned badge ids
  currentStreak: number,
  longestStreak: number,
  lastStudyDate: 'YYYY-MM-DD',
  subjectPapersCompleted: {      // { maths: 12, physics: 8, ... }
    [subject]: number
  },
  personalBests: {               // fastest times per paper
    [`${subject}-${paperPath}`]: seconds
  },
  lastUpdated: Timestamp,
}
```

### `/classes/{classId}`

```js
{
  code: string,      // 6-char alphanumeric join code
  name: string,
  subject: string | null,
  createdAt: Timestamp,
  members: string[]  // array of UIDs
}
```

---

## 3. Application Bootstrap & Routing

**[src/App.jsx](src/App.jsx)**

The provider tree wraps all authenticated routes:

```
ThemeProvider
└── BrowserRouter
    ├── /admin → AdminRoute (completely isolated, no providers)
    └── * → AuthProvider
              └── TimerProvider
                  └── SubjectsProvider
                      └── NudgeProvider
                          └── TutorialProvider
                              └── Routes (all app pages)
```

**Route guards:**

- `PrivateRoute` — redirects to `/login` if not authenticated or email unverified.
- `AdminRoute` — checks a hardcoded admin UID list before rendering `/admin`.
- `OnboardingGuard` — if `profile.onboardingComplete === false`, redirects to `/onboarding`. Existing users with no profile doc (`profile === null`) skip onboarding (backwards compat).

**Lazy loading:** All pages except `LoginPage` and `VerifyEmailPage` are `React.lazy()`. This keeps the initial bundle small.

**Analytics:** `AnalyticsTracker` fires a `page_view` Firebase Analytics event on every route change.

---

## 4. Context Providers (Global State)

### AuthContext (`src/contexts/AuthContext.jsx`)

Owns authentication and user profile. Blocks rendering until `onAuthStateChanged` fires (`loading` state).

| Value | Type | Purpose |
|---|---|---|
| `currentUser` | Firebase User \| null | Raw Firebase auth object |
| `profile` | object \| null | Firestore `profile/main` doc |
| `login(email, pw)` | fn | `signInWithEmailAndPassword` |
| `register(email, pw)` | fn | Creates account, inits all default Firestore docs, sends email verification |
| `logout()` | fn | Signs out, clears profile state |
| `refreshProfile()` | fn | Re-fetches `profile/main` from Firestore |

On `register`, four things are initialised in parallel:
1. Default week templates (Week A, Week B, Holiday)
2. Default durations doc (`{ _default: 120 }`)
3. Default profile (`{ subjects: DEFAULT_SUBJECTS, onboardingComplete: false }`)
4. Public stats doc

### TimerContext (`src/contexts/TimerContext.jsx`)

Manages the live countdown timer. Uses `setInterval` + `useRef` for drift-free timing, and persists session state to Firestore so timers survive page refreshes.

**Timer mechanics:**
- `baseElapsedRef` — accumulated seconds before the current "run" started
- `startedAtRef` — `Date.now()` when running began
- Every tick: `elapsed = baseElapsed + (Date.now() - startedAt) / 1000`
- On pause: saves `elapsed` to `baseElapsedRef`, writes to Firestore
- On resume: loads `baseElapsedRef` from Firestore, restarts interval

**Session persistence (Firestore `profile/activeSession`):**
- `startActiveSession` — writes initial session with `serverTimestamp()`
- `pauseActiveSession` — sets `isRunning: false`, saves `elapsedSeconds`
- `resumeActiveSession` — sets `isRunning: true`, new `serverTimestamp()`
- `clearActiveSession` — deletes the doc

On app load with an existing running session, the context rehydrates by computing the additional elapsed time since `startedAt` (handles tab closes / refreshes mid-timer).

**Backward-compat API:** Exposes `getTimerData(key)`, `getElapsed(key)`, `startTimer(key, mins)`, `stopTimer(key)` where keys are `timer_${weekId}_${paperIndex}`. This lets DashboardPage and CalendarPage use the timer without knowing about the new session shape.

### SubjectsContext (`src/contexts/SubjectsContext.jsx`)

Derives the user's subject list from `AuthContext.profile`. Provides:
- `subjects` — array of `{ id, label, color, text, light }`
- `subjectMeta` — same data as a keyed object `{ [id]: meta }`
- `addSubject(def)` / `removeSubject(id)` — writes to Firestore and refreshes profile

### NudgeContext (`src/contexts/NudgeContext.jsx`)

Polls Firestore for pending nudges from classmates and surfaces them as toasts.

### TutorialContext (`src/contexts/TutorialContext.jsx`)

Tracks tutorial progress (which step the user is on). `TutorialOverlay` reads from this context to render the overlay.

---

## 5. Core Algorithms

### 5.1 Paper Tree & Path System

**[src/lib/paperTrees.js](src/lib/paperTrees.js)**

Every subject's available papers are encoded as a recursive decision tree:

```js
// Node shape
{
  options: [
    { label: string, value: string, terminal?: true, weight?: number, next?: Node }
  ]
}
```

- `terminal: true` — this option IS the leaf (a paper). No further branching.
- `weight` — relative probability for weighted random selection (default 1).
- `next` — reference to child node (branches further).

**Example path through maths tree:**
```
maths → ocr → 2023 → pure     (terminal)
         ↑       ↑      ↑
       board   year   paper
```

Subjects covered: `maths`, `furtherMaths`, `physics`, `computerScience`, `chemistry`, `biology`, `psychology`, `sociology`, `economics`, `history`, `geography`, `english`, `business`, `law`, `pe`, `statistics`.

Special cases:
- **AQA Physics Paper 3B variants** — three variants (3BA, 3BB, 3BC) each get `weight: 1/12` so combined they equal one full paper in probability weight.
- **FM Textbook** — marked `terminal: true` and capped at 2 per week in the generator (not in the tree).
- **FM optional modules** — filterable via `subjectConfig.furtherMathsModules`; the `FM_ALL_OPTIONAL_VALUES` set in `allSubjects.js` lists which module values are optional.

**Paper Path string format:**

`getPaperPath(pathArray)` joins the path array with `-` separators:
- `['ocr', '2023', 'pure']` → `'ocr-2023-pure'`
- `['foreign', 'aqa', '2022', 'core-pure-1']` → `'foreign-aqa-2022-core-pure-1'`
- Custom papers: `'custom-{familyId}-{year}'`

**Display names:** `getDisplayName(pathArray)` converts the raw value array into human-readable labels by looking up the tree.

---

### 5.2 Schedule Generation Algorithm

**[src/lib/generateSchedule.js](src/lib/generateSchedule.js) → `generateWeeklySchedule()`**

**Inputs:**
- `userId`, `weekStart`, `weekType`
- `template` — from Firestore (`weekTemplates`)
- `recentPaths` — paper paths completed in the past 3 weeks
- `durations` — per-paper duration overrides
- `customPapers` — user's custom paper families
- `allTimePaths` — all ever-completed paper paths
- `subjectConfig` — e.g. FM module selection

**Step 1 — Determine per-subject paper counts**

For each subject, `weightedRandom(mostCommonPapersPerSubject, maxPapersPerSubject)` picks a count biased toward the "common" value.

Then enforce `maxTotalPapers`: if the sum exceeds the cap, reduce counts starting from the subject with the most papers (greedy, keeps minimum 1 per subject).

**Step 2 — Select papers (`selectPaper()`)**

For each subject, calls `selectPaper()` up to `target` times (with a 100-attempt guard).

`selectPaper()` algorithm:
1. Collects all leaf paths from the subject's tree with `collectLeafPaths()` (recursive DFS, multiplying weights down the path).
2. Applies **coverage-first weighting** via `effectiveWeight()`:
   - Paper already picked this week → weight 0 (hard exclude)
   - Paper in `recentPaths` (last 3 weeks) → weight × 0.01
   - Paper in `allTimePaths` (ever done) → weight × 0.05
   - Never done → weight × 1.0 (full weight)
3. Merges custom paper candidates using the same effective-weight logic.
4. Falls back to equal-weight if all candidates have weight 0 (pool can't be empty).
5. Calls `weightedRandomChoice()` to pick one paper.

**Textbook special case:** Textbook can appear up to 2× in a week. It is NOT added to `weekExcluded` after the first selection, so a second selection can pick it again. Once `textbookCount >= 2`, further selections of textbook are skipped.

**Step 3 — Fisher-Yates shuffle**

Papers are shuffled so subjects are interleaved across the week rather than grouped.

**Step 4 — Bin-pack into time blocks**

If the template has `timeBlocks`, calls `schedulePapers()`. Otherwise, all papers get `scheduledDay: null`.

---

### 5.3 Bin-Packing (Time Block Scheduler)

**`schedulePapers(papers, timeBlocks, breakMinutes)`**

This is a **Longest Fit Decreasing (LFD)** heuristic bin-packing algorithm.

**Setup:**
- Sort papers by duration descending (longest first — LFD).
- Convert `timeBlocks` to slot objects with `cursor` (next available minute within that block).

**First pass — LFD:**
For each paper (longest first), iterate through all slots in order:
1. Calculate `gap` = `breakMinutes` if cursor > block start, else 0 (no break before first paper in a block).
2. `startAt = cursor + gap`
3. If `startAt + paper.duration > slot.end` and there was a gap, try without the break: `startAt = cursor, gap = 0` (break-shrinking optimisation to squeeze papers in).
4. If it fits: place paper, advance `cursor`.
5. If no slot fits: paper is left unscheduled.

**Second pass — gap-fill:**
Collect unscheduled papers, sort shortest first. Sort slots by remaining capacity descending. Attempt to fill gaps. This second pass rescues shorter papers that got displaced by the LFD ordering.

**Time representation:** All times are converted to integer minutes within the block via `toMinutes()` and back via `fromMinutes()`.

---

### 5.4 XP & Streak System

**[src/lib/xpUtils.js](src/lib/xpUtils.js) — pure functions**

**`calculateXp(paperData, stats)`**

| Component | Amount | Condition |
|---|---|---|
| Base XP | 25 | Always |
| Grade bonus | 25 | Grade is A or A* |
| Time bonus | up to 50 | Completed faster than `expectedTime`: `min(50, floor(pctFaster × 100))` |
| Streak bonus | 50 | Current streak = 7 |
| Streak bonus | 150 | Current streak = 30 |

Time bonus formula: `pctFaster = (expectedTime - timeTaken) / expectedTime`. If you finish in half the expected time, pctFaster = 0.5, timeBonus = 50 (capped).

**`computeNextStreak(today, last, current)`**

- `last === today` → streak already counted today, return unchanged.
- `last === yesterday` → increment streak by 1.
- Otherwise → reset to 1.

**Level formula:** `level = floor(xp / 500) + 1`. Every 500 XP = one level.

**`xpProgressInLevel(xp)`** returns `{ current, total: 500, pct }` for the progress bar within the current level.

**Ad-hoc XP cap:** A daily limit of 3 ad-hoc paper completions that award XP. The 4th+ ad-hoc paper is still logged but `xpAwarded: false`.

**XP farming prevention:** When a paper is re-completed (same `existingDocId`), the system checks if `xpAwarded === true` on the existing doc. If so, no XP is awarded again.

---

### 5.5 Badge System

**[src/lib/badges.jsx](src/lib/badges.jsx)**

Badges are defined as an array of `BADGE_DEFS`:

```js
{
  id: string,
  label: string,
  description: string,
  xpReward: number,
  category: 'milestone' | 'streak' | 'subject',
  check: (ctx) => boolean  // pure predicate
}
```

**Context passed to `check()`:**
```js
{
  papersCompleted: number,
  longestStreak: number,
  subjectCounts: { [subject]: number }
}
```

**Current badges:**

| ID | Trigger |
|---|---|
| `first-paper` | 1 paper completed |
| `papers-10` | 10 papers |
| `papers-25` | 25 papers |
| `papers-50` | 50 papers |
| `papers-100` | 100 papers |
| `streak-7` | Longest streak ≥ 7 |
| `streak-30` | Longest streak ≥ 30 |
| `subject-mastery` | Any subject ≥ 20 papers |

**Award flow (`awardXpAndBadges` in `social.js`):**
1. Calculate XP breakdown using `calculateXp`.
2. Check all badge defs. Filter to newly unlocked (not in `existingBadgeIds`).
3. Sum badge XP rewards.
4. Total XP = paper XP + badge XP.
5. Write to `userPublicStats`: `xp += total`, `level = xpToLevel(newXp)`, `badgeIds = arrayUnion(...newBadgeIds)`.
6. Write individual `users/{uid}/badges/{id}` docs with `earnedAt`.

**Reconciliation (`reconciliation.js → reconcileBadgesForUser`):** Admin tool that scans all `completedPapers`, rebuilds the badge context, finds missing badges, and awards them. Safe to call repeatedly (idempotent).

---

### 5.6 Coverage Tracking

**`getCoverageData(userId)`** in `papers.js`:

Scans all `completedPapers`. For each `paperPath`, keeps only the most recent completion (latest `completedAt`). Returns `Map<paperPath, { grade, completedAt }>`.

**Coverage Grid** ([src/components/CoverageGrid.jsx](src/components/CoverageGrid.jsx)):

Uses `getAllPaperPaths()` to enumerate every possible paper across all subject trees. Cross-references against the coverage map. Each cell shows:
- Empty (not done)
- Done — colour-coded by grade (green = A/A*, amber = B/C, red = D-U)

---

### 5.7 Weighted Random

**[src/lib/random.js](src/lib/random.js)**

**`weightedRandom(mostCommon, max)`**

Fills a virtual slot pool of 100 entries:
- `mostCommon` value gets 50 slots (50% probability)
- All other values share the remaining 50 slots equally

Returns a random pick from the pool. Used to pick per-subject paper counts in schedule generation.

**`weightedRandomChoice(options)`**

Standard weighted random selection:
1. Sum all weights.
2. Pick `r = Math.random() * total`.
3. Walk through options subtracting each weight until `r ≤ 0`.

Used in `selectPaper()` to pick a specific paper from the weighted leaf pool.

---

## 6. Firebase DB Layer

All Firestore logic is in `src/firebase/db/`. The `index.js` re-exports everything for convenience.

### `completion.js` — Orchestrator

`completePaper(uid, ctx)` is the single entry point for completing any paper. It:
1. Routes to `logAdhocPaper` (source = 'adhoc') or `recordCompletion` + `updatePaper` (scheduled).
2. After writing: calls `addReviewTopics` if `reviewTopics.length > 0` (best-effort, never throws).
3. Returns `{ xpEarned, newBadges, isPB }`.

### `papers.js` — Completions, Custom Papers, Personal Bests

**`recordCompletion(userId, paperData)`:**
1. Check `existingDocId` for XP-farming prevention.
2. **Atomic batch write**: paper doc + `userPublicStats` increments.
3. `updateStreak()` (separate read needed first).
4. `awardXpAndBadges()`.
5. `maybeUpdatePB()` — updates personal best if this is a new fastest time.

**`logAdhocPaper(userId, paperData)`:**
- Counts today's ad-hoc completions (query by `source == 'adhoc'` and today's date range).
- Caps XP at 3 per day (`xpAwarded: todayCount < 3`).
- Same atomic batch write pattern.

**`getAllCompletedPapers()`:** Cursor-based pagination. Fetches `limit + 1` to detect if more exist, returns `{ papers, lastDoc, hasMore }`.

**`getTotalStudySecondsFromCompletedPapers()`:** Paginates through all completion docs in batches of 1000, sums only valid `actualDurationSeconds` values (finite, > 0). Does NOT use cached counters.

**Personal Bests (`maybeUpdatePB`):** Key format: `${subject}-${paperPath}`. Stored in `userPublicStats.personalBests`. Only updates if new time is strictly less than existing PB.

### `schedule.js` — Templates, Calendar, Schedules

- **Week Templates** — stored under `weekTemplates/{templateId}`. Three built-in defaults: Week A, Week B, Holiday. `initDefaultTemplates` only writes if the collection is empty.
- **Term Calendar** — `termCalendar/{mondayDate}` maps each Monday to `{ weekType, templateId }`.
- **Weekly Schedules** — `weeklySchedules/{weekId}` stores the full generated schedule including all papers and their `scheduledDay`, `scheduledStart`, `scheduledEnd`.
- **`updatePaper`** — reads full schedule, mutates `papers[index]`, writes back. Not atomic.
- **`deletePaper`** — same pattern with `splice`.

### `social.js` — XP, Streaks, Badges, Classes, Nudges

**Classes:**
- `generateClassCode()` — 6-char code from safe character set (excludes I, O, 0, 1 to avoid confusion).
- `createClass()` — retries up to 10 times to find a unique code (collision-resistant for small scale).
- `getClassLeaderboard()` — fetches all member `userPublicStats` in parallel. If class has a `subject`, swaps `papersCompleted` for `subjectPapersCompleted[subject]`. Sorts by papers then study minutes.

**Nudges:** Simple Firestore subcollection. `sendNudge` adds a doc; `clearNudge` deletes it.

### `review.js` — Review Queue

**`addReviewTopics(userId, topics, subject)`:**
- Fetches all existing `pending` items for the subject.
- Skips duplicates.
- Batch-writes new items.

**`syncReviewQueueForCompletionEdit()`:**
- Computes added/removed topics (set diff between prev and next).
- Adds new topics via `addReviewTopics`.
- Removes old topics by querying for matching pending items and batch-deleting (chunked in groups of 10 to respect Firestore `in` clause limit).

**`computeTopicFrequency(papers, subjectFilter)`:**
Counts normalised topic occurrences across all completed papers. Returns sorted array `[{ topic, count, subject }]` where `subject` is the most common subject for that topic.

### `profile.js` — Profile, Settings, Durations, Active Session

- **Profile** — `users/{uid}/profile/main`, merged writes.
- **Settings** — `users/{uid}/settings/main`, merged writes. Defaults returned if doc doesn't exist.
- **Durations** — `users/{uid}/settings/durations`, a flat map. Each `setPaperDuration` merges one key. `deleteCustomPaper` uses `deleteField()` to clean up all year variants.
- **Active Session** — `users/{uid}/profile/activeSession`. `startActiveSession` uses `serverTimestamp()` so server time is used for cross-device accuracy.

### `reconciliation.js` — Admin Utilities

**`rebuildUserPublicStatsFromCompletedPapers(uid)`:**
Full scan of `completedPapers`, paginated in batches of 1000. Recomputes `papersCompleted`, `studyMinutes`, `subjectPapersCompleted` from ground truth. Writes with `merge: true`.

**`reconcileBadgesForUser(uid)`:**
Checks all badge predicates against live data. Awards missing badges + XP. Idempotent.

**`computeWeeklyRollups(uid)`:**
Groups completedPapers by ISO week (Monday = week start, using UTC). Writes to `users/{uid}/rollups/weekly/weeks/{weekId}`.

---

## 7. Pages

### DashboardPage (`/dashboard`)

The main hub. On load, fetches in parallel:
- Current week's schedule (+ sets up a Firestore `onSnapshot` listener for live updates)
- Term calendar (to determine week type)
- Exam timetable
- User public stats
- Previous week's schedule (for overdue detection)
- User settings
- Total study seconds (from canonical history)
- Top-50 recent completions (for review topic frequency)
- Classes + leaderboard widget

**Overdue detection:** If `prevSchedule` exists, has `!dismissedOverdue`, and has incomplete papers, shows the count.

**Complete paper flow:**
1. Reads timer elapsed from `TimerContext`.
2. Calls `completePaper()`.
3. On success: increments local `totalStudyMins`, re-fetches stats, triggers `XpCelebration` if XP > 0.

**Upcoming papers sort:** Filter incomplete with a scheduled time and no active timer. Sort by day-of-week order, then by `scheduledStart` string (lexicographic works since it's HH:MM format).

### CalendarPage (`/calendar`)

Drag-and-drop weekly calendar grid. Papers appear as blocks at the correct pixel offset. Can navigate between weeks. Supports ICS and PDF export.

**Pixel ↔ time conversion** (from `dateUtils.js`):
- Grid = 7am to 10pm = 15 hours = 900 minutes.
- `PX_PER_MIN = 0.9` → total grid height = 810px.
- `timeToOffset(timeStr)` converts HH:MM to px from grid top.
- `offsetToTime(px)` snaps to 15-minute grid (`SNAP_MINS = 15`).

### HistoryPage (`/history`)

Three views: `table`, `charts`, `grid`.

**Table view:** Paginated (50/page) list with filters (subject, grade, search). Export CSV generates RFC-compliant CSV with proper quoting.

**Charts view:** Uses Recharts. Charts:
- Grades distribution (bar chart, all grades A*–U)
- Papers per week (last 12 weeks)
- Subject breakdown (bar chart)
- Study hours per week (last 12 weeks)

Data aggregation is done client-side from the loaded papers array.

**Grid view (Coverage):** Lazy-loaded — only fetches `getCoverageData` when user switches to this tab. Shows all papers across all subject trees in a grid.

**Personal Best detection:** Checks `personalBests` map from `userPublicStats`. A completion is marked as PB if its `actualDurationSeconds` equals the stored PB for that `subject-paperPath` key.

### GeneratePage (`/generate`)

Form to generate a weekly schedule. Fetches the week's template based on `termCalendar` for the selected week, then calls `generateWeeklySchedule()`. Shows warnings if papers couldn't be scheduled. On confirm, writes via `saveWeeklySchedule()`.

### TermSchedulePage (`/term-schedule`)

A calendar grid showing each week (by Monday date). Click a week to assign it a type (Week A, Week B, Holiday). Writes to `termCalendar/{mondayDate}` via `setWeekType()`.

### TemplatesPage (`/templates`)

CRUD for week templates. Uses `WeekGridEditor` to visually edit time blocks (drag to resize/move). Saves via `saveWeekTemplate()`.

### ReviewPage (`/review`)

Displays the user's `reviewQueue`. Items can be marked as complete, deleted, or scheduled to a week. Shows topic frequency analysis from `computeTopicFrequency()`.

### SettingsPage (`/settings`)

Manage user settings, paper duration overrides, custom papers, display name. Duration overrides write to `settings/durations`. Custom papers write to `customPapers/{familyId}`.

### BadgesPage (`/badges`)

Shows all `BADGE_DEFS` with earned/unearned state fetched from `userPublicStats.badgeIds`. Shows XP reward for unearned badges.

### ClassesPage (`/classes`)

Create or join a class via 6-char code. Lists user's classes with paper counts.

### LeaderboardPage (`/classes/:classId`)

Renders `getClassLeaderboard()` result. If class has a subject, shows subject-specific paper counts.

### OnboardingPage (`/onboarding`)

Multi-step flow to select subjects, configure a basic template, and set `onboardingComplete: true` on the profile.

### AdminPage (`/admin`)

Isolated from all providers. Exposes `rebuildUserPublicStatsFromCompletedPapers` and `reconcileBadgesForUser` for admin-level repairs.

### LandingPage (`/home`)

Marketing page. Unauthenticated users see login/register. Authenticated users are redirected to `/dashboard`.

---

## 8. Key Components

### CompletionDetailsModal

Used for all paper completion entry points (scheduled, ad-hoc, history edit). Three modes:
- `scheduled` — shows paper name, lets user enter marks/grade/time/comment/reviewTopics
- `adhoc` — same but with subject and paper name fields
- `history` — edit mode for existing completions

Pre-fills `actualDurationSeconds` from the timer if one was running.

### CoverageGrid

Fetches all paper paths from `getAllPaperPaths()`, renders a grid per subject. Each cell = one paper path. Coloured by grade using `gradeColor()`.

### TimerWidget

Shows the active/next paper with timer controls. Reads from `TimerContext`. Displays elapsed time in `MM:SS` or `HH:MM:SS` format.

### FullscreenTimer

Full-screen overlay shown when a timer is started. Shows countdown/count-up with paper name. Has pause/resume/stop controls.

### WeekGridEditor

Visual time block editor. Shows a week grid with draggable time block handles. Pixel-accurate using `dateUtils.js` conversions.

### ExamCountdown

Shows upcoming exams sorted by date, with days remaining.

### XpCelebration

Animated overlay shown on paper completion. Shows XP breakdown (base, grade, time, streak, badge bonuses), new badges, level-up if applicable, and PB if set.

### HistoryCharts

Recharts wrapper for four chart types. Receives pre-aggregated data from `HistoryPage`.

### TutorialOverlay

Step-by-step overlay that highlights UI elements. Steps defined in `lib/tutorialSteps.js`. Controlled by `TutorialContext`.

### Layout

Wraps all authenticated pages. Renders the sidebar nav + `<Outlet>` for child pages. Also renders `QuickLogFab` (floating action button for quick ad-hoc paper logging).

---

## 9. Utilities & Libraries

### PMT Link Builder (`src/lib/pmtLinks.js`)

`getPmtLinks(subject, paperPath)` returns `{ qp: url, ms: url }` or `null`.

Supports: `maths`, `physics`, `furtherMaths`. Computer Science has no PMT links (returns null).

**URL structure:**
- Most papers: `https://pmt.physicsandmathstutor.com/download/{subjectDir}/{paperFolder}/{type}/{session} {type}.pdf`
- OCR A Maths: hardcoded image IDs on `ocr.org.uk` (the URLs are not templatable).

**Special session rules:**
- Edexcel Maths 2020/2021 — October session (not June, due to COVID).
- OCR Further Maths 2020/2021 — November session.
- AQA Further Maths 2020/2021 — no papers available (returns null).

### Calendar Export (`src/lib/exportCalendar.js`)

**ICS (`.ics`):**
- Generates RFC 5545 VCALENDAR with one VEVENT per scheduled paper.
- UID per event: `{weekId}-{subject}-{paperPath}-{startHHMM}@alevplanner`
- Uses local time (no timezone suffix) for compatibility.
- Trigger download via `URL.createObjectURL`.

**PDF:**
- Dynamic import of `jspdf` + `jspdf-autotable` (not in initial bundle).
- Papers sorted by day-of-week then start time.
- Table columns: Day, Time, Subject, Paper, Duration, Grade, Marks.

### Date Utilities (`src/lib/dateUtils.js`)

- `getMondayStr(date)` — returns `YYYY-MM-DD` for the Monday of a given date's week.
- `timeToOffset(timeStr)` — HH:MM → px from top of calendar grid.
- `offsetToTime(px)` — px → HH:MM snapped to 15-minute grid.
- `getTodaysPapers(schedule, dayName)` — filter schedule papers for a given day name.
- `getTodayDayName()` — returns current day as 'Monday', 'Tuesday', etc.

### Grade Utilities (`src/lib/gradeUtils.js`)

- `gradeColor(grade)` — returns Tailwind class string for colour-coding grades.
- `parseBoard(familyId)` — extracts board name ('ocr', 'aqa', 'edexcel') from a family ID string.

### Auth Errors (`src/lib/authErrors.js`)

Maps Firebase auth error codes to user-friendly messages.

### Styles (`src/lib/styles.js`)

Shared Tailwind className helper functions to avoid repetition across components.

---

## 10. Hooks

### `useAsyncData(fn, deps)` (`src/hooks/useAsyncData.js`)

Generic hook for async data fetching. Returns `{ data, loading, error, reload }`. Handles race conditions: only updates state if component is still mounted. Guards against double-fetch.

### `useDebounce(value, delay)` (`src/hooks/useDebounce.js`)

Standard debounce hook. Returns debounced value after `delay` ms of inactivity. Used in search inputs.

### `useTimer` (`src/hooks/useTimer.js`)

**Deprecated.** Old localStorage-based timer. Kept for reference. All timer logic now in `TimerContext`.

---

## 11. Data Flows (End-to-End)

### Flow: Generate a weekly schedule

```
User clicks "Generate" on GeneratePage
  → fetchTermCalendar() → find weekType for this Monday
  → fetchWeekTemplate() → get template (subjects, timeBlocks, maxPapers, etc.)
  → getRecentCompletedPapers(uid, weekStart, weeksBack=3) → recent paper paths
  → getPaperDurations(uid) → per-paper duration overrides
  → getCustomPapers(uid) → user's custom paper families
  → getAllCompletedPaperPaths(uid) → all-time paper paths
  → generateWeeklySchedule(uid, weekStart, weekType, template, recent, durations, custom, allTime)
      → weightedRandom() for per-subject counts
      → enforce maxTotalPapers (greedy trim)
      → selectPaper() × N for each subject
          → collectLeafPaths() → all terminal paths with cumulative weights
          → effectiveWeight() → apply coverage-first de-weighting
          → weightedRandomChoice() → pick one paper
      → Fisher-Yates shuffle
      → schedulePapers() (LFD bin-packing)
  → User reviews warnings and confirms
  → saveWeeklySchedule(uid, weekId, schedule)
```

### Flow: Complete a scheduled paper

```
User clicks "Complete" on DashboardPage
  → CompletionDetailsModal opens (pre-filled with timer data if active)
  → User enters marks/grade/time/comment/reviewTopics, clicks Submit
  → handleComplete(idx, updates)
      → reads session.elapsedSeconds from TimerContext
      → stopSession() (clears Firestore activeSession doc)
      → completePaper(uid, ctx) [completion.js orchestrator]
          → updatePaper(uid, weekId, idx, { marks, grade, completed: true, ... }) [schedule.js]
          → recordCompletion(uid, paperData) [papers.js]
              → check existingDocId for XP farming
              → writeBatch: completedPapers doc + userPublicStats increments
              → updateStreak(uid) [social.js]
                  → computeNextStreak(today, last, current)
                  → setDoc userPublicStats with new streak
              → awardXpAndBadges(uid, paperData, stats) [social.js]
                  → calculateXp() → breakdown
                  → check BADGE_DEFS for newly earned badges
                  → increment xp, update level, arrayUnion badge ids
                  → write badge docs
              → maybeUpdatePB(uid, subject, paperPath, seconds)
          → addReviewTopics(uid, topics, subject) [review.js] (best-effort)
      → re-fetch userPublicStats
      → setCelebration({ xpEarned, newBadges, isPB, ... })
      → XpCelebration overlay renders
```

### Flow: Join a class

```
User enters 6-char code on ClassesPage
  → joinClass(uid, displayName, code) [social.js]
      → initPublicStats(uid, displayName) — creates doc if not exists
      → query classes by code (case-insensitive)
      → if already member → return classId
      → updateDoc: members: arrayUnion(uid)
      → return classId
  → navigate to /classes/{classId} (leaderboard)
```

### Flow: Timer across page navigation

```
User starts timer on DashboardPage
  → startSession(paperData, expectedMins) [TimerContext]
      → clearActiveSession() — kill any prior session
      → startActiveSession(uid, sessionData) — write to Firestore
      → baseElapsedRef = 0, startedAtRef = Date.now()
      → setInterval: elapsed = base + (Date.now() - startedAt) / 1000
      → setIsFullscreen(true)

User navigates to CalendarPage
  → TimerContext state is preserved (React Context)
  → Timer keeps ticking
  → Timer widget renders on CalendarPage with running state

User refreshes the page
  → TimerContext mounts, uid available
  → getActiveSession(uid) → Firestore doc exists, isRunning: true, startedAt: Timestamp
  → additionalElapsed = (Date.now() - startedAt.toMillis()) / 1000
  → baseElapsedRef = fs.elapsedSeconds + additionalElapsed
  → Timer continues seamlessly from the correct elapsed time
```

---

## Appendix: Key Constants

| Constant | Value | Purpose |
|---|---|---|
| `CALENDAR_GRID_START_HOUR` | 7 | Calendar renders from 7am |
| `CALENDAR_GRID_END_HOUR` | 22 | Calendar renders until 10pm |
| `PX_PER_MIN` | 0.9 | Pixels per minute in calendar grid |
| `SNAP_MINS` | 15 | Time block dragging snaps to 15 min |
| `DEFAULT_DURATION` | 120 min | Fallback paper duration |
| `DEFAULT_BREAK` | 10 min | Default break between papers |
| `TOAST_DURATION_MS` | 4000 | Toast auto-dismiss time |
| Ad-hoc XP cap | 3/day | Max ad-hoc papers that award XP per day |
| XP per level | 500 | XP threshold per level |
| Max textbook/week | 2 | Further Maths textbook cap |

## Appendix: Default Week Templates

| Template | Subjects | Max papers/subject | Common papers/subject | Max total |
|---|---|---|---|---|
| Week A | maths, furtherMaths, physics, CS | 6 | 2 | 16 |
| Week B | same | 5 | 2 | 14 |
| Holiday | same | 8 | 3 | 20 |
