# Interview Prep — A-Level Past Paper Planner

---

## What is it?

A web app that automatically generates personalised past paper revision schedules for A-Level students. You tell it your subjects, exam dates, and when you're free to study — it builds a weekly timetable of papers to complete, tracks your marks, and adapts future selections based on what you've already done.

It's live and being used by real students right now.

---

## The problem it solves

Revision without structure is inefficient. Most students either:
- Redo papers they've already done (wasted time), or
- Pick papers randomly with no awareness of coverage

This app solves both: it tracks every paper you've ever done and weights future selections away from recently completed ones, so you naturally get broad coverage without thinking about it.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + Vite 7 | Fast dev server, modern React features |
| Styling | Tailwind CSS 3 | Utility-first, consistent design fast |
| Routing | React Router DOM 7 | SPA navigation, lazy-loaded routes |
| Backend/DB | Firebase (Firestore + Auth) | Real-time, no server to manage, free tier |
| Charts | Recharts | Easy integration with React |
| Testing | Vitest | Vite-native, fast unit tests |

---

## Architecture overview

```
User
  └── React SPA (Vite)
        ├── AuthContext  — Firebase Auth, user profile, onboarding state
        ├── SubjectsContext  — active subjects + exam timetable
        ├── TimerContext  — live paper timer, persisted across navigation
        └── Pages (lazy-loaded)
              ├── Dashboard  — weekly progress, streak, XP, upcoming papers
              ├── Generate  — 3-step wizard: pick week → preview papers → save
              ├── Calendar  — hour-based weekly grid of scheduled papers
              ├── History  — filterable table + charts of all completions
              ├── Review  — spaced review queue based on weak topics
              ├── Leaderboard  — class-based XP comparison
              └── Settings  — subjects, exam dates, durations, data export

Firebase Firestore
  ├── users/{uid}/profile
  ├── users/{uid}/settings/durations
  ├── users/{uid}/termCalendar/{mondayStr}  ← subcollection
  ├── users/{uid}/weeklySchedules/{weekId}
  └── users/{uid}/completedPapers/{id}
```

All database logic is in `src/firebase/db/` — split into modules (profile, schedule, completion, review, social, admin) and re-exported from a single index.

---

## The scheduling algorithm

This is the most technically interesting part.

Each subject has a **decision tree** (`paperTrees.js`) — a recursive structure of choices (board → year → paper type) that enumerates every valid past paper. For example, OCR Maths branches to year (2018–2024) → paper (Pure / Statistics / Mechanics).

When generating a week's schedule (`generateSchedule.js`):

1. **Count papers per subject** using a weighted random function that clusters around a "most common" value
2. **Select papers** using coverage-first weighted selection:
   - Papers done *this week*: weight = 0 (hard exclude, no duplicates)
   - Papers done *recently* (past few weeks): weight × 0.01
   - Papers done *ever but not recently*: weight × 0.05
   - Papers never done: full weight
3. **Shuffle** the selected papers so subjects are interleaved
4. **Bin-pack into time blocks** using a longest-fit-decreasing algorithm with a gap-fill second pass

The result: you never do the same paper twice in a week, rarely repeat recent papers, and naturally work through unseen papers first.

---

## Key challenges

### 1. AI losing scope mid-feature

**The real challenge of this project wasn't the code — it was coordinating AI to build it.**

When using Claude Code to build features, the AI would sometimes:
- Start solving a problem correctly, then quietly drift and implement something subtly different
- Fix a bug in one place while silently breaking something else
- Over-engineer a solution well beyond what was asked

**How I handled it:**
- Broke every feature into small, explicit phases (14 in total) with clear acceptance criteria before starting
- Reviewed diffs after every change rather than accepting large batches
- When something looked wrong, I'd point to the exact line rather than re-describing the whole feature
- Kept a running notes document of decisions made, so when context reset I could re-anchor the AI quickly
- Used the AI's own output as the spec for the next step — "given what you just built, now add X"

This taught me that **directing AI is a skill in itself** — you need to be precise about scope, suspicious of "improvements" you didn't ask for, and methodical about verification.

### 2. Firestore data model decisions

Firestore is a document database — you can't do arbitrary joins. Early decisions about document structure are hard to undo once users have data.

