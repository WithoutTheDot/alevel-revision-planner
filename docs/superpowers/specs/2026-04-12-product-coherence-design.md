# Product Coherence Redesign

**Date:** 2026-04-12  
**Status:** Approved

## Problem

14 phases of feature development produced 10+ flat nav items with equal visual weight. No hierarchy communicates what matters. The core user loop (pick paper → start timer → mark complete) spans multiple pages. Gamification features (XP, badges, leaderboard) are siloed rather than ambient.

## Goal

Make the app feel like one product with a clear core loop, not a toolkit of features. Three independent changes delivered in sequence.

---

## Change 1 — Nav restructuring

### What changes
`Layout.jsx` sidebar reorganised into 4 labelled groups. All items always visible (no expand/collapse). Section labels are non-interactive dividers.

### New structure
```
STUDY
  Dashboard
  Calendar

PLAN
  Term Schedule
  Templates
  Generate

PROGRESS
  History
  Review

PROFILE
  Classes
  Badges
  Settings
  Admin        ← shown only when user has admin role
```

### Rules
- `LeaderboardPage` route stays (direct URLs work) but nav link is removed. Entry point becomes a tab inside Classes.
- No pages deleted. Only nav links reorganised.
- Active section header gets accent colour to orient the user.

### Files touched
- `src/components/Layout.jsx` — nav restructure only

---

## Change 2 — Dashboard core loop

### What changes
"Upcoming papers" cards on Dashboard gain a **Start** button that launches the existing timer + completion flow without navigating to Calendar.

### Flow
1. User clicks **Start** on an upcoming paper card
2. `StartTimerModal` opens (existing component, unchanged)
3. Timer runs; on finish → `PaperCompleteModal` opens (existing component, unchanged)
4. Marks entered, saved to Firestore via existing `recordCompletion`
5. Dashboard re-fetches upcoming papers

### Implementation
- `DashboardPage.jsx` imports `StartTimerModal` and `PaperCompleteModal`
- Adds `selectedPaper` state (null | paper object)
- `UpcomingPapers` component receives `onStart` callback prop; renders Start button per card
- No new components. No changes to modal internals.

### Files touched
- `src/pages/DashboardPage.jsx`
- `src/components/UpcomingPapers.jsx` — add `onStart` prop + Start button

---

## Change 3 — Gamification integration

### What changes
Gamification surfaces on Dashboard as ambient context. Leaderboard moves inside Classes as a tab.

### Dashboard additions
Three elements added to existing Dashboard layout:

| Element | Source | Placement |
|---|---|---|
| XP bar + level | `LevelCard` (exists) | Top of Dashboard if not already prominent |
| Day streak | Profile Firestore field | Stat alongside XP |
| Latest badge | Profile `badges[]` array, most recent | Small card; links to Badges page |

### Classes + Leaderboard
- `ClassesPage.jsx` gets a tab bar: **Members** | **Leaderboard**
- Leaderboard data fetch + render logic moved from `LeaderboardPage.jsx` into `ClassesPage.jsx` under the Leaderboard tab
- `LeaderboardPage.jsx` kept but nav link removed
- Nav entry for Leaderboard removed from Layout

### Files touched
- `src/pages/DashboardPage.jsx` — add streak stat, latest badge card
- `src/pages/ClassesPage.jsx` — add tab bar, embed leaderboard
- `src/pages/LeaderboardPage.jsx` — no changes (route preserved)
- `src/components/Layout.jsx` — remove Leaderboard nav link

---

## Delivery order

1. Change 1 (nav) — standalone, zero risk, immediately visible
2. Change 2 (Dashboard loop) — independent of nav, testable on its own
3. Change 3 (gamification) — builds on Dashboard changes from Change 2

Each change is independently deployable and reviewable.

---

## Out of scope

- No new components
- No new pages
- No changes to Firestore schema
- No changes to modal internals
- No mobile-specific layout changes
