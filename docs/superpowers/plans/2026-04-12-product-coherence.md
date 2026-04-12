# Product Coherence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat 10-item nav with 4 grouped sections, add Start button to Dashboard upcoming papers, and surface latest badge on Dashboard + embed leaderboard as a tab in ClassesPage.

**Architecture:** Three independent changes delivered in sequence. No new components, no new pages, no Firestore schema changes. Each task is independently deployable.

**Tech Stack:** React 19, Tailwind CSS (CSS vars), Firebase Firestore, React Router DOM 7, date-fns

---

## Task 1: Nav grouping in Layout.jsx

**Files:**
- Modify: `src/components/Layout.jsx`

### Context

`NAV_ITEMS` is a flat array at line 103. `NavLinks` at line 123 maps over it. We replace both with a grouped structure.

- [ ] **Step 1: Replace `NAV_ITEMS` with `NAV_GROUPS`**

In `src/components/Layout.jsx`, delete the `NAV_ITEMS` array (lines 103–114) and replace with:

```js
const NAV_GROUPS = [
  {
    label: 'STUDY',
    items: [
      { to: '/dashboard',  label: 'Dashboard', icon: Icons.Dashboard },
      { to: '/calendar',   label: 'Calendar',  icon: Icons.Calendar  },
    ],
  },
  {
    label: 'PLAN',
    items: [
      { to: '/term-schedule', label: 'Term Schedule', icon: Icons.TermSchedule },
      { to: '/templates',     label: 'Templates',     icon: Icons.Templates    },
      { to: '/generate',      label: 'Generate',      icon: Icons.Generate     },
    ],
  },
  {
    label: 'PROGRESS',
    items: [
      { to: '/history', label: 'History', icon: Icons.History },
      { to: '/review',  label: 'Review',  icon: Icons.Review  },
    ],
  },
  {
    label: 'PROFILE',
    items: [
      { to: '/classes',  label: 'Classes',  icon: Icons.Classes  },
      { to: '/badges',   label: 'Badges',   icon: Icons.Badges   },
      { to: '/settings', label: 'Settings', icon: Icons.Settings },
    ],
  },
];
```

- [ ] **Step 2: Replace `NavLinks` component**

Delete the `NavLinks` function (lines 123–140) and replace with:

```jsx
function NavLinks({ onNav, showAdmin }) {
  return (
    <>
      {NAV_GROUPS.map(({ label, items }) => (
        <div key={label} className="mb-1">
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest text-[var(--color-text-muted)] uppercase select-none">
            {label}
          </p>
          {items.map(({ to, icon, label: itemLabel }) => (
            <NavLink key={to} to={to} onClick={onNav} className={navItemCls}>
              {icon}
              {itemLabel}
            </NavLink>
          ))}
        </div>
      ))}
      {showAdmin && (
        <div className="mb-1">
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest text-[var(--color-text-muted)] uppercase select-none">
            ADMIN
          </p>
          <NavLink to="/admin" onClick={onNav} className={navItemCls}>
            {Icons.Admin}
            Admin
          </NavLink>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify dev server renders grouped nav**

Run `npm run dev`. Open the app. Confirm:
- Four labelled sections visible in sidebar: STUDY, PLAN, PROGRESS, PROFILE
- All 9 original nav links still present
- Active link still gets accent highlight
- Mobile drawer also shows grouped nav

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.jsx
git commit -m "feat: group sidebar nav into Study/Plan/Progress/Profile sections"
```

---

## Task 2: Start button on Dashboard upcoming papers

**Files:**
- Modify: `src/components/UpcomingPapers.jsx`
- Modify: `src/pages/DashboardPage.jsx`

### Context

`UpcomingPapers` (line 3) accepts `{ upcoming, onComplete }`. `DashboardPage` already imports `StartTimerModal` (line 23) and has `startingTimer` / `setStartingTimer` state (line 73). `TimerWidget` already calls `onStartModal={(paper) => setStartingTimer({ paper, index: paper._idx })}`. We add an identical path from `UpcomingPapers`.

- [ ] **Step 1: Add `onStart` prop and Start button to `UpcomingPapers`**

Replace the full content of `src/components/UpcomingPapers.jsx` with:

