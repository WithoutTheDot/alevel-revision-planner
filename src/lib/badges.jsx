// ─── Badge definitions ───────────────────────────────────────────────────────

export const BADGE_DEFS = [
  {
    id: 'first-paper',
    label: 'First Steps',
    description: 'Complete your first paper',
    xpReward: 50,
    category: 'milestone',
    check: ({ papersCompleted }) => papersCompleted >= 1,
  },
  {
    id: 'papers-10',
    label: 'Getting Serious',
    description: 'Complete 10 papers',
    xpReward: 100,
    category: 'milestone',
    check: ({ papersCompleted }) => papersCompleted >= 10,
  },
  {
    id: 'papers-25',
    label: 'On a Roll',
    description: 'Complete 25 papers',
    xpReward: 200,
    category: 'milestone',
    check: ({ papersCompleted }) => papersCompleted >= 25,
  },
  {
    id: 'papers-50',
    label: 'Dedicated',
    description: 'Complete 50 papers',
    xpReward: 400,
    category: 'milestone',
    check: ({ papersCompleted }) => papersCompleted >= 50,
  },
  {
    id: 'papers-100',
    label: 'Century',
    description: 'Complete 100 papers',
    xpReward: 800,
    category: 'milestone',
    check: ({ papersCompleted }) => papersCompleted >= 100,
  },
  {
    id: 'streak-7',
    label: 'Week Warrior',
    description: '7-day streak achieved',
    xpReward: 150,
    category: 'streak',
    check: ({ longestStreak }) => longestStreak >= 7,
  },
  {
    id: 'streak-30',
    label: 'Month of Mastery',
    description: '30-day streak achieved',
    xpReward: 500,
    category: 'streak',
    check: ({ longestStreak }) => longestStreak >= 30,
  },
  {
    id: 'subject-mastery',
    label: 'Subject Master',
    description: '20+ papers in one subject',
    xpReward: 300,
    category: 'subject',
    check: ({ subjectCounts }) => Object.values(subjectCounts ?? {}).some((n) => n >= 20),
  },
];

// ─── Icons ───────────────────────────────────────────────────────────────────
// Inline SVG components (Heroicons outline style, 20x20)

function DocumentTextIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 9h3.75M6.75 19.5h6.5A2.25 2.25 0 0 0 15.5 17.25V6.108c0-.414-.136-.806-.382-1.118L12.765 2.64A1.5 1.5 0 0 0 11.613 2H6.75A2.25 2.25 0 0 0 4.5 4.25v13a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function FlameIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  );
}

function AcademicCapIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  );
}

export const BADGE_ICONS = {
  'first-paper': DocumentTextIcon,
  'papers-10': DocumentTextIcon,
  'papers-25': DocumentTextIcon,
  'papers-50': DocumentTextIcon,
  'papers-100': DocumentTextIcon,
  'streak-7': FlameIcon,
  'streak-30': FlameIcon,
  'subject-mastery': AcademicCapIcon,
};

// ─── XP helpers ──────────────────────────────────────────────────────────────

export function xpToLevel(xp) {
  return Math.floor((xp ?? 0) / 500) + 1;
}

export function xpProgressInLevel(xp) {
  const total = 500;
  const current = (xp ?? 0) % 500;
  return { current, total, pct: Math.round((current / total) * 100) };
}
