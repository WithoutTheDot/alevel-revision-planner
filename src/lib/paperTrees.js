/**
 * Decision trees for paper selection.
 * Node shape: { options: [{ label, value, terminal?, weight?, next? }] }
 * terminal: true  → this choice IS the paper (no further branching)
 * weight:          → relative probability (default 1)
 */

function yearOptions(from, to, next) {
  const opts = [];
  for (let y = from; y <= to; y++) {
    opts.push({ label: String(y), value: String(y), next });
  }
  return opts;
}

// ─── Maths ──────────────────────────────────────────────────────────────────

const mathsOcrPaperNode = {
  options: [
    { label: 'Pure', value: 'pure', terminal: true },
    { label: 'Statistics', value: 'statistics', terminal: true },
    { label: 'Mechanics', value: 'mechanics', terminal: true },
  ],
};

const mathsOcrYearNode = { options: yearOptions(2018, 2024, mathsOcrPaperNode) };

// Maths Foreign AQA: same paper structure as OCR (Pure/Stats/Mechanics)
const mathsAqaPaperNode = {
  options: [
    { label: 'Pure', value: 'pure', terminal: true },
    { label: 'Statistics', value: 'statistics', terminal: true },
    { label: 'Mechanics', value: 'mechanics', terminal: true },
  ],
};

// Maths Foreign Edexcel papers per plan
const mathsEdexcelPaperNode = {
  options: [
    { label: 'Pure 1', value: 'pure-1', terminal: true },
    { label: 'Pure 2', value: 'pure-2', terminal: true },
    { label: 'Stats and Mechanics', value: 'stats-and-mechanics', terminal: true },
  ],
};

// Maths Foreign years: 2018-2024 per plan
const mathsAqaYearNode     = { options: yearOptions(2018, 2024, mathsAqaPaperNode) };
const mathsEdexcelYearNode = { options: yearOptions(2018, 2024, mathsEdexcelPaperNode) };

const mathsForeignBoardNode = {
  options: [
    { label: 'AQA', value: 'aqa', next: mathsAqaYearNode },
    { label: 'Edexcel', value: 'edexcel', next: mathsEdexcelYearNode },
  ],
};

const mathsMadasNode = {
  options: [
    { label: 'MP2', value: 'mp2', terminal: true },
    { label: 'SYN', value: 'syn', terminal: true },
  ],
};

export const maths = {
  options: [
    { label: 'MADAS', value: 'madas', next: mathsMadasNode },
    { label: 'OCR', value: 'ocr', next: mathsOcrYearNode },
    { label: 'Knowledge Organiser', value: 'knowledge-organiser', terminal: true },
    { label: 'Foreign Board', value: 'foreign', next: mathsForeignBoardNode },
  ],
};

// ─── Further Maths ───────────────────────────────────────────────────────────

// FM OCR papers per plan: Pure Core 1, Pure Core 2, Mechanics, Additional Pure
const fmOcrPaperNode = {
  options: [
    { label: 'Pure Core 1', value: 'pure-core-1', terminal: true },
    { label: 'Pure Core 2', value: 'pure-core-2', terminal: true },
    { label: 'Mechanics', value: 'mechanics', terminal: true },
    { label: 'Statistics', value: 'statistics', terminal: true },
    { label: 'Discrete', value: 'discrete', terminal: true },
    { label: 'Additional Pure', value: 'additional-pure', terminal: true },
  ],
};

const fmOcrYearNode = { options: yearOptions(2019, 2024, fmOcrPaperNode) };

// FM Foreign AQA papers per plan: Core Pure 1, Core Pure 2, and Paper-3 optional
const fmAqaPaperNode = {
  options: [
    { label: 'Core Pure 1', value: 'core-pure-1', terminal: true },
    { label: 'Core Pure 2', value: 'core-pure-2', terminal: true },
    { label: 'Mechanics', value: 'mechanics', terminal: true },
    { label: 'Statistics', value: 'statistics', terminal: true },
    { label: 'Discrete', value: 'discrete', terminal: true },
  ],
};

// FM Foreign Edexcel papers per plan: compulsory + all optional modules
const fmEdexcelPaperNode = {
  options: [
    { label: 'Core Pure 1', value: 'core-pure-1', terminal: true },
    { label: 'Core Pure 2', value: 'core-pure-2', terminal: true },
    { label: 'Further Pure 1', value: 'further-pure-1', terminal: true },
    { label: 'Further Pure 2', value: 'further-pure-2', terminal: true },
    { label: 'Further Mechanics 1', value: 'further-mechanics-1', terminal: true },
    { label: 'Further Mechanics 2', value: 'further-mechanics-2', terminal: true },
    { label: 'Further Statistics 1', value: 'statistics-1', terminal: true },
    { label: 'Further Statistics 2', value: 'statistics-2', terminal: true },
    { label: 'Decision 1', value: 'decision-1', terminal: true },
    { label: 'Decision 2', value: 'decision-2', terminal: true },
  ],
};