```jsx
import SubjectBadge from './SubjectBadge';

export default function UpcomingPapers({ upcoming, onComplete, onStart }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm">
      <h2 className="font-semibold text-[var(--color-text-secondary)] mb-3">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">All scheduled papers done.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((p) => (
            <div key={p._idx} className="flex items-center justify-between py-3 px-3 bg-[var(--color-surface)] rounded-xl">
              <div className="flex items-center gap-3">
                <SubjectBadge subject={p.subject} />
                <div>
                  <p className="text-sm text-[var(--color-text-primary)] font-semibold">{p.displayName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{p.scheduledDay} · {p.scheduledStart}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onStart && (
                  <button
                    onClick={() => onStart(p)}
                    className="text-xs bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Start
                  </button>
                )}
                <button
                  onClick={() => onComplete(p)}
                  className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold px-2.5 py-1 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire `onStart` in DashboardPage**

Find the `<UpcomingPapers` render in `src/pages/DashboardPage.jsx`. It currently looks like:

```jsx
<UpcomingPapers
  upcoming={upcoming}
  onComplete={(p) => setCompleting({ paper: p, index: p._idx })}
/>
```

Replace with:

```jsx
<UpcomingPapers
  upcoming={upcoming}
  onComplete={(p) => setCompleting({ paper: p, index: p._idx })}
  onStart={(p) => setStartingTimer({ paper: p, index: p._idx })}
