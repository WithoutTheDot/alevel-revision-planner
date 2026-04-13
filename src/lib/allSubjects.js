/**
 * Common A-Level subjects and colour palette for dynamic subject system.
 */

export const ALL_SUBJECTS = [
  { id: 'maths',           label: 'Mathematics',          builtIn: true },
  { id: 'furtherMaths',    label: 'Further Mathematics',  builtIn: true },
  { id: 'physics',         label: 'Physics',              builtIn: true },
  { id: 'computerScience', label: 'Computer Science',     builtIn: true },
  { id: 'chemistry',       label: 'Chemistry' },
  { id: 'biology',         label: 'Biology' },
  { id: 'economics',       label: 'Economics' },
  { id: 'history',         label: 'History' },
  { id: 'geography',       label: 'Geography' },
  { id: 'english',         label: 'English Literature' },
  { id: 'englishLang',     label: 'English Language' },
  { id: 'psychology',      label: 'Psychology' },
  { id: 'sociology',       label: 'Sociology' },
  { id: 'business',        label: 'Business Studies' },
  { id: 'law',             label: 'Law' },
  { id: 'politics',        label: 'Politics' },
  { id: 'philosophy',      label: 'Philosophy' },
  { id: 'french',          label: 'French' },
  { id: 'german',          label: 'German' },
  { id: 'spanish',         label: 'Spanish' },
  { id: 'latin',           label: 'Latin' },
  { id: 'art',             label: 'Art & Design' },
  { id: 'music',           label: 'Music' },
  { id: 'drama',           label: 'Drama & Theatre' },
  { id: 'dandt',           label: 'Design & Technology' },
  { id: 'pe',              label: 'Physical Education' },
  { id: 'religious',       label: 'Religious Studies' },
  { id: 'media',           label: 'Media Studies' },
  { id: 'film',            label: 'Film Studies' },
  { id: 'accounting',      label: 'Accounting' },
];

export const BUILT_IN_SUBJECT_IDS = new Set(['maths', 'furtherMaths', 'physics', 'computerScience']);

/**
 * Further Maths optional modules. Each entry applies to one or more exam boards.
 * 'value' matches the terminal node value in paperTrees.js.
 */
export const FM_OPTIONAL_MODULES = [
  { value: 'mechanics',           label: 'Mechanics',             boards: ['ocr', 'aqa'] },
  { value: 'statistics',          label: 'Statistics',            boards: ['ocr', 'aqa'] },
  { value: 'discrete',            label: 'Discrete Mathematics',  boards: ['ocr', 'aqa'] },
  { value: 'additional-pure',     label: 'Additional Pure',       boards: ['ocr'] },
  { value: 'further-pure-1',      label: 'Further Pure 1',        boards: ['edexcel'] },
  { value: 'further-pure-2',      label: 'Further Pure 2',        boards: ['edexcel'] },
  { value: 'further-mechanics-1', label: 'Further Mechanics 1',   boards: ['edexcel'] },
  { value: 'further-mechanics-2', label: 'Further Mechanics 2',   boards: ['edexcel'] },
  { value: 'statistics-1',        label: 'Further Statistics 1',  boards: ['edexcel'] },
  { value: 'statistics-2',        label: 'Further Statistics 2',  boards: ['edexcel'] },
  { value: 'decision-1',          label: 'Decision 1',            boards: ['edexcel'] },
  { value: 'decision-2',          label: 'Decision 2',            boards: ['edexcel'] },
];

export const FM_ALL_OPTIONAL_VALUES = new Set(FM_OPTIONAL_MODULES.map((m) => m.value));

/**
 * 12-colour palette. Built-in subjects use indices 0–3.
 * Each entry: { color: Tailwind bg class, text: Tailwind text class, light: Tailwind bg light class }
 */
export const COLOR_PALETTE = [
  { color: 'bg-blue-500',    text: 'text-blue-700',    light: 'bg-blue-100' },    // 0 — maths
  { color: 'bg-indigo-500',  text: 'text-indigo-700',  light: 'bg-indigo-100' },  // 1 — furtherMaths
  { color: 'bg-red-500',     text: 'text-red-700',     light: 'bg-red-100' },     // 2 — physics
  { color: 'bg-green-500',   text: 'text-green-700',   light: 'bg-green-100' },   // 3 — computerScience
  { color: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-100' },   // 4
  { color: 'bg-teal-500',    text: 'text-teal-700',    light: 'bg-teal-100' },    // 5
  { color: 'bg-pink-500',    text: 'text-pink-700',    light: 'bg-pink-100' },    // 6
  { color: 'bg-violet-500',  text: 'text-violet-700',  light: 'bg-violet-100' },  // 7
  { color: 'bg-orange-500',  text: 'text-orange-700',  light: 'bg-orange-100' },  // 8
  { color: 'bg-cyan-500',    text: 'text-cyan-700',    light: 'bg-cyan-100' },    // 9
  { color: 'bg-lime-500',    text: 'text-lime-700',    light: 'bg-lime-100' },    // 10
  { color: 'bg-rose-500',    text: 'text-rose-700',    light: 'bg-rose-100' },    // 11
];

/**
 * Returns the lowest-index palette colour not already used by existingSubjects.
 * existingSubjects: array of { color } (Tailwind bg class strings).
 */
export function getNextColor(existingSubjects) {
  const used = new Set(existingSubjects.map((s) => s.color));
  for (const entry of COLOR_PALETTE) {
    if (!used.has(entry.color)) return entry;
  }
  // Wrap around if all 12 are taken
  return COLOR_PALETTE[existingSubjects.length % COLOR_PALETTE.length];
}

/**
 * The 4 default subjects seeded for new accounts.
 */
export const DEFAULT_SUBJECTS = [
  { id: 'maths',           label: 'Mathematics',         ...COLOR_PALETTE[0] },
  { id: 'furtherMaths',    label: 'Further Mathematics', ...COLOR_PALETTE[1] },
  { id: 'physics',         label: 'Physics',             ...COLOR_PALETTE[2] },
  { id: 'computerScience', label: 'Computer Science',    ...COLOR_PALETTE[3] },
];
