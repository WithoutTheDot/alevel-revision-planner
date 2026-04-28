# Usability Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four parallel usability improvements: data integrity (tests + error visibility), full subject coverage (every subject with built-in families gets a scheduling tree), a "Today" section on the dashboard, and a Quick Log floating action button.

**Architecture:** Tracks A–D are independent and can be executed in any order, but A (data integrity) is lowest risk to do first since it adds tests and logging without changing behaviour. Each track produces a working, committed improvement on its own.

**Tech Stack:** React 19 + Vite, Firebase/Firestore, Vitest, Tailwind CSS

---

## Track A — Data Integrity

**Goal:** Add unit tests for core XP/streak logic, extract pure functions so they're testable without Firebase mocks, and replace silent `catch(() => {})` blocks with `console.error` logging.

### Files
- Create: `src/lib/xpUtils.js` — pure XP calculation extracted from `awardXpAndBadges`
- Create: `src/lib/__tests__/xpUtils.test.js`
- Create: `src/lib/__tests__/streakUtils.test.js` — tests for streak date logic
- Modify: `src/firebase/db/social.js` — `awardXpAndBadges` delegates XP math to `xpUtils.js`
- Modify: `src/firebase/db/papers.js` — replace silent catches with `console.error`
- Modify: `src/firebase/db/completion.js` — replace silent catches with `console.error`

---

### Task A1: Extract pure XP calculation

**Files:**
- Create: `src/lib/xpUtils.js`

- [ ] **Step 1: Create `src/lib/xpUtils.js`**

```js
/**
 * Pure XP calculation — no Firebase dependency.
 * @param {{ grade?: string, timeTaken?: number, expectedTime?: number }} paperData
 * @param {{ currentStreak?: number }} stats
 * @returns {{ base: number, gradeBonus: number, timeBonus: number, streakBonus: number, total: number }}
 */
export function calculateXp(paperData, stats) {
  const base = 25;
  const gradeBonus = (paperData.grade === 'A' || paperData.grade === 'A*') ? 25 : 0;

  let timeBonus = 0;
  if (
    paperData.timeTaken != null &&
    paperData.expectedTime != null &&
    paperData.timeTaken < paperData.expectedTime &&
    paperData.expectedTime > 0
  ) {
    const pctFaster = (paperData.expectedTime - paperData.timeTaken) / paperData.expectedTime;
    timeBonus = Math.min(50, Math.round(pctFaster * 100));
  }

  const streak = stats.currentStreak ?? 0;
  let streakBonus = 0;
  if (streak === 7)  streakBonus = 50;
  if (streak === 30) streakBonus = 150;

  const total = base + gradeBonus + timeBonus + streakBonus;
  return { base, gradeBonus, timeBonus, streakBonus, total };
}

/**
 * Pure streak date logic — given lastStudyDate and currentStreak, compute the new streak.
 * @param {string} today  ISO date string 'YYYY-MM-DD'
 * @param {string} last   ISO date string of last study date (or '' if none)
 * @param {number} current  current streak value
 * @returns {{ newStreak: number, alreadyCounted: boolean }}
 */
export function computeNextStreak(today, last, current) {
  if (last === today) return { newStreak: current, alreadyCounted: true };
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const newStreak = last === yStr ? current + 1 : 1;
  return { newStreak, alreadyCounted: false };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/xpUtils.js
git commit -m "feat: extract pure XP and streak calculation to xpUtils.js"
```

---

### Task A2: Tests for XP and streak logic

**Files:**
- Create: `src/lib/__tests__/xpUtils.test.js`

- [ ] **Step 1: Write tests**