Key decision: term calendar weeks live in a **subcollection** (`users/{uid}/termCalendar/{mondayStr}`) rather than embedded in the user doc. This avoids the 1MB document limit and lets you query individual weeks efficiently.

The tricky part: Firestore security rules have to mirror your data model exactly. A mismatch between rules and code silently fails in production even when dev mode works fine.

### 3. The weighted scheduling edge cases

The coverage-first selection looked simple but had several subtle bugs:

- **What if all papers have been done recently?** The pool would be empty and selection would crash. Fix: fall back to equal weights when the filtered pool is empty.
- **Textbook entries** (a special "study from textbook" paper) can appear up to twice in a week — but normal papers can't. Treating them identically broke the deduplication logic. Fix: track textbook count separately, don't add to the exclusion set.
- **Time block packing**: a paper that doesn't fit with a break gap before it might fit without the gap. The first-pass algorithm now tries dropping the gap before skipping the slot.

### 4. Paper path collision

Paper paths like `"paper1-2022"` don't include the subject name. Two different subjects could produce the same path string, which would corrupt the exclusion set used during scheduling. Fix: paths are always stored and compared as `{ subject, paperPath }` pairs, never bare strings.

---

## What I'm proud of

**Real users.** This isn't a toy. Students are actually using it to plan their revision, logging completions, and getting scheduled weeks out of it. Seeing the leaderboard fill up with real activity is different from any amount of localhost testing.

**The algorithm is genuinely useful.** The weighted coverage system means users naturally spread their effort across all papers without thinking about it. That's the kind of feature that only works if you understand the problem domain, not just the code.

**Scope discipline.** Building this over ~14 phases, keeping each phase focused, meant the codebase stayed coherent even though it grew large. The database module is split into 8 focused files. Routes are lazy-loaded. Tests cover the scheduling logic. It doesn't feel hacked together.

---

## Likely interview questions

**"Did you build this yourself?"**
> I acted as the lead — I decided what to build, broke it into phases, reviewed every change, and caught and corrected errors. I used AI as a coding tool, the same way a developer uses Stack Overflow or a senior for code review. The architectural decisions, the problem framing, and the quality control were mine.

**"What would you do differently?"**
> I'd write tests earlier. The scheduling algorithm accumulated several edge-case bugs that would have been caught immediately with unit tests. I added tests later, and they did catch a couple of regressions, but TDD from the start would have saved debugging time.

**"How does the scheduling algorithm work?"**
> See the "scheduling algorithm" section above. Lead with the decision tree structure, then the weighted selection, then the bin-packing. Mention the edge cases.

**"How did you handle authentication?"**
> Firebase Auth handles sign-in. On first login, `AuthContext` detects a new user and seeds default Firestore documents — profile, settings, empty term calendar. The `PrivateRoute` component wraps all authenticated pages and redirects to login if the session isn't active. Onboarding is a 3-step wizard that runs once after registration.

**"What is Firestore and why did you use it?"**
> It's a NoSQL document database from Firebase. I chose it because it handles auth, real-time sync, and hosting in one place — no backend server to write or maintain. The trade-off is that the query model is more constrained than SQL, which forced me to think carefully about document structure upfront.

**"What does the leaderboard / social feature do?"**
> Users can join classes. Completing papers earns XP (with bonuses for personal bests, streaks, and high grades). The leaderboard shows XP rankings within a class in real-time via Firestore `onSnapshot` listeners.

**"What's the hardest bug you fixed?"**
> The time block bin-packing had a subtle issue where papers would fail to schedule even when there was technically space, because the algorithm always added a break gap before each paper — meaning a paper that would fit without the gap got dropped. The fix was a two-pass approach: first pass with gaps, second pass gap-fills with the remaining papers.

---

## Numbers to remember

- ~14 development phases over ~1 month
- 30 supported subjects (maths, further maths, physics, CS, and more)
- Papers span 2018–2024 across multiple exam boards (OCR, AQA, Edexcel)
- Firebase Firestore subcollections: `termCalendar`, `weeklySchedules`, `completedPapers`
- Weighted selection weights: this week = 0, recent = 0.01×, ever done = 0.05×, unseen = 1×
- Scheduling algorithm: longest-fit-decreasing with gap-fill second pass