/>
```

- [ ] **Step 3: Verify timer launches from Dashboard**

Run `npm run dev`. On Dashboard with a schedule loaded:
- Each upcoming paper card shows a "Start" button beside "Done"
- Clicking "Start" opens `StartTimerModal` with that paper's details pre-filled
- Completing the timer flow marks the paper as done and shows XP celebration

- [ ] **Step 4: Commit**

```bash
git add src/components/UpcomingPapers.jsx src/pages/DashboardPage.jsx
git commit -m "feat: add Start button to upcoming papers on Dashboard"
```

---

## Task 3: Latest badge on Dashboard

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

### Context

`userPublicStats` doc is already fetched in `load()` at line 96 (as `statsSnap`). It contains a `badgeIds` array (insertion order = chronological). Last element = most recently unlocked badge. `BADGE_DEFS` and `BADGE_ICONS` are exported from `src/lib/badges.jsx`.

- [ ] **Step 1: Import badge definitions**

In `src/pages/DashboardPage.jsx`, find the existing imports and add to the badges import:

```js
import { BADGE_DEFS, BADGE_ICONS } from '../lib/badges';
```

- [ ] **Step 2: Add `badgeIds` state**

After the existing `const [xp, setXp] = useState(0);` line, add:

```js
const [latestBadgeId, setLatestBadgeId] = useState(null);
```

- [ ] **Step 3: Read `badgeIds` from stats snap in `load()`**

Inside the `if (statsSnap.exists())` block in `load()`, after the existing `setLevel(...)` call, add:

```js
const ids = sd.badgeIds ?? [];
setLatestBadgeId(ids.length > 0 ? ids[ids.length - 1] : null);
```

- [ ] **Step 4: Also update after completing a paper**

After the second `if (statsSnap.exists())` block inside `handleComplete` (the one that calls `setXp` and `setLevel`), add the same line:

```js
const ids = sd.badgeIds ?? [];
setLatestBadgeId(ids.length > 0 ? ids[ids.length - 1] : null);
```

- [ ] **Step 5: Derive badge object and render latest badge card**

Compute the badge object just above the `return (` statement:

```js
const latestBadge = latestBadgeId ? BADGE_DEFS.find((b) => b.id === latestBadgeId) ?? null : null;
const LatestBadgeIcon = latestBadge ? BADGE_ICONS[latestBadge.id] : null;
```

Then find the stat cards grid in the JSX (the `<div className={`grid gap-3 ...`}>` block). After the closing `</div>` of the stat cards grid, add the latest badge card:

```jsx
{latestBadge && LatestBadgeIcon && (
  <Link
    to="/badges"
    className="flex items-center gap-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 hover:bg-[var(--color-surface)] transition-colors"
  >
    <div className="w-9 h-9 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center flex-shrink-0 text-[var(--color-accent)]">
      <LatestBadgeIcon />
    </div>
    <div>
      <p className="text-xs text-[var(--color-text-muted)]">Latest badge</p>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{latestBadge.label}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{latestBadge.description}</p>
    </div>
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-[var(--color-text-muted)] ml-auto flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  </Link>
)}
```

`Link` is already imported from `react-router-dom` in DashboardPage.

- [ ] **Step 6: Verify latest badge renders**

Run `npm run dev`. On Dashboard for a user who has earned at least one badge, confirm:
- A card appears below the stat grid showing the badge icon, name, and description
- Card is a link — clicking it navigates to `/badges`
- User with no badges: card is not rendered

- [ ] **Step 7: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: show latest earned badge on Dashboard"
```

---

## Task 4: Leaderboard tab in ClassesPage

**Files:**
- Modify: `src/pages/ClassesPage.jsx`

### Context

`ClassesPage` currently shows a list of the user's classes. Each class card has a "Leaderboard" button linking to `/classes/${cls.id}`. We add a tab bar: **My Classes** (existing content) | **Leaderboard** (inline leaderboard for a selected class). The "Leaderboard" button on each card stays — it links to the full detail page. The tab provides quick access without leaving the page.

`getClassLeaderboard(classId)` returns `{ entries: [...], subject }`. `entries` each have: `uid`, `displayName`, `papersCompleted`, `xp`, `level`, `badgeIds`. Import `sendNudge` from `../firebase/db` for nudging — already used in `LeaderboardPage`. Import `BADGE_DEFS`, `BADGE_ICONS`, `xpToLevel` from `../lib/badges`. Import `ALL_SUBJECTS` from `../lib/allSubjects` — already imported.

- [ ] **Step 1: Add tab state and leaderboard state to ClassesPage**

At the top of the `ClassesPage` function body, after the existing state declarations, add:

```js
const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'leaderboard'
const [lbClassId, setLbClassId] = useState(null);       // which class to show leaderboard for
const [lbEntries, setLbEntries] = useState([]);
const [lbSubject, setLbSubject] = useState(null);
const [lbLoading, setLbLoading] = useState(false);
const [lbError, setLbError] = useState('');
const [lbSortBy, setLbSortBy] = useState('papers');    // 'papers' | 'xp'
```

- [ ] **Step 2: Add leaderboard fetch function**

After the `handleLeave` function, add:

```js
const loadLeaderboard = useCallback(async (classId) => {
  setLbLoading(true);
  setLbError('');
  try {
    const { entries, subject } = await getClassLeaderboard(classId);
    setLbEntries(entries);
    setLbSubject(subject);
  } catch (e) {
    setLbError('Failed to load leaderboard: ' + e.message);
  } finally {
    setLbLoading(false);
  }
}, []);
```

- [ ] **Step 3: Update imports in ClassesPage**

Add these imports at the top of `src/pages/ClassesPage.jsx`:

```js
import { useCallback } from 'react'; // add to existing useState/useEffect/useCallback import
import { getClassLeaderboard, sendNudge } from '../firebase/db'; // add getClassLeaderboard, sendNudge
import { BADGE_DEFS, BADGE_ICONS, xpToLevel } from '../lib/badges';
```

- [ ] **Step 4: Add leaderboard load effect**

After the existing `useEffect(() => { load(); }, [load]);` line, add:

```js
useEffect(() => {
  if (activeTab !== 'leaderboard') return;
  const targetId = lbClassId ?? classes[0]?.id;
  if (!targetId) return;
  if (!lbClassId) setLbClassId(targetId);
  loadLeaderboard(targetId);
}, [activeTab, lbClassId, classes, loadLeaderboard]);
```

- [ ] **Step 5: Add NudgeButton component inside ClassesPage file**

Before the `export default function ClassesPage()` declaration, add:

```jsx
function NudgeButton({ toUid, fromDisplayName }) {
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  async function handleNudge() {
    if (cooldown) return;
    try {
      await sendNudge(toUid, fromDisplayName);
      setSent(true);
      setCooldown(true);
      setTimeout(() => { setSent(false); setCooldown(false); }, 30000);
    } catch {}
  }

  return (
    <button
      onClick={handleNudge}
      disabled={cooldown}
      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
        sent
          ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
      } disabled:opacity-50`}
    >
      {sent ? 'Sent' : 'Nudge'}
    </button>
  );
}
```

- [ ] **Step 6: Replace the return JSX in ClassesPage**

Replace everything inside the `return (` statement with the following. (Keep all the existing modal JSX for Create and Join — only the page header and main content area changes.)

```jsx
return (
  <div className="max-w-2xl mx-auto">
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)]">Classes</h1>
      <div className="flex gap-2">
        <button
          onClick={() => { setShowJoin(true); setError(''); }}
          className="px-4 py-2 rounded-xl border text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
        >
          Join Class
        </button>
        <button
          onClick={() => { setShowCreate(true); setCreatedCode(null); setNewClassName(''); setNewClassSubject('maths'); setError(''); }}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm"
        >
          Create Class
        </button>
      </div>
    </div>

    {/* Tab bar */}
    <div className="flex gap-1 mb-5 border-b border-[var(--color-border)]">
      {[
        { id: 'classes', label: 'My Classes' },
        { id: 'leaderboard', label: 'Leaderboard' },
      ].map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === id
              ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    {error && <div className="mb-4 p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded text-sm">{error}</div>}

    {/* My Classes tab */}
    {activeTab === 'classes' && (
      loading ? (
        <p className="text-[var(--color-text-muted)] text-sm">Loading…</p>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <p className="text-lg font-medium mb-1">No classes yet</p>
          <p className="text-sm">Create a class or join one with a 6-character code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex">
              <div className="w-1.5 bg-gradient-to-b from-indigo-400 to-violet-500 flex-shrink-0" />
              <div className="flex items-start justify-between gap-3 p-5 flex-1">
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">{cls.name}</h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    {cls.members?.length ?? 0} member{cls.members?.length !== 1 ? 's' : ''}
                    {cls.subject && (
                      <> · <span className="text-indigo-600 font-medium">{ALL_SUBJECTS.find((s) => s.id === cls.subject)?.label ?? cls.subject}</span></>
                    )}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-[var(--color-text-muted)] mr-1">Code:</span>
                    <span className="font-mono text-sm font-bold tracking-widest text-indigo-700">{cls.code}</span>
                    <CopyButton text={cls.code} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={() => { setActiveTab('leaderboard'); setLbClassId(cls.id); }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100"
                  >
                    Leaderboard
                  </button>
                  <button
                    onClick={() => handleLeave(cls.id)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium"
                  >
                    Leave
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    )}

    {/* Leaderboard tab */}
    {activeTab === 'leaderboard' && (
      <div>
        {classes.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            <p className="text-lg font-medium mb-1">No classes yet</p>
            <p className="text-sm">Join or create a class to see its leaderboard.</p>
          </div>
        ) : (
          <>
            {/* Class selector (shown when user is in more than one class) */}
            {classes.length > 1 && (
              <div className="mb-4 flex items-center gap-2">
                <label className="text-sm text-[var(--color-text-secondary)]">Class:</label>
                <select
                  value={lbClassId ?? classes[0]?.id}
                  onChange={(e) => { setLbClassId(e.target.value); loadLeaderboard(e.target.value); }}
                  className="text-sm border border-[var(--color-border)] rounded-lg px-2 py-1 bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort controls */}
            {!lbLoading && lbEntries.length > 0 && (
              <div className="flex gap-2 mb-4">
                {['papers', 'xp'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setLbSortBy(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      lbSortBy === s
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {s === 'papers' ? 'Papers' : 'XP'}
                  </button>
                ))}
                {lbSubject && (
                  <span className="ml-auto text-xs text-[var(--color-text-muted)] self-center">
                    {ALL_SUBJECTS.find((s) => s.id === lbSubject)?.label ?? lbSubject}
                  </span>
                )}
              </div>
            )}

            {lbError && <div className="mb-3 p-2 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded text-sm">{lbError}</div>}

            {lbLoading ? (
              <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
            ) : (
              <div className="space-y-2">
                {[...lbEntries]
                  .sort((a, b) =>
                    lbSortBy === 'xp'
                      ? (b.xp ?? 0) - (a.xp ?? 0) || (b.papersCompleted ?? 0) - (a.papersCompleted ?? 0)
                      : (b.papersCompleted ?? 0) - (a.papersCompleted ?? 0)
                  )
                  .map((entry, i) => {
                    const isMe = entry.uid === currentUser.uid;
                    const badgeIds = (entry.badgeIds ?? []).slice(-3);
                    return (
                      <div
                        key={entry.uid}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          isMe
                            ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent-subtle)]/20'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                        }`}
                      >
                        <span className={`w-6 text-sm font-bold text-center flex-shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-[var(--color-text-muted)]'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {entry.displayName ?? 'Unknown'} {isMe && <span className="text-xs font-normal text-[var(--color-accent)]">(you)</span>}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {entry.papersCompleted ?? 0} papers · Lv.{xpToLevel(entry.xp ?? 0)} · {entry.xp ?? 0} XP
                          </p>
                          {badgeIds.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {badgeIds.map((bid) => {
                                const Icon = BADGE_ICONS[bid];
                                return Icon ? (
                                  <span key={bid} className="text-[var(--color-accent)] w-4 h-4" title={BADGE_DEFS.find((b) => b.id === bid)?.label}>
                                    <Icon />
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                        {!isMe && (
                          <NudgeButton toUid={entry.uid} fromDisplayName={displayName} />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>
    )}

    {/* Create modal — unchanged */}
    {showCreate && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Create a Class</h2>
          {createdCode ? (
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">Class created! Share this code with classmates:</p>
              <div className="flex items-center justify-center gap-2 py-4">
                <span className="font-mono text-3xl font-bold tracking-widest text-indigo-700">{createdCode}</span>
                <CopyButton text={createdCode} />
              </div>
              <button
                onClick={() => { setShowCreate(false); setCreatedCode(null); }}
                className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Class Name</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
                placeholder="e.g. 6th Form Study Group"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Subject</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
                value={newClassSubject}
                onChange={(e) => setNewClassSubject(e.target.value)}
              >
                {ALL_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg border text-sm hover:bg-[var(--color-surface)]">Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newClassName.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Join modal — unchanged */}
    {showJoin && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">Join a Class</h2>
          {error && <div className="mb-3 p-2 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded text-sm">{error}</div>}
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">6-Character Code</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            placeholder="XXXXXX"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowJoin(false); setJoinCode(''); setError(''); }} className="px-4 py-2 rounded-lg border text-sm hover:bg-[var(--color-surface)]">Cancel</button>
            <button
              onClick={handleJoin}
              disabled={joining || joinCode.length !== 6}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
```

- [ ] **Step 7: Verify leaderboard tab**

Run `npm run dev`. On the Classes page:
- Tab bar "My Classes" | "Leaderboard" is visible
- "My Classes" tab shows existing class cards
- Clicking "Leaderboard" button on a class card switches to Leaderboard tab and loads that class's leaderboard
- "Leaderboard" tab shows sorted entries with nudge buttons
- Class selector dropdown appears if user is in more than one class

- [ ] **Step 8: Commit**

```bash
git add src/pages/ClassesPage.jsx
git commit -m "feat: embed leaderboard as tab in ClassesPage"
```

---

## Self-review

**Spec coverage:**
- Nav grouping → Task 1 ✓
- Dashboard core loop (Start from upcoming papers) → Task 2 ✓
- Gamification: latest badge on Dashboard → Task 3 ✓
- Gamification: leaderboard in Classes → Task 4 ✓
- LeaderboardPage route preserved → no changes to LeaderboardPage ✓
- No new components → all tasks use existing components ✓

**Type consistency:**
- `onStart(p)` in UpcomingPapers → `setStartingTimer({ paper: p, index: p._idx })` in DashboardPage — matches existing `TimerWidget` call signature ✓
- `BADGE_ICONS[bid]` used as `<Icon />` — matches pattern in BadgesPage ✓
- `getClassLeaderboard(classId)` returns `{ entries, subject }` — confirmed from LeaderboardPage:74 ✓
- `xpToLevel(entry.xp)` — imported from badges.jsx, same as LeaderboardPage ✓