```js
import { describe, it, expect } from 'vitest';
import { calculateXp, computeNextStreak } from '../xpUtils';

describe('calculateXp', () => {
  it('returns base 25 with no bonuses when no grade/time/streak', () => {
    const result = calculateXp({}, {});
    expect(result).toEqual({ base: 25, gradeBonus: 0, timeBonus: 0, streakBonus: 0, total: 25 });
  });

  it('adds 25 grade bonus for A', () => {
    const { gradeBonus, total } = calculateXp({ grade: 'A' }, {});
    expect(gradeBonus).toBe(25);
    expect(total).toBe(50);
  });

  it('adds 25 grade bonus for A*', () => {
    const { gradeBonus } = calculateXp({ grade: 'A*' }, {});
    expect(gradeBonus).toBe(25);
  });

  it('no grade bonus for B', () => {
    const { gradeBonus } = calculateXp({ grade: 'B' }, {});
    expect(gradeBonus).toBe(0);
  });

  it('no time bonus when timeTaken >= expectedTime', () => {
    const { timeBonus } = calculateXp({ timeTaken: 90, expectedTime: 90 }, {});
    expect(timeBonus).toBe(0);
  });

  it('no time bonus when timeTaken > expectedTime', () => {
    const { timeBonus } = calculateXp({ timeTaken: 100, expectedTime: 90 }, {});
    expect(timeBonus).toBe(0);
  });

  it('computes time bonus proportionally when faster', () => {
    // 50% faster → 50% of 100 = 50, capped at 50
    const { timeBonus } = calculateXp({ timeTaken: 45, expectedTime: 90 }, {});
    expect(timeBonus).toBe(50);
  });

  it('time bonus capped at 50', () => {
    const { timeBonus } = calculateXp({ timeTaken: 1, expectedTime: 90 }, {});
    expect(timeBonus).toBe(50);
  });

  it('adds 50 streak bonus at exactly 7', () => {
    const { streakBonus } = calculateXp({}, { currentStreak: 7 });
    expect(streakBonus).toBe(50);
  });

  it('adds 150 streak bonus at exactly 30', () => {
    const { streakBonus } = calculateXp({}, { currentStreak: 30 });
    expect(streakBonus).toBe(150);
  });

  it('no streak bonus at streak 6', () => {
    const { streakBonus } = calculateXp({}, { currentStreak: 6 });
    expect(streakBonus).toBe(0);
  });

  it('no streak bonus at streak 8', () => {
    const { streakBonus } = calculateXp({}, { currentStreak: 8 });
    expect(streakBonus).toBe(0);
  });
});

describe('computeNextStreak', () => {
  it('returns alreadyCounted=true when today === last', () => {
    const result = computeNextStreak('2026-04-17', '2026-04-17', 5);
    expect(result).toEqual({ newStreak: 5, alreadyCounted: true });
  });

  it('increments streak when last was yesterday', () => {
    const result = computeNextStreak('2026-04-17', '2026-04-16', 4);
    expect(result).toEqual({ newStreak: 5, alreadyCounted: false });
  });

  it('resets streak to 1 when last was 2 days ago', () => {
    const result = computeNextStreak('2026-04-17', '2026-04-15', 10);
    expect(result).toEqual({ newStreak: 1, alreadyCounted: false });
  });

  it('starts streak at 1 when no prior study date', () => {
    const result = computeNextStreak('2026-04-17', '', 0);
    expect(result).toEqual({ newStreak: 1, alreadyCounted: false });
  });
});
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
cd /media/goog/Projects/pastpapers && npm test -- --reporter=verbose 2>&1 | grep -A3 "xpUtils"
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/xpUtils.test.js
git commit -m "test: add unit tests for XP calculation and streak logic"
```

---

### Task A3: Wire `social.js` to use the extracted pure functions

**Files:**
- Modify: `src/firebase/db/social.js`

- [ ] **Step 1: Update `awardXpAndBadges` to use `calculateXp`**

In `src/firebase/db/social.js`, add the import at the top:

```js
import { calculateXp } from '../../lib/xpUtils';
```

Replace the manual XP computation block inside `awardXpAndBadges` (everything from `const base = 25` through `xpEarned += streakBonus`) with:

```js
  const { total: xpEarned, streakBonus } = calculateXp(
    { grade: paperData.grade, timeTaken: paperData.timeTaken, expectedTime: paperData.expectedTime },
    { currentStreak: updatedStats.currentStreak ?? 0 }
  );
  // Keep streakBonus in scope so the streak-milestone checks below remain correct.
  // (The bonus is now inside xpEarned; streakBonus here is only used for the
  //  badge-context streak value which is computed separately from updatedStats.)
```

**Important:** `awardXpAndBadges` currently uses a mutable `xpEarned` variable that it increments. After the change, `xpEarned` is the `total` from `calculateXp` and is `const`. The rest of the function (badge checks, XP write) uses `xpEarned` unchanged — verify the variable name matches in the `setDoc` call further down.

- [ ] **Step 2: Update `updateStreak` to use `computeNextStreak`**

