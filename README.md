# A-Level Revision Planner

[![CI](https://github.com/WithoutTheDot/alevel-revision-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/WithoutTheDot/alevel-revision-planner/actions/workflows/ci.yml)

**Live demo:** https://pastpapers-a8b7v6-f7f04.web.app/

A full-stack web application that helps A-Level students build structured, personalised revision schedules — tracking every past paper they complete, visualising progress over time, and staying motivated through gamification.

Built with React 19, Firebase, and Tailwind CSS.

---

## Motivation

During A-Level revision I found myself manually deciding which past paper to do each day, losing track of what I'd already completed, and having no way to see whether my marks were improving. I built this to solve all three problems in one place — generating a weighted schedule based on actual exam board paper structures, logging every result, and surfacing the trends that matter.

---

## Screenshots

### Landing page
![Hero](docs/screenshots/screenshot-hero.png)

![Features](docs/screenshots/screenshot-features.png)

![How it works](docs/screenshots/screenshot-howitworks.png)

### Dashboard
![Dashboard — streak, XP, upcoming papers, exam countdown](docs/screenshots/screenshot-dashboard.png)

### Weekly calendar
![Calendar — hour-based weekly grid with paper blocks](docs/screenshots/screenshot-calendar.png)

### Schedule generation
![Generate — time block preview before generating a week](docs/screenshots/screenshot-generate.png)

### History & analytics
![History — filterable paper log with marks and grades](docs/screenshots/screenshot-history.png)

![History charts — grade distribution and papers per week](docs/screenshots/screenshot-charts.png)

### Badges & XP
![Badges — milestone and streak achievements](docs/screenshots/screenshot-badges.png)

---

## Features

### Scheduling
- **Term calendar** — mark weeks as Term A, Term B, or Holiday across your academic year
- **Time block templates** — define your weekly availability (e.g. "Mon 4–6pm, Sat 9am–1pm")
- **Auto-generate schedules** — one click produces a week's worth of papers, weighted by exam structure (correct paper-type ratios per board/subject)
- **Interactive weekly calendar** — drag-and-drop hour-based grid, export to clipboard

### Paper tracking
- Mark any paper complete, enter your raw marks and grade
- Full history table with search, subject/grade filters, and date range filtering
- Progress charts — marks over time (line), grade distribution (bar) per subject
- **Review mode** — tag weak topics after each paper (e.g. "integration", "chain rule"); topics go into a review queue, can be scheduled to a specific week, and appear as distinct review blocks in the calendar; a topic frequency chart surfaces your most-struggled areas

### Gamification
- **XP & levels** — earn XP for every paper completed, level up over time
- **Badges** — 15+ unlockable achievements (streaks, milestones, subject mastery)
- **Leaderboard** — compare progress with classmates in a shared class
- **Classes** — create or join a class, invite others via code

### Dashboard
- Live exam countdown per subject
- Upcoming papers this week
- Subject breakdown with completion percentages
- XP progress bar and badge showcase

### Supporting features
- Fullscreen focus timer (Pomodoro-style) per paper session
- PDF export of schedule via jsPDF
- Dark mode
- Onboarding wizard — choose subjects, set exam dates, pick exam board per subject
- 30 A-Level subjects supported, each with correct paper structures for AQA, OCR, Edexcel, and other boards
- Settings: manage subjects, exam dates, paper durations, and account details
- Admin panel for managing users and classes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, React Router DOM 7 |
| Styling | Tailwind CSS 3, Headless UI, Framer Motion |
| Backend / DB | Firebase 12 — Firestore (NoSQL), Firebase Auth |
| Charts | Recharts |
| PDF | jsPDF + jsPDF-AutoTable |
| Drag & drop | react-beautiful-dnd |
| Date logic | date-fns |
| Testing | Vitest, Testing Library |
| Hosting | Firebase Hosting |

---

## Architecture highlights

- **Context-driven data layer** — `AuthContext` seeds user defaults on registration; `SubjectsContext` provides subject/colour state globally, keeping pages decoupled from Firestore calls
- **Paper tree algorithm** — `paperTrees.js` encodes the decision trees for every supported exam board, producing correct paper-type weightings (e.g. AQA Physics Paper 3B = 7.7% of selections). `generateSchedule.js` walks these trees with weighted-random selection to build a balanced week
- **Subcollection architecture** — term calendar entries live under `users/{uid}/termCalendar/{mondayDateStr}` to avoid document size limits and enable efficient per-week queries
- **Code splitting** — React lazy + Suspense on all routes; Vite manual chunks for vendor, Firebase, and charts bundles, keeping initial load fast
- **Firestore security rules** — all reads/writes scoped to authenticated `uid`; server-side validation on field types
- **Custom hooks** — `useAsyncData`, `useTimer`, `useDarkMode`, `useDebounce` extracted for reuse and testability

---

## Getting started

### Prerequisites
- Node.js 18+
- A Firebase project (Firestore + Authentication enabled)

### Setup

```bash
git clone https://github.com/WithoutTheDot/alevel-revision-planner.git
cd alevel-revision-planner
npm install --legacy-peer-deps
```

Copy the environment template and fill in your Firebase config:

```bash
cp .env.example .env
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Deploy Firestore rules and indexes:

```bash
firebase deploy --only firestore
```

Start the dev server:

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Production build

```bash
npm run build
firebase deploy
```

---

## Project structure

```
src/
├── components/       # Shared UI components (Modal, Layout, badges, timer…)
├── contexts/         # AuthContext, SubjectsContext
├── firebase/         # Firebase init, all Firestore CRUD helpers (db.js)
├── hooks/            # useAsyncData, useTimer, useDarkMode, useDebounce
├── lib/              # Business logic — paper trees, schedule generation,
│                     # badge definitions, grade utils, export helpers
└── pages/            # One file per route (Dashboard, Calendar, History…)
```

---

## Environment variables

See `.env.example`. All variables are prefixed `VITE_` and consumed at build time by Vite. No server-side secrets are required — all backend logic runs through Firebase SDKs with Firestore security rules enforcing access control.

---

## Firestore data model

```
users/{uid}
  ├── profile          — subjects, exam dates, XP, level
  ├── settings/
  │   └── durations    — per-subject paper duration overrides
  ├── termCalendar/{mondayDateStr}   — week type (A/B/Holiday)
  ├── templates/{id}   — time block templates
  ├── schedule/{id}    — generated paper slots
  ├── completedPapers/{id}          — marks, grade, timestamp, reviewTopics[]
  └── reviewQueue/{id}              — topic review tasks (pending/scheduled/done)
classes/{classId}
  └── members, leaderboard entries
```

---

## Technical challenges

### 1. Weighted paper selection with coverage-first deduplication

The naive approach to picking a revision paper is random — but that means students repeat papers they just did, or never see rare paper types. The scheduler in `src/lib/generateSchedule.js` applies a graduated weight system:

- **0** — already chosen this week (hard exclude, no duplicates)
- **0.01** — completed in recent weeks (strongly deprioritised)
- **0.05** — completed at any point in history (mildly deprioritised)
- **1.0** — never attempted (full weight)

This means the schedule naturally steers toward unseen papers without ever being rigid. If a student has genuinely done every paper, it falls back gracefully to equal weight rather than erroring.

### 2. Encoding exam board paper structures as recursive decision trees

Every exam board has a different paper structure — AQA Physics has Paper 3B with three variants (BA, BB, BC) each worth roughly 1/12 of its parent's weight, while OCR Maths has Pure/Statistics/Mechanics as equal siblings. Hard-coding these as flat lists would lose all structural information.

Instead, `src/lib/paperTrees.js` encodes each subject as a recursive tree of weighted options. The scheduler walks the tree with `collectLeafPaths`, multiplying weights along each branch to compute correct end-to-end probabilities. AQA Physics Paper 3B variants naturally land at ~7.7% of total selections without any special-casing.

### 3. Bin-packing papers into time blocks

Once papers are selected, they need to fit into the student's available time blocks (e.g. "Monday 9am–12pm, Tuesday 2pm–5pm"). This is a variant of the bin-packing problem.

The scheduler uses a two-pass approach in `schedulePapers`:
1. **Longest-fit-decreasing** — sorts papers by duration descending and greedily places each into the first block with enough space, squeezing out inter-paper breaks when needed
2. **Gap-fill pass** — any unscheduled papers (too long for the first pass) are retried shortest-first against remaining capacity

This gets close-to-optimal packing without the exponential cost of a full search.

### 4. Subcollection architecture to avoid Firestore document size limits

An obvious data model puts the entire term calendar — 30+ weeks of A/B/Holiday entries — in the user's profile document. Firestore has a 1 MB document size limit, and a document that also holds subjects, exam dates, XP history, and settings would approach it quickly.

Instead, `termCalendar` is a subcollection: `users/{uid}/termCalendar/{mondayDateStr}`. Each week is its own document. This keeps the profile document small and enables efficient per-week queries without reading the whole calendar.

### 5. Probabilistic testing for the schedule generator

The schedule generator uses randomness, which makes standard assertion-based tests inadequate — a single run might pass by luck. The test suite in `src/lib/__tests__/generateSchedule.test.js` runs each constraint check 100–200 times and asserts it holds on every run:

```js
it('Physics AQA Paper 3B variants appear ~1/4 of AQA paper selections', () => {
  // Run 200 times, collect Paper 3B frequency, assert within expected range
});
```

This catches weighting bugs that would be invisible to a one-shot test.

---

## Testing & CI

**91 tests** across 5 suites, run with Vitest and Testing Library.

| Suite | Tests | What it covers |
|---|---|---|
| `generateSchedule.test.js` | 8 | Schedule constraints, statistical paper weighting (100–200 iterations each) |
| `pmtLinks.test.js` | 45 | Past paper URL generation for every subject/board/year combination |
| `builtInFamilies.test.js` | 26 | Paper family structure and metadata validation |
| `useAsyncData.test.js` | 5 | Custom hook loading/error/success states |
| `Modal.test.jsx` | 7 | Component render, open/close, keyboard accessibility |

A GitHub Actions CI pipeline runs lint → test → build on every push and pull request.

---

## What I'd build next

- **Spaced repetition scoring** — weight paper selection not just by recency but by past grade, so papers where the student scored below a threshold come back more often
- **Mark scheme integration** — link directly to official mark schemes alongside each paper
- **Mobile app** — the scheduling and completion flow maps well to React Native; calendar notifications for scheduled papers would be the key addition
- ~~**Topic-level tracking**~~ — shipped as review mode (tag topics after papers, queue for review, charts in History)
- **Shared class schedules** — teachers generating a schedule template that pushes recommended papers to all students in a class
