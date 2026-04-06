# A-Level Revision Planner

**Live demo:** https://pastpapers-a8b7v6-f7f04.web.app/

A full-stack web application that helps A-Level students build structured, personalised revision schedules — tracking every past paper they complete, visualising progress over time, and staying motivated through gamification.

Built with React 19, Firebase, and Tailwind CSS.

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
  └── completedPapers/{id}          — marks, grade, timestamp
classes/{classId}
  └── members, leaderboard entries
```
