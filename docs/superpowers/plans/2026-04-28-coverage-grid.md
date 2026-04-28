# Coverage Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Grid" tab to the History page that shows a spreadsheet of paper families × years, with cells colour-coded by grade, so users can see at a glance which papers they've completed and when.

**Architecture:** A new `getCoverageData(uid)` Firestore function fetches all completedPapers (lightweight: paperPath + grade + completedAt) into a `Map<paperPath, {grade, completedAt}>` when the grid tab is first activated, cached in HistoryPage state. A new `CoverageGrid` component renders the grid using `BUILT_IN_FAMILIES` (year-ranged families only), grouped by subject, with subject and board filter dropdowns. Pure utility functions for board parsing and grade colouring live in a small `src/lib/coverageUtils.js` so they can be tested independently.

**Tech Stack:** React, Firebase Firestore, Tailwind CSS, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/coverageUtils.js` | Create | `parseBoard(familyId)` and `gradeColor(grade)` pure utilities |
| `src/lib/__tests__/coverageUtils.test.js` | Create | Unit tests for both utils |
| `src/firebase/db/papers.js` | Modify | Add `getCoverageData(uid)` |
| `src/components/CoverageGrid.jsx` | Create | Grid component: filter UI + grouped grid |
| `src/pages/HistoryPage.jsx` | Modify | Add 'grid' tab, coverageData state, fetch on tab switch |

---

### Task 1: Pure utility functions + tests

**Files:**
- Create: `src/lib/coverageUtils.js`
- Create: `src/lib/__tests__/coverageUtils.test.js`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/coverageUtils.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { parseBoard, gradeColor } from '../coverageUtils';

describe('parseBoard', () => {
  it('extracts ocr from maths family id', () => {
    expect(parseBoard('maths-ocr-pure')).toBe('ocr');
  });
  it('extracts aqa from fm family id', () => {
    expect(parseBoard('fm-aqa-core-pure-1')).toBe('aqa');
  });
  it('extracts edexcel from family id', () => {
    expect(parseBoard('maths-edexcel-pure-1')).toBe('edexcel');
  });
  it('returns null for family with no known board', () => {
    expect(parseBoard('maths-madas-mp2')).toBeNull();
  });
});

describe('gradeColor', () => {
  it('returns green classes for A*', () => {
    expect(gradeColor('A*')).toBe('bg-green-500 text-white');
  });
  it('returns green classes for A', () => {
    expect(gradeColor('A')).toBe('bg-green-500 text-white');
  });
  it('returns amber classes for B', () => {
    expect(gradeColor('B')).toBe('bg-amber-400 text-white');
  });
  it('returns amber classes for C', () => {
    expect(gradeColor('C')).toBe('bg-amber-400 text-white');
  });
  it('returns red classes for D', () => {
    expect(gradeColor('D')).toBe('bg-red-500 text-white');
  });
  it('returns red classes for U', () => {
    expect(gradeColor('U')).toBe('bg-red-500 text-white');
  });
  it('returns null for falsy grade', () => {
    expect(gradeColor(null)).toBeNull();
    expect(gradeColor('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/__tests__/coverageUtils.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the utilities**

Create `src/lib/coverageUtils.js`:

```js
const BOARDS = ['ocr', 'aqa', 'edexcel'];

export function parseBoard(familyId) {
  const parts = familyId.split('-');
  return BOARDS.find((b) => parts.includes(b)) ?? null;
}

export function gradeColor(grade) {
  if (!grade) return null;
  if (grade === 'A*' || grade === 'A') return 'bg-green-500 text-white';
  if (grade === 'B' || grade === 'C') return 'bg-amber-400 text-white';
  return 'bg-red-500 text-white';
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/lib/__tests__/coverageUtils.test.js
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coverageUtils.js src/lib/__tests__/coverageUtils.test.js
git commit -m "feat: add parseBoard and gradeColor coverage utilities"
```

---

### Task 2: getCoverageData Firestore function

**Files:**
- Modify: `src/firebase/db/papers.js`

- [ ] **Step 1: Add getCoverageData to papers.js**

Open `src/firebase/db/papers.js`. After the `getAllCompletedPaperPaths` function (around line 90), add:

```js
/**
 * Fetches all completed papers for a user and returns a Map<paperPath, { grade, completedAt }>.
 * If a paperPath was completed multiple times, keeps the most recent entry.
 */
export async function getCoverageData(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'completedPapers'));
  const map = new Map();
  for (const d of snap.docs) {
    const { paperPath, grade, completedAt } = d.data();
    if (!paperPath) continue;
    const existing = map.get(paperPath);
    if (!existing || completedAt > existing.completedAt) {
      map.set(paperPath, { grade: grade ?? null, completedAt: completedAt ?? null });
    }
  }
  return map;
}
```

- [ ] **Step 2: Verify the full test suite still passes**

```bash
npx vitest run
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/firebase/db/papers.js
git commit -m "feat: add getCoverageData for coverage grid"
```

---

### Task 3: CoverageGrid component

**Files:**
- Create: `src/components/CoverageGrid.jsx`

- [ ] **Step 1: Create CoverageGrid.jsx**

```jsx
import { useState, useMemo } from 'react';
import { BUILT_IN_FAMILIES } from '../lib/builtInFamilies';
import { parseBoard, gradeColor } from '../lib/coverageUtils';
import { format, parseISO } from 'date-fns';