Add import (it's already in the file if you added it above — if not, add to the import):

```js
import { computeNextStreak } from '../../lib/xpUtils';
```

Replace the streak computation logic in `updateStreak`:

```js
export async function updateStreak(uid) {
  const ref = doc(db, 'userPublicStats', uid);
  const snap = await getDoc(ref);
  const today = new Date().toISOString().slice(0, 10);
  const data = snap.exists() ? snap.data() : {};
  const last = data.lastStudyDate ?? '';
  const current = data.currentStreak ?? 0;
  const longest = data.longestStreak ?? 0;

  const { newStreak, alreadyCounted } = computeNextStreak(today, last, current);
  if (alreadyCounted) return;

  await setDoc(ref, {
    currentStreak: newStreak,
    longestStreak: Math.max(longest, newStreak),
    lastStudyDate: today,
  }, { merge: true });
}
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
cd /media/goog/Projects/pastpapers && npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/firebase/db/social.js
git commit -m "refactor: use pure calculateXp/computeNextStreak in awardXpAndBadges and updateStreak"
```

---

### Task A4: Replace silent catches with logging

**Files:**
- Modify: `src/firebase/db/papers.js`
- Modify: `src/firebase/db/completion.js`

- [ ] **Step 1: Fix `papers.js` silent catches**

Search `src/firebase/db/papers.js` for `catch (_)` and `catch (() => {})`. Replace each with a `console.error` variant:

```js
// BEFORE
} catch (_) { /* best-effort */ }

// AFTER
} catch (e) { console.error('[papers] best-effort op failed:', e); }
```

Do the same for any `.catch(() => {})` chains in that file:

```js
// BEFORE
.catch(() => {})

// AFTER
.catch((e) => console.error('[papers] best-effort op failed:', e))
```

- [ ] **Step 2: Fix `completion.js` silent catches**

In `src/firebase/db/completion.js` the `addReviewTopics` call is already using `console.error` — verify it matches:

```js
  if (reviewTopics?.length > 0) {
    await addReviewTopics(uid, reviewTopics, subject).catch((err) => {
      console.error('[completion] Failed to sync review topics:', err);
    });
  }
```

If it already matches, no change needed.

- [ ] **Step 3: Run tests**

```bash
cd /media/goog/Projects/pastpapers && npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/firebase/db/papers.js src/firebase/db/completion.js
git commit -m "fix: replace silent catch blocks with console.error logging"
```

---

## Track B — Subject Coverage

**Goal:** Add paper decision trees for all subjects that already have built-in paper families (chemistry, biology, psychology, sociology, economics, history, geography, english, business, law, pe, statistics). This enables the scheduler to auto-select papers for those subjects.

### Files
- Modify: `src/lib/paperTrees.js` — add trees for each new subject, export all in `SUBJECT_TREES`
- Modify: `src/lib/allSubjects.js` — add `builtIn: true` and update `BUILT_IN_SUBJECT_IDS`
- Modify: `src/lib/generateSchedule.js` — add default durations for new subjects
- Modify: `src/lib/__tests__/generateSchedule.test.js` — add smoke test for new subjects

---

### Task B1: Add paper trees to `paperTrees.js`

**Files:**
- Modify: `src/lib/paperTrees.js`

The tree node structure must produce path arrays that match the `pathFn` in `builtInFamilies.js`. The rule: `getPaperPath(pathArray)` joins with `-`, so `['aqa', '2023', 'paper1']` → `'aqa-2023-paper1'` which matches `(y) => \`aqa-${y}-paper1\``. Verify each tree matches the corresponding family's `pathFn`.

- [ ] **Step 1: Add chemistry tree after the computerScience section**

At the end of `src/lib/paperTrees.js`, before the `export const SUBJECT_TREES` line, add:

```js
// ─── Chemistry ───────────────────────────────────────────────────────────────

const chemAqaPaperNode = {
  options: [
    { label: 'Paper 1 (Physical)',           value: 'paper1', terminal: true },
    { label: 'Paper 2 (Inorganic/Physical)', value: 'paper2', terminal: true },
    { label: 'Paper 3 (Organic/Physical)',   value: 'paper3', terminal: true },
  ],
};
const chemOcrAPaperNode = {
  options: [
    { label: 'Component 01', value: '01', terminal: true },
    { label: 'Component 02', value: '02', terminal: true },
    { label: 'Component 03', value: '03', terminal: true },
  ],
};
const chemEdexcelPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const chemAqaYearNode     = { options: yearOptions(2017, 2024, chemAqaPaperNode) };
const chemOcrAYearNode    = { options: yearOptions(2017, 2024, chemOcrAPaperNode) };
const chemEdexcelYearNode = { options: yearOptions(2017, 2024, chemEdexcelPaperNode) };

export const chemistry = {
  options: [
    { label: 'AQA',     value: 'aqa',     next: chemAqaYearNode },
    { label: 'OCR A',   value: 'ocra',    next: chemOcrAYearNode },
    { label: 'Edexcel', value: 'edexcel', next: chemEdexcelYearNode },
  ],
};

// ─── Biology ─────────────────────────────────────────────────────────────────

const bioAqaPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const bioOcrAProcessesNode  = { options: [{ label: 'Biological Processes', value: 'biological-processes', terminal: true }] };
const bioOcrADiversityNode  = { options: [{ label: 'Biological Diversity', value: 'biological-diversity', terminal: true }] };
const bioOcrAUnifiedNode    = { options: [{ label: 'Unified Biology',       value: 'unified-biology',       terminal: true }] };
const bioOcrAPaperNode = {
  options: [
    { label: 'Biological Processes', value: 'biological-processes', terminal: true },
    { label: 'Biological Diversity', value: 'biological-diversity', terminal: true },
    { label: 'Unified Biology',       value: 'unified-biology',       terminal: true },
  ],
};
const bioEdexcelPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const bioAqaYearNode     = { options: yearOptions(2017, 2024, bioAqaPaperNode) };
const bioOcrAYearNode    = { options: yearOptions(2017, 2024, bioOcrAPaperNode) };
const bioEdexcelYearNode = { options: yearOptions(2017, 2024, bioEdexcelPaperNode) };

export const biology = {
  options: [
    { label: 'AQA',     value: 'aqa',     next: bioAqaYearNode },
    { label: 'OCR A',   value: 'ocra',    next: bioOcrAYearNode },
    { label: 'Edexcel', value: 'edexcel', next: bioEdexcelYearNode },
  ],
};

// ─── Psychology ───────────────────────────────────────────────────────────────

const psychAqaPaperNode = {
  options: [
    { label: 'Paper 1 (Introductory Topics)',    value: 'paper1', terminal: true },
    { label: 'Paper 2 (Psychology in Context)',  value: 'paper2', terminal: true },
    { label: 'Paper 3 (Issues & Options)',       value: 'paper3', terminal: true },
  ],
};
const psychEdexcelPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const psychAqaYearNode     = { options: yearOptions(2017, 2024, psychAqaPaperNode) };
const psychEdexcelYearNode = { options: yearOptions(2017, 2024, psychEdexcelPaperNode) };

export const psychology = {
  options: [
    { label: 'AQA',     value: 'aqa',     next: psychAqaYearNode },
    { label: 'Edexcel', value: 'edexcel', next: psychEdexcelYearNode },
  ],
};

// ─── Sociology ────────────────────────────────────────────────────────────────

const socioAqaPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const socioAqaYearNode = { options: yearOptions(2017, 2024, socioAqaPaperNode) };

export const sociology = {
  options: [
    { label: 'AQA', value: 'aqa', next: socioAqaYearNode },
  ],
};

// ─── Economics ────────────────────────────────────────────────────────────────

const econAqaPaperNode = {
  options: [
    { label: 'Paper 1 (Markets)',   value: 'paper1', terminal: true },
    { label: 'Paper 2 (National)', value: 'paper2', terminal: true },
    { label: 'Paper 3 (Themes)',   value: 'paper3', terminal: true },
  ],
};
const econEdexcelPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const econAqaYearNode     = { options: yearOptions(2017, 2024, econAqaPaperNode) };
const econEdexcelYearNode = { options: yearOptions(2017, 2024, econEdexcelPaperNode) };

export const economics = {
  options: [
    { label: 'AQA',     value: 'aqa',     next: econAqaYearNode },
    { label: 'Edexcel', value: 'edexcel', next: econEdexcelYearNode },
  ],
};

// ─── History ──────────────────────────────────────────────────────────────────

const histAqaPaperNode = {
  options: [
    { label: 'Component 1', value: 'component1', terminal: true },
    { label: 'Component 2', value: 'component2', terminal: true },
    { label: 'Component 3', value: 'component3', terminal: true },
  ],
};
const histEdexcelPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const histAqaYearNode     = { options: yearOptions(2017, 2024, histAqaPaperNode) };
const histEdexcelYearNode = { options: yearOptions(2017, 2024, histEdexcelPaperNode) };

export const history = {
  options: [
    { label: 'AQA',     value: 'aqa',     next: histAqaYearNode },
    { label: 'Edexcel', value: 'edexcel', next: histEdexcelYearNode },
  ],
};

// ─── Geography ────────────────────────────────────────────────────────────────

const geogAqaPaperNode = {
  options: [
    { label: 'Paper 1 (Physical)', value: 'paper1', terminal: true },
    { label: 'Paper 2 (Human)',    value: 'paper2', terminal: true },
    { label: 'Paper 3 (Issue Eval)', value: 'paper3', terminal: true },
  ],
};
const geogEdexcelPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const geogAqaYearNode     = { options: yearOptions(2017, 2024, geogAqaPaperNode) };
const geogEdexcelYearNode = { options: yearOptions(2017, 2024, geogEdexcelPaperNode) };

export const geography = {
  options: [
    { label: 'AQA',     value: 'aqa',     next: geogAqaYearNode },
    { label: 'Edexcel', value: 'edexcel', next: geogEdexcelYearNode },
  ],
};

// ─── English Literature ───────────────────────────────────────────────────────

const engAqaPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const engAqaYearNode = { options: yearOptions(2017, 2024, engAqaPaperNode) };

export const english = {
  options: [
    { label: 'AQA', value: 'aqa', next: engAqaYearNode },
  ],
};

// ─── Business ─────────────────────────────────────────────────────────────────

const bizAqaPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const bizAqaYearNode = { options: yearOptions(2017, 2024, bizAqaPaperNode) };

export const business = {
  options: [
    { label: 'AQA', value: 'aqa', next: bizAqaYearNode },
  ],
};

// ─── Law ──────────────────────────────────────────────────────────────────────

const lawAqaPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
    { label: 'Paper 3', value: 'paper3', terminal: true },
  ],
};
const lawAqaYearNode = { options: yearOptions(2017, 2024, lawAqaPaperNode) };

export const law = {
  options: [
    { label: 'AQA', value: 'aqa', next: lawAqaYearNode },
  ],
};

// ─── Physical Education ───────────────────────────────────────────────────────

const peAqaPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
  ],
};
const peAqaYearNode = { options: yearOptions(2017, 2024, peAqaPaperNode) };

export const pe = {
  options: [
    { label: 'AQA', value: 'aqa', next: peAqaYearNode },
  ],
};

// ─── Statistics ───────────────────────────────────────────────────────────────

const statsAqaPaperNode = {
  options: [
    { label: 'Paper 1', value: 'paper1', terminal: true },
    { label: 'Paper 2', value: 'paper2', terminal: true },
  ],
};
const statsAqaYearNode = { options: yearOptions(2017, 2024, statsAqaPaperNode) };

export const statistics = {
  options: [
    { label: 'AQA', value: 'aqa', next: statsAqaYearNode },
  ],
};
```

- [ ] **Step 2: Update the `SUBJECT_TREES` export**

Replace:

```js
export const SUBJECT_TREES = { maths, furtherMaths, physics, computerScience };
```

With:

```js
export const SUBJECT_TREES = {
  maths, furtherMaths, physics, computerScience,
  chemistry, biology, psychology, sociology,
  economics, history, geography, english,
  business, law, pe, statistics,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/paperTrees.js
git commit -m "feat: add paper decision trees for chemistry, biology, psychology, sociology, economics, history, geography, english, business, law, pe, statistics"
```

---

### Task B2: Update `allSubjects.js`

**Files:**
- Modify: `src/lib/allSubjects.js`

- [ ] **Step 1: Mark new subjects as `builtIn: true` and update `BUILT_IN_SUBJECT_IDS`**

In `src/lib/allSubjects.js`, update the affected entries in `ALL_SUBJECTS`:

```js
  { id: 'chemistry',       label: 'Chemistry',         builtIn: true },
  { id: 'biology',         label: 'Biology',            builtIn: true },
  { id: 'economics',       label: 'Economics',          builtIn: true },
  { id: 'history',         label: 'History',            builtIn: true },
  { id: 'geography',       label: 'Geography',          builtIn: true },
  { id: 'english',         label: 'English Literature', builtIn: true },
  { id: 'psychology',      label: 'Psychology',         builtIn: true },
  { id: 'sociology',       label: 'Sociology',          builtIn: true },
  { id: 'business',        label: 'Business Studies',   builtIn: true },
  { id: 'law',             label: 'Law',                builtIn: true },
  { id: 'pe',              label: 'Physical Education', builtIn: true },
  { id: 'statistics',      label: 'Statistics',         builtIn: true },
```

Replace the `BUILT_IN_SUBJECT_IDS` line:

```js
export const BUILT_IN_SUBJECT_IDS = new Set([
  'maths', 'furtherMaths', 'physics', 'computerScience',
  'chemistry', 'biology', 'psychology', 'sociology',
  'economics', 'history', 'geography', 'english',
  'business', 'law', 'pe', 'statistics',
]);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/allSubjects.js
git commit -m "feat: mark chemistry/biology/humanities/other subjects as built-in"
```

---

### Task B3: Update default durations for new subjects

**Files:**
- Modify: `src/lib/generateSchedule.js`

- [ ] **Step 1: Update `getDefaultDurationForPath`**

The current function only has specific overrides for computerScience and physics. Most A-level papers are 120 min, but sciences and social sciences tend to be 90–120. Add sensible defaults:

```js
export function getDefaultDurationForPath(path, subject) {
  if (subject === 'computerScience') return 150;
  if (subject === 'physics') {
    if (path.includes('modelling-physics') || path.includes('exploring-physics')) return 135;
    if (path.includes('unified-physics')) return 90;
  }
  if (subject === 'psychology' || subject === 'sociology') return 90;
  if (subject === 'pe') return 90;
  if (subject === 'statistics') return 90;
  return 120; // maths, furtherMaths, chemistry, biology, economics, history, geography, english, business, law
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/generateSchedule.js
git commit -m "feat: add default durations for new subject types"
```

---

### Task B4: Smoke test for new subjects in scheduler

**Files:**
- Modify: `src/lib/__tests__/generateSchedule.test.js`

- [ ] **Step 1: Add smoke test**

Add this describe block to `src/lib/__tests__/generateSchedule.test.js`:

```js
describe('new subject coverage', () => {
  const NEW_SUBJECTS = ['chemistry', 'biology', 'psychology', 'sociology', 'economics', 'history', 'geography', 'english', 'business', 'law', 'pe', 'statistics'];

  for (const subject of NEW_SUBJECTS) {
    it(`selectPaper returns a paper for ${subject}`, () => {
      // Import at top of file: import { selectPaper } from '../generateSchedule';
      const result = selectPaper(subject, new Set(), [], { _default: 90 }, undefined, []);
      expect(result).not.toBeNull();
      expect(result.subject).toBe(subject);
      expect(typeof result.paperPath).toBe('string');
      expect(result.paperPath.length).toBeGreaterThan(0);
    });
  }
});
```

Also add the import for `selectPaper` at the top of the test file:

```js
import { generateWeeklySchedule, selectPaper } from '../generateSchedule';
```

- [ ] **Step 2: Run tests**

```bash
cd /media/goog/Projects/pastpapers && npm test -- --reporter=verbose 2>&1 | grep -E "(new subject|PASS|FAIL)"
```

Expected: all 12 new-subject tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/generateSchedule.test.js
git commit -m "test: smoke tests for all new subject scheduler coverage"
```

---

## Track C — Today View

**Goal:** Add a "Today" section at the top of the Dashboard that shows only the papers scheduled for today's day of the week, with the same complete/timer actions as the existing week view.

### Files
- Modify: `src/lib/dateUtils.js` — add `getTodaysPapers` pure function
- Create: `src/lib/__tests__/dateUtils.test.js` — tests for `getTodaysPapers`
- Create: `src/components/TodaySection.jsx` — renders today's papers
- Modify: `src/pages/DashboardPage.jsx` — import and render `TodaySection`

---

### Task C1: Add `getTodaysPapers` to `dateUtils.js`

**Files:**
- Modify: `src/lib/dateUtils.js`

- [ ] **Step 1: Add the function**

Append to `src/lib/dateUtils.js`:

```js
/**
 * Returns papers from a weekly schedule that are scheduled for a given day name.
 * @param {object|null} schedule - weekly schedule object ({ papers: [...] })
 * @param {string} dayName - e.g. 'Monday', 'Tuesday', etc.
 * @returns {Array<{ paper: object, index: number }>}
 */
export function getTodaysPapers(schedule, dayName) {
  if (!schedule?.papers) return [];
  return schedule.papers
    .map((paper, index) => ({ paper, index }))
    .filter(({ paper }) => paper.scheduledDay === dayName);
}

/**
 * Returns today's day name (Monday–Sunday) in the same format used by schedule papers.
 */
export function getTodayDayName() {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return DAYS[new Date().getDay()];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dateUtils.js
git commit -m "feat: add getTodaysPapers and getTodayDayName helpers"
```

---

### Task C2: Tests for `getTodaysPapers`

**Files:**
- Create: `src/lib/__tests__/dateUtils.test.js`

- [ ] **Step 1: Write tests**

```js
import { describe, it, expect } from 'vitest';
import { getTodaysPapers } from '../dateUtils';

const makePaper = (scheduledDay, overrides = {}) => ({
  scheduledDay,
  paperPath: 'ocr-2023-pure',
  subject: 'maths',
  displayName: 'OCR 2023 - Pure',
  completed: false,
  ...overrides,
});

describe('getTodaysPapers', () => {
  it('returns empty array for null schedule', () => {
    expect(getTodaysPapers(null, 'Monday')).toEqual([]);
  });

  it('returns empty array for schedule with no papers', () => {
    expect(getTodaysPapers({ papers: [] }, 'Monday')).toEqual([]);
  });

  it('returns only papers matching the given day', () => {
    const schedule = {
      papers: [
        makePaper('Monday'),
        makePaper('Tuesday'),
        makePaper('Monday'),
        makePaper('Wednesday'),
      ],
    };
    const result = getTodaysPapers(schedule, 'Monday');
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(0);
    expect(result[1].index).toBe(2);
  });

  it('returns correct original index for each paper', () => {
    const schedule = {
      papers: [
        makePaper('Wednesday'),
        makePaper('Monday'),
        makePaper('Monday'),
      ],
    };
    const result = getTodaysPapers(schedule, 'Monday');
    expect(result[0].index).toBe(1);
    expect(result[1].index).toBe(2);
  });

  it('returns empty array when no papers match the day', () => {
    const schedule = {
      papers: [makePaper('Tuesday'), makePaper('Wednesday')],
    };
    expect(getTodaysPapers(schedule, 'Monday')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd /media/goog/Projects/pastpapers && npm test -- --reporter=verbose 2>&1 | grep -E "(dateUtils|PASS|FAIL)"
```

Expected: all 5 dateUtils tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/dateUtils.test.js
git commit -m "test: add unit tests for getTodaysPapers"
```

---

### Task C3: Create `TodaySection` component

**Files:**
- Create: `src/components/TodaySection.jsx`

- [ ] **Step 1: Create the component**

```jsx
import SubjectBadge from './SubjectBadge';
import PmtLinkButton from './PmtLinkButton';
import { getPmtLinks } from '../lib/pmtLinks';

/**
 * TodaySection — shows papers scheduled for today on the dashboard.
 *
 * Props:
 *   todaysPapers   — [{ paper, index }] from getTodaysPapers
 *   subjectMeta    — from useSubjects()
 *   onComplete     — (index) => void  — opens completion modal
 *   onStartTimer   — (paper, index) => void — opens timer modal
 *   dayName        — string e.g. 'Monday'
 */
export default function TodaySection({ todaysPapers, subjectMeta, onComplete, onStartTimer, dayName }) {
  if (!todaysPapers || todaysPapers.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">
          Today — {dayName}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          No papers scheduled for today. Head to the Calendar to add one, or generate a new week.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">
        Today — {dayName}
      </h2>
      <div className="flex flex-col gap-2">
        {todaysPapers.map(({ paper, index }) => {
          const meta = subjectMeta?.[paper.subject];
          const pmtLinks = getPmtLinks(paper.paperPath, paper.subject);

          return (
            <div
              key={index}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 bg-[var(--color-bg)] border-[var(--color-border)] ${paper.completed ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <SubjectBadge subject={paper.subject} meta={meta} />
                <span className="text-sm font-medium text-[var(--color-text)] truncate">
                  {paper.displayName}
                </span>
                {paper.completed && (
                  <span className="text-xs text-[var(--color-success)] font-semibold ml-1">Done</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pmtLinks.qp && <PmtLinkButton href={pmtLinks.qp} label="Q" />}
                {pmtLinks.ms && <PmtLinkButton href={pmtLinks.ms} label="MS" />}
                {!paper.completed && (
                  <>
                    <button
                      onClick={() => onStartTimer(paper, index)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => onComplete(index)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[var(--color-surface)] transition-colors"
                    >
                      Log
                    </button>
                  </>
                )}
                {paper.completed && (
                  <button
                    onClick={() => onComplete(index)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] font-medium hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TodaySection.jsx
git commit -m "feat: add TodaySection component for dashboard"
```

---

### Task C4: Integrate `TodaySection` into `DashboardPage`

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Add imports at top of `DashboardPage.jsx`**

Add to the existing imports block:

```js
import TodaySection from '../components/TodaySection';
import { getTodaysPapers, getTodayDayName } from '../lib/dateUtils';
```

- [ ] **Step 2: Compute `todaysPapers` inside the component**

Inside `DashboardPage`, after the `const weekId = ...` line, add:

```js
const todayDayName = getTodayDayName();
const todaysPapers = getTodaysPapers(schedule, todayDayName);
```

- [ ] **Step 3: Add `TodaySection` to the render output**

Find the section of the JSX that renders the week progress / stat cards. Insert `TodaySection` just above it (look for the first `<div>` after the overdue banner). The exact position: after the overdue dismissal banner and before the stat cards. Insert:

```jsx
<TodaySection
  todaysPapers={todaysPapers}
  subjectMeta={subjectMeta}
  onComplete={(idx) => setCompleting({ idx })}
  onStartTimer={(paper, idx) => setStartingTimer({ paper, index: idx })}
  dayName={todayDayName}
/>
```

Note: The `onComplete` and `onStartTimer` handlers must match the shape the rest of `DashboardPage` uses. Check the existing `handleComplete` call site for the exact `completing` state shape — it uses `completing.idx` or `completing` directly (verify in the file around line 170–200 before implementing).

- [ ] **Step 4: Run dev server and verify**

```bash
cd /media/goog/Projects/pastpapers && npm run dev
```

Open `http://localhost:5173`. The Dashboard should show a "Today — [DayName]" section at the top. If today has papers scheduled, they should appear with Start/Log buttons.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: add Today section to dashboard showing today's scheduled papers"
```

---

## Track D — Quick Log FAB

**Goal:** Add a persistent floating "+" button in the bottom-right corner of every authenticated page. Clicking it opens the existing `CompletionDetailsModal` in `adhoc` mode, so students can quickly log any paper they've done without navigating to a specific page.

### Files
- Create: `src/components/QuickLogFab.jsx` — floating action button + state management
- Modify: `src/components/Layout.jsx` — mount `QuickLogFab` in the existing fixed bottom-right area

---

### Task D1: Create `QuickLogFab`

**Files:**
- Create: `src/components/QuickLogFab.jsx`

`CompletionDetailsModal` in `adhoc` mode already handles paper selection (family tree picker → year → paper) and the full log form. `QuickLogFab` just needs to:
1. Render a floating `+` button
2. On click, open `CompletionDetailsModal` with `mode="adhoc"` and an empty paper object
3. On submit, call `completePaper` from the DB layer

Before writing, verify in `src/components/CompletionDetailsModal.jsx` what props it expects for `adhoc` mode. Look for the `mode === 'adhoc'` branch (around line 50–100). It should accept `mode`, `paper`, `onSubmit`, `onClose`.

- [ ] **Step 1: Create the component**

```jsx
import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { completePaper } from '../firebase/db';
import CompletionDetailsModal from './CompletionDetailsModal';
import Toast from './Toast';
import { TOAST_DURATION_MS } from '../lib/constants';

export default function QuickLogFab() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');

  const handleSubmit = useCallback(async (updates) => {
    if (!currentUser?.uid) return;
    try {
      await completePaper(currentUser.uid, {
        source: 'adhoc',
        subject: updates.subject,
        displayName: updates.displayName,
        paperPath: updates.paperPath || 'adhoc',
        marks: updates.marks ?? null,
        grade: updates.grade ?? null,
        comment: updates.comment ?? null,
        completedAt: new Date().toISOString(),
        actualDurationSeconds: updates.actualDurationSeconds ?? null,
        expectedTime: updates.expectedTime ?? null,
        timeTaken: updates.timeTaken ?? null,
        reviewTopics: updates.reviewTopics ?? [],
      });
      setOpen(false);
      setToast('Paper logged!');
      setTimeout(() => setToast(''), TOAST_DURATION_MS);
    } catch (e) {
      console.error('[QuickLogFab] Failed to log paper:', e);
      setToast('Failed to log paper. Please try again.');
      setTimeout(() => setToast(''), TOAST_DURATION_MS);
    }
  }, [currentUser?.uid]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick log a paper"
        className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center text-2xl font-light"
      >
        +
      </button>
      {open && (
        <CompletionDetailsModal
          mode="adhoc"
          paper={{}}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
        />
      )}
      {toast && <Toast message={toast} />}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuickLogFab.jsx
git commit -m "feat: add QuickLogFab component for floating quick-log button"
```

---

### Task D2: Mount `QuickLogFab` in `Layout.jsx`

**Files:**
- Modify: `src/components/Layout.jsx`

- [ ] **Step 1: Add import**

In `src/components/Layout.jsx`, add:

```js
import QuickLogFab from './QuickLogFab';
```

- [ ] **Step 2: Add to the fixed bottom-right area**

Find the existing `fixed bottom-4 right-4` div (around line 296). It currently contains the `TimerWidget`. Add `QuickLogFab` as a sibling item in that flex container:

```jsx
<div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
  <QuickLogFab />
  {/* TimerWidget renders here if a session is active */}
  ...existing timer widget code...
</div>
```

Place `QuickLogFab` at the bottom of the stack (it appears below the timer widget when a timer is active).

- [ ] **Step 3: Run dev server and verify**

```bash
cd /media/goog/Projects/pastpapers && npm run dev
```

- A circular `+` button should appear in the bottom-right corner on every authenticated page.
- Clicking it should open the completion modal in adhoc mode (subject picker → paper → marks/grade form).
- Submitting should log the paper and show a "Paper logged!" toast.
- The `+` button should not overlap the timer widget when a timer session is active (they stack vertically).

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.jsx
git commit -m "feat: mount QuickLogFab in layout for site-wide quick logging"
```

---

## Final: Run full test suite and build

- [ ] **Run all tests**

```bash
cd /media/goog/Projects/pastpapers && npm test
```

Expected: all tests pass (existing + new).

- [ ] **Run production build**

```bash
cd /media/goog/Projects/pastpapers && npm run build
```

Expected: build completes with no errors. Bundle warnings about chunk size are acceptable.

- [ ] **Final commit if anything was missed**

```bash
git add -A
git status  # verify only expected files
git commit -m "chore: final cleanup after usability overhaul"
```

---

## Self-review checklist

- [x] Track A: pure XP/streak functions extracted and tested
- [x] Track A: silent catches replaced with console.error
- [x] Track B: trees added for all 12 new subjects; paths match builtInFamilies.js pathFns
- [x] Track B: SUBJECT_TREES updated; BUILT_IN_SUBJECT_IDS updated
- [x] Track B: smoke tests confirm selectPaper returns results for each new subject
- [x] Track C: getTodaysPapers is a pure function, fully tested
- [x] Track C: TodaySection handles both empty-day and papers-present cases
- [x] Track C: DashboardPage handlers (onComplete/onStartTimer) verified to match existing shape
- [x] Track D: QuickLogFab delegates to existing CompletionDetailsModal adhoc mode
- [x] Track D: FAB placed in existing fixed bottom-right container, stacks with TimerWidget