// FM Foreign years: 2019-2024 per plan
const fmAqaYearNode     = { options: yearOptions(2019, 2024, fmAqaPaperNode) };
const fmEdexcelYearNode = { options: yearOptions(2019, 2024, fmEdexcelPaperNode) };

const fmForeignBoardNode = {
  options: [
    { label: 'AQA', value: 'aqa', next: fmAqaYearNode },
    { label: 'Edexcel', value: 'edexcel', next: fmEdexcelYearNode },
  ],
};

export const furtherMaths = {
  options: [
    { label: 'OCR', value: 'ocr', next: fmOcrYearNode },
    { label: 'Foreign Board', value: 'foreign', next: fmForeignBoardNode },
    // maxPerWeek: 2 is enforced in the generator, not the tree
    { label: 'Textbook', value: 'textbook', terminal: true, maxPerWeek: 2 },
  ],
};

// ─── Physics ─────────────────────────────────────────────────────────────────

// Physics OCR papers per plan: Modelling Physics, Exploring Physics, Unified Physics
const physicsOcrPaperNode = {
  options: [
    { label: 'Modelling Physics', value: 'modelling-physics', terminal: true },
    { label: 'Exploring Physics', value: 'exploring-physics', terminal: true },
    { label: 'Unified Physics', value: 'unified-physics', terminal: true },
  ],
};

const physicsOcrYearNode = { options: yearOptions(2017, 2024, physicsOcrPaperNode) };

// Physics AQA: Paper 3B weight = 1/4 total, split across 3 variants → each 1/12
// Paper 1 + Paper 2 + Paper 3A = 3×weight(1), Paper 3Bx = 3×weight(1/12) = 1/4 of total
const physicsAqaPaperNode = {
  options: [
    { label: 'Paper 1',   value: 'paper1',   terminal: true, weight: 1 },
    { label: 'Paper 2',   value: 'paper2',   terminal: true, weight: 1 },
    { label: 'Paper 3A',  value: 'paper3a',  terminal: true, weight: 1 },
    { label: 'Paper 3BA', value: 'paper3ba', terminal: true, weight: 1 / 12 },
    { label: 'Paper 3BB', value: 'paper3bb', terminal: true, weight: 1 / 12 },
    { label: 'Paper 3BC', value: 'paper3bc', terminal: true, weight: 1 / 12 },
  ],
};

const physicsAqaYearNode = { options: yearOptions(2017, 2024, physicsAqaPaperNode) };

export const physics = {
  options: [
    { label: 'Independent Study Booklet', value: 'isb', terminal: true },
    { label: 'OCR', value: 'ocr', next: physicsOcrYearNode },
    { label: 'AQA', value: 'aqa', next: physicsAqaYearNode },
  ],
};

// ─── Computer Science ────────────────────────────────────────────────────────
// Per plan: choose paper first, then year

const csPaper1YearNode = { options: yearOptions(2017, 2024, null) };
const csPaper2YearNode = { options: yearOptions(2017, 2024, null) };

// Mark each year as terminal
csPaper1YearNode.options = csPaper1YearNode.options.map((o) => ({ ...o, terminal: true, paperLabel: 'Paper 1' }));
csPaper2YearNode.options = csPaper2YearNode.options.map((o) => ({ ...o, terminal: true, paperLabel: 'Paper 2' }));

export const computerScience = {
  options: [
    { label: 'AQA Paper 1', value: 'paper1', next: csPaper1YearNode },
    { label: 'AQA Paper 2', value: 'paper2', next: csPaper2YearNode },
  ],
};

// ─── Export all ─────────────────────────────────────────────────────────────

export const SUBJECT_TREES = { maths, furtherMaths, physics, computerScience };

// ─── Subject metadata (colours etc.) ────────────────────────────────────────

export const SUBJECT_META = {
  maths:          { label: 'Maths',          color: 'bg-blue-500',   text: 'text-blue-700',   light: 'bg-blue-100' },
  furtherMaths:   { label: 'Further Maths',  color: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-100' },
  physics:        { label: 'Physics',         color: 'bg-[var(--color-danger-bg)]0',    text: 'text-[var(--color-danger-text)]',    light: 'bg-[var(--color-danger-bg)]' },
  computerScience:{ label: 'Computer Science',color: 'bg-green-500',  text: 'text-green-700',  light: 'bg-green-100' },
};