const YEAR_FAMILIES = BUILT_IN_FAMILIES.filter(
  (f) => f.yearStart !== null && f.yearEnd !== null
);

function yearRange(start, end) {
  const years = [];
  for (let y = start; y <= end; y++) years.push(y);
  return years;
}

export default function CoverageGrid({ coverageData, subjects }) {
  const enrolledIds = useMemo(() => new Set(subjects.map((s) => s.id)), [subjects]);

  const visibleFamilies = useMemo(
    () => YEAR_FAMILIES.filter((f) => enrolledIds.has(f.subject)),
    [enrolledIds]
  );

  const availableBoards = useMemo(() => {
    const boards = new Set();
    for (const f of visibleFamilies) {
      const b = parseBoard(f.id);
      if (b) boards.add(b);
    }
    return ['all', ...Array.from(boards).sort()];
  }, [visibleFamilies]);

  const [filterSubject, setFilterSubject] = useState('all');
  const [filterBoard, setFilterBoard] = useState('all');

  const filtered = useMemo(() => {
    return visibleFamilies.filter((f) => {
      if (filterSubject !== 'all' && f.subject !== filterSubject) return false;
      if (filterBoard !== 'all' && parseBoard(f.id) !== filterBoard) return false;
      return true;
    });
  }, [visibleFamilies, filterSubject, filterBoard]);

  // Group by subject
  const groups = useMemo(() => {
    const map = new Map();
    for (const f of filtered) {
      if (!map.has(f.subject)) map.set(f.subject, []);
      map.get(f.subject).push(f);
    }
    return map;
  }, [filtered]);

  const subjectLabel = (id) => subjects.find((s) => s.id === id)?.label ?? id;

  if (visibleFamilies.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)] text-sm">
        No paper families found for your subjects.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--color-text-secondary)]">Subject</label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text-primary)]"
          >
            <option value="all">All</option>
            {subjects
              .filter((s) => enrolledIds.has(s.id) && visibleFamilies.some((f) => f.subject === s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--color-text-secondary)]">Board</label>
          <select
            value={filterBoard}
            onChange={(e) => setFilterBoard(e.target.value)}
            className="text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[var(--color-text-primary)]"
          >
            {availableBoards.map((b) => (
              <option key={b} value={b}>{b === 'all' ? 'All boards' : b.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grade key */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
        <span>Key:</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-green-500" /> A* / A</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-amber-400" /> B / C</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded bg-red-500" /> D / E / U</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-4 rounded border border-[var(--color-border)]" /> Not done</span>
      </div>

      {/* Groups */}
      {Array.from(groups.entries()).map(([subjectId, families]) => {
        const minYear = Math.min(...families.map((f) => f.yearStart));
        const maxYear = Math.max(...families.map((f) => f.yearEnd));
        const years = yearRange(minYear, maxYear);

        return (
          <div key={subjectId}>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              {subjectLabel(subjectId)}
            </h3>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left pr-4 pb-1 text-[var(--color-text-muted)] font-medium min-w-[160px]">
                      Family
                    </th>
                    {years.map((y) => (
                      <th key={y} className="px-1 pb-1 text-[var(--color-text-muted)] font-medium w-10 text-center">
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {families.map((fam) => (
                    <tr key={fam.id}>
                      <td className="pr-4 py-0.5 text-[var(--color-text-secondary)] whitespace-nowrap">
                        {fam.name}
                      </td>
                      {years.map((y) => {
                        const inRange = y >= fam.yearStart && y <= fam.yearEnd;
                        if (!inRange) {
                          return <td key={y} className="px-1 py-0.5" />;
                        }
                        const paperPath = fam.pathFn(y);
                        const entry = coverageData?.get(paperPath);
                        const color = entry ? gradeColor(entry.grade) : null;
                        const tooltip = entry?.completedAt
                          ? format(parseISO(entry.completedAt), 'd MMM yyyy')
                          : null;

                        return (
                          <td key={y} className="px-1 py-0.5 text-center">
                            <div
                              title={tooltip ?? undefined}
                              className={
                                'w-8 h-6 rounded flex items-center justify-center font-semibold cursor-default ' +
                                (color
                                  ? color
                                  : 'border border-[var(--color-border)] text-[var(--color-text-muted)]')
                              }
                            >
                              {entry ? (entry.grade ?? '✓') : ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-[var(--color-text-muted)] text-sm">No families match your filters.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no lint/type errors**

```bash
npx vitest run
```

Expected: existing tests still pass, no new failures.

- [ ] **Step 3: Commit**

```bash
git add src/components/CoverageGrid.jsx
git commit -m "feat: add CoverageGrid component"
```

---

### Task 4: Wire CoverageGrid into HistoryPage

**Files:**
- Modify: `src/pages/HistoryPage.jsx`

- [ ] **Step 1: Add imports at the top of HistoryPage.jsx**

After the existing imports, add:

```js
import CoverageGrid from '../components/CoverageGrid';
import { getCoverageData } from '../firebase/db';
```

- [ ] **Step 2: Add coverageData state and fetch logic**

In the component body, after the `const [personalBests, setPersonalBests] = useState({});` line, add:

```js
const [coverageData, setCoverageData] = useState(null);
const [coverageLoading, setCoverageLoading] = useState(false);
```

Then add a handler to fetch coverage when the grid tab is selected. Replace the existing tab toggle buttons area — find this block:

```js
const [view, setView] = useState('table'); // 'table' | 'charts'
```

And change it to:

```js
const [view, setView] = useState('table'); // 'table' | 'charts' | 'grid'
```

Then add a `handleViewChange` function after the `load` callback:

```js
const handleViewChange = useCallback(async (v) => {
  setView(v);
  if (v === 'grid' && coverageData === null) {
    setCoverageLoading(true);
    try {
      const data = await getCoverageData(currentUser.uid);
      setCoverageData(data);
    } finally {
      setCoverageLoading(false);
    }
  }
}, [coverageData, currentUser]);
```

- [ ] **Step 3: Update the tab buttons to include 'grid' and use handleViewChange**

Find this block in the JSX:

```jsx
{['table', 'charts'].map((v) => (
  <button key={v} onClick={() => setView(v)}
    className={'px-4 py-2 text-sm font-medium capitalize transition-colors ' +
      (view === v
        ? 'bg-[var(--color-accent)] text-white'
        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]')}>
    {v}
  </button>
))}
```

Replace with:

```jsx
{['table', 'charts', 'grid'].map((v) => (
  <button key={v} onClick={() => handleViewChange(v)}
    className={'px-4 py-2 text-sm font-medium capitalize transition-colors ' +
      (view === v
        ? 'bg-[var(--color-accent)] text-white'
        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]')}>
    {v}
  </button>
))}
```

- [ ] **Step 4: Add the CoverageGrid render branch**

Find this block:

```jsx
{loading ? (
  <p className="text-[var(--color-text-muted)] text-sm">Loading...</p>
) : view === 'charts' ? (
```

Replace with:

```jsx
{loading ? (
  <p className="text-[var(--color-text-muted)] text-sm">Loading...</p>
) : view === 'grid' ? (
  coverageLoading ? (
    <p className="text-[var(--color-text-muted)] text-sm">Loading coverage...</p>
  ) : (
    <CoverageGrid coverageData={coverageData} subjects={subjects} />
  )
) : view === 'charts' ? (
```

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Start dev server and manually verify the grid**

```bash
npm run dev
```

Check:
1. History page loads, three tabs visible: Table / Charts / Grid
2. Clicking Grid shows "Loading coverage..." then the grid
3. Switching away and back does not re-fetch (cached)
4. Subject and board filters work
5. Completed papers show grade with correct colour
6. Hovering a completed cell shows the date
7. Empty cells are blank with a border

- [ ] **Step 7: Commit**

```bash
git add src/pages/HistoryPage.jsx
git commit -m "feat: wire CoverageGrid into HistoryPage as grid tab"
```
