/**
 * Built-in paper families.
 *
 * pathFn(year) → paperPath string for that year.
 * For single papers (no year range), yearStart/yearEnd are null and pathFn is called with null.
 * paperPaths is pre-computed from the defaults; use recomputePaths(fam, ys, ye) after an override.
 */

function yearRange(start, end) {
  const out = [];
  for (let y = start; y <= end; y++) out.push(y);
  return out;
}

function makeFam(id, name, subject, yearStart, yearEnd, pathFn) {
  const paperPaths = (yearStart !== null && yearEnd !== null)
    ? yearRange(yearStart, yearEnd).map(pathFn)
    : [pathFn(null)];
  return { id, name, subject, yearStart, yearEnd, pathFn, paperPaths };
}

/** Recompute paperPaths for a built-in family using a (possibly overridden) year range. */
export function recomputePaths(fam, yearStart, yearEnd) {
  if (yearStart === null || yearEnd === null) return fam.paperPaths;
  return yearRange(yearStart, yearEnd).map(fam.pathFn);
}

export const BUILT_IN_FAMILIES = [
  // ── Maths ──────────────────────────────────────────────────────────────────
  makeFam('maths-madas-mp2',              'MADAS MP2',                   'maths',         null, null, ()  => 'madas-mp2'),
  makeFam('maths-madas-syn',              'MADAS SYN',                   'maths',         null, null, ()  => 'madas-syn'),
  makeFam('maths-knowledge-organiser',    'Knowledge Organiser',         'maths',         null, null, ()  => 'knowledge-organiser'),
  makeFam('maths-ocr-pure',               'OCR Pure',                    'maths',         2018, 2024, (y) => `ocr-${y}-pure`),
  makeFam('maths-ocr-statistics',         'OCR Statistics',              'maths',         2018, 2024, (y) => `ocr-${y}-statistics`),
  makeFam('maths-ocr-mechanics',          'OCR Mechanics',               'maths',         2018, 2024, (y) => `ocr-${y}-mechanics`),
  makeFam('maths-aqa-pure',               'AQA Pure',                    'maths',         2018, 2024, (y) => `foreign-aqa-${y}-pure`),
  makeFam('maths-aqa-statistics',         'AQA Statistics',              'maths',         2018, 2024, (y) => `foreign-aqa-${y}-statistics`),
  makeFam('maths-aqa-mechanics',          'AQA Mechanics',               'maths',         2018, 2024, (y) => `foreign-aqa-${y}-mechanics`),
  makeFam('maths-edexcel-pure-1',         'Edexcel Pure 1',              'maths',         2018, 2024, (y) => `foreign-edexcel-${y}-pure-1`),
  makeFam('maths-edexcel-pure-2',         'Edexcel Pure 2',              'maths',         2018, 2024, (y) => `foreign-edexcel-${y}-pure-2`),
  makeFam('maths-edexcel-stats-mech',     'Edexcel Stats & Mechanics',   'maths',         2018, 2024, (y) => `foreign-edexcel-${y}-stats-and-mechanics`),

  // ── Further Maths ──────────────────────────────────────────────────────────
  makeFam('fm-ocr-pure-core-1',           'OCR Pure Core 1',             'furtherMaths',  2019, 2024, (y) => `ocr-${y}-pure-core-1`),
  makeFam('fm-ocr-pure-core-2',           'OCR Pure Core 2',             'furtherMaths',  2019, 2024, (y) => `ocr-${y}-pure-core-2`),
  makeFam('fm-ocr-mechanics',             'OCR Mechanics',               'furtherMaths',  2019, 2024, (y) => `ocr-${y}-mechanics`),
  makeFam('fm-ocr-additional-pure',       'OCR Additional Pure',         'furtherMaths',  2019, 2024, (y) => `ocr-${y}-additional-pure`),
  makeFam('fm-aqa-core-pure-1',           'AQA Core Pure 1',             'furtherMaths',  2019, 2024, (y) => `foreign-aqa-${y}-core-pure-1`),
  makeFam('fm-aqa-core-pure-2',           'AQA Core Pure 2',             'furtherMaths',  2019, 2024, (y) => `foreign-aqa-${y}-core-pure-2`),
  makeFam('fm-aqa-mechanics',             'AQA Mechanics',               'furtherMaths',  2019, 2024, (y) => `foreign-aqa-${y}-mechanics`),
  makeFam('fm-edexcel-core-pure-1',       'Edexcel Core Pure 1',         'furtherMaths',  2019, 2024, (y) => `foreign-edexcel-${y}-core-pure-1`),
  makeFam('fm-edexcel-core-pure-2',       'Edexcel Core Pure 2',         'furtherMaths',  2019, 2024, (y) => `foreign-edexcel-${y}-core-pure-2`),
  makeFam('fm-edexcel-further-pure-1',    'Edexcel Further Pure 1',      'furtherMaths',  2019, 2024, (y) => `foreign-edexcel-${y}-further-pure-1`),
  makeFam('fm-edexcel-further-pure-2',    'Edexcel Further Pure 2',      'furtherMaths',  2019, 2024, (y) => `foreign-edexcel-${y}-further-pure-2`),
  makeFam('fm-edexcel-further-mech-1',    'Edexcel Further Mechanics 1', 'furtherMaths',  2019, 2024, (y) => `foreign-edexcel-${y}-further-mechanics-1`),
  makeFam('fm-edexcel-further-mech-2',    'Edexcel Further Mechanics 2', 'furtherMaths',  2019, 2024, (y) => `foreign-edexcel-${y}-further-mechanics-2`),
  makeFam('fm-textbook',                  'Textbook',                    'furtherMaths',  null, null, ()  => 'textbook'),

  // ── Physics ────────────────────────────────────────────────────────────────
  makeFam('physics-isb',                  'Independent Study Booklet',   'physics',       null, null, ()  => 'isb'),
  makeFam('physics-ocr-modelling',        'OCR Modelling Physics',       'physics',       2017, 2024, (y) => `ocr-${y}-modelling-physics`),
  makeFam('physics-ocr-exploring',        'OCR Exploring Physics',       'physics',       2017, 2024, (y) => `ocr-${y}-exploring-physics`),
  makeFam('physics-ocr-unified',          'OCR Unified Physics',         'physics',       2017, 2024, (y) => `ocr-${y}-unified-physics`),
  makeFam('physics-aqa-paper1',           'AQA Paper 1',                 'physics',       2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('physics-aqa-paper2',           'AQA Paper 2',                 'physics',       2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('physics-aqa-paper3a',          'AQA Paper 3A',                'physics',       2017, 2024, (y) => `aqa-${y}-paper3a`),
  makeFam('physics-aqa-paper3ba',         'AQA Paper 3B (Astrophysics)', 'physics',       2017, 2024, (y) => `aqa-${y}-paper3ba`),
  makeFam('physics-aqa-paper3bb',         'AQA Paper 3B (Medical)',      'physics',       2017, 2024, (y) => `aqa-${y}-paper3bb`),
  makeFam('physics-aqa-paper3bc',         'AQA Paper 3B (Engineering)',  'physics',       2017, 2024, (y) => `aqa-${y}-paper3bc`),

  // ── Computer Science ───────────────────────────────────────────────────────
  makeFam('cs-paper1',                    'AQA Paper 1',                         'computerScience', 2017, 2024, (y) => `paper1-${y}`),
  makeFam('cs-paper2',                    'AQA Paper 2',                         'computerScience', 2017, 2024, (y) => `paper2-${y}`),

  // ── Chemistry ─────────────────────────────────────────────────────────────
  makeFam('chem-aqa-paper1',              'AQA Paper 1 (Physical)',              'chemistry',  2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('chem-aqa-paper2',              'AQA Paper 2 (Inorganic/Physical)',     'chemistry',  2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('chem-aqa-paper3',              'AQA Paper 3 (Organic/Physical)',       'chemistry',  2017, 2024, (y) => `aqa-${y}-paper3`),
  makeFam('chem-ocra-01',                 'OCR A Component 01',                  'chemistry',  2017, 2024, (y) => `ocra-${y}-01`),
  makeFam('chem-ocra-02',                 'OCR A Component 02',                  'chemistry',  2017, 2024, (y) => `ocra-${y}-02`),
  makeFam('chem-ocra-03',                 'OCR A Component 03',                  'chemistry',  2017, 2024, (y) => `ocra-${y}-03`),
  makeFam('chem-edexcel-paper1',          'Edexcel Paper 1',                     'chemistry',  2017, 2024, (y) => `edexcel-${y}-paper1`),
  makeFam('chem-edexcel-paper2',          'Edexcel Paper 2',                     'chemistry',  2017, 2024, (y) => `edexcel-${y}-paper2`),
  makeFam('chem-edexcel-paper3',          'Edexcel Paper 3',                     'chemistry',  2017, 2024, (y) => `edexcel-${y}-paper3`),

  // ── Biology ───────────────────────────────────────────────────────────────
  makeFam('bio-aqa-paper1',               'AQA Paper 1',                         'biology',    2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('bio-aqa-paper2',               'AQA Paper 2',                         'biology',    2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('bio-aqa-paper3',               'AQA Paper 3',                         'biology',    2017, 2024, (y) => `aqa-${y}-paper3`),
  makeFam('bio-ocra-processes',           'OCR A Biological Processes',          'biology',    2017, 2024, (y) => `ocra-${y}-biological-processes`),
  makeFam('bio-ocra-diversity',           'OCR A Biological Diversity',          'biology',    2017, 2024, (y) => `ocra-${y}-biological-diversity`),
  makeFam('bio-ocra-unified',             'OCR A Unified Biology',               'biology',    2017, 2024, (y) => `ocra-${y}-unified-biology`),
  makeFam('bio-edexcel-paper1',           'Edexcel Paper 1',                     'biology',    2017, 2024, (y) => `edexcel-${y}-paper1`),
  makeFam('bio-edexcel-paper2',           'Edexcel Paper 2',                     'biology',    2017, 2024, (y) => `edexcel-${y}-paper2`),
  makeFam('bio-edexcel-paper3',           'Edexcel Paper 3',                     'biology',    2017, 2024, (y) => `edexcel-${y}-paper3`),

  // ── Psychology ────────────────────────────────────────────────────────────
  makeFam('psych-aqa-paper1',             'AQA Paper 1 (Introductory Topics)',   'psychology', 2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('psych-aqa-paper2',             'AQA Paper 2 (Psychology in Context)', 'psychology', 2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('psych-aqa-paper3',             'AQA Paper 3 (Issues & Options)',      'psychology', 2017, 2024, (y) => `aqa-${y}-paper3`),
  makeFam('psych-edexcel-paper1',         'Edexcel Paper 1',                     'psychology', 2017, 2024, (y) => `edexcel-${y}-paper1`),
  makeFam('psych-edexcel-paper2',         'Edexcel Paper 2',                     'psychology', 2017, 2024, (y) => `edexcel-${y}-paper2`),
  makeFam('psych-edexcel-paper3',         'Edexcel Paper 3',                     'psychology', 2017, 2024, (y) => `edexcel-${y}-paper3`),

  // ── Sociology ─────────────────────────────────────────────────────────────
  makeFam('socio-aqa-paper1',             'AQA Paper 1',                         'sociology',  2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('socio-aqa-paper2',             'AQA Paper 2',                         'sociology',  2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('socio-aqa-paper3',             'AQA Paper 3',                         'sociology',  2017, 2024, (y) => `aqa-${y}-paper3`),

  // ── Economics ─────────────────────────────────────────────────────────────
  makeFam('econ-aqa-paper1',              'AQA Paper 1 (Markets)',                'economics',  2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('econ-aqa-paper2',              'AQA Paper 2 (National)',               'economics',  2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('econ-aqa-paper3',              'AQA Paper 3 (Themes)',                 'economics',  2017, 2024, (y) => `aqa-${y}-paper3`),
  makeFam('econ-edexcel-paper1',          'Edexcel Paper 1',                     'economics',  2017, 2024, (y) => `edexcel-${y}-paper1`),
  makeFam('econ-edexcel-paper2',          'Edexcel Paper 2',                     'economics',  2017, 2024, (y) => `edexcel-${y}-paper2`),
  makeFam('econ-edexcel-paper3',          'Edexcel Paper 3',                     'economics',  2017, 2024, (y) => `edexcel-${y}-paper3`),

  // ── History ───────────────────────────────────────────────────────────────
  makeFam('hist-aqa-comp1',               'AQA Component 1',                     'history',    2017, 2024, (y) => `aqa-${y}-component1`),
  makeFam('hist-aqa-comp2',               'AQA Component 2',                     'history',    2017, 2024, (y) => `aqa-${y}-component2`),
  makeFam('hist-aqa-comp3',               'AQA Component 3',                     'history',    2017, 2024, (y) => `aqa-${y}-component3`),
  makeFam('hist-edexcel-paper1',          'Edexcel Paper 1',                     'history',    2017, 2024, (y) => `edexcel-${y}-paper1`),
  makeFam('hist-edexcel-paper2',          'Edexcel Paper 2',                     'history',    2017, 2024, (y) => `edexcel-${y}-paper2`),
  makeFam('hist-edexcel-paper3',          'Edexcel Paper 3',                     'history',    2017, 2024, (y) => `edexcel-${y}-paper3`),

  // ── Geography ─────────────────────────────────────────────────────────────
  makeFam('geog-aqa-paper1',              'AQA Paper 1 (Physical)',               'geography',  2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('geog-aqa-paper2',              'AQA Paper 2 (Human)',                  'geography',  2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('geog-aqa-paper3',              'AQA Paper 3 (Issue Eval)',             'geography',  2017, 2024, (y) => `aqa-${y}-paper3`),
  makeFam('geog-edexcel-paper1',          'Edexcel Paper 1',                     'geography',  2017, 2024, (y) => `edexcel-${y}-paper1`),
  makeFam('geog-edexcel-paper2',          'Edexcel Paper 2',                     'geography',  2017, 2024, (y) => `edexcel-${y}-paper2`),
  makeFam('geog-edexcel-paper3',          'Edexcel Paper 3',                     'geography',  2017, 2024, (y) => `edexcel-${y}-paper3`),

  // ── English Literature ────────────────────────────────────────────────────
  makeFam('eng-aqa-paper1',               'AQA Paper 1',                         'english',    2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('eng-aqa-paper2',               'AQA Paper 2',                         'english',    2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('eng-aqa-paper3',               'AQA Paper 3',                         'english',    2017, 2024, (y) => `aqa-${y}-paper3`),

  // ── Business ──────────────────────────────────────────────────────────────
  makeFam('biz-aqa-paper1',               'AQA Paper 1',                         'business',   2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('biz-aqa-paper2',               'AQA Paper 2',                         'business',   2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('biz-aqa-paper3',               'AQA Paper 3',                         'business',   2017, 2024, (y) => `aqa-${y}-paper3`),

  // ── Law ───────────────────────────────────────────────────────────────────
  makeFam('law-aqa-paper1',               'AQA Paper 1',                         'law',        2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('law-aqa-paper2',               'AQA Paper 2',                         'law',        2017, 2024, (y) => `aqa-${y}-paper2`),
  makeFam('law-aqa-paper3',               'AQA Paper 3',                         'law',        2017, 2024, (y) => `aqa-${y}-paper3`),

  // ── Physical Education ────────────────────────────────────────────────────
  makeFam('pe-aqa-paper1',                'AQA Paper 1',                         'pe',         2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('pe-aqa-paper2',                'AQA Paper 2',                         'pe',         2017, 2024, (y) => `aqa-${y}-paper2`),

  // ── Religious Studies ─────────────────────────────────────────────────────
  makeFam('rs-aqa-paper1',                'AQA Paper 1',                         'religious',  2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('rs-aqa-paper2',                'AQA Paper 2',                         'religious',  2017, 2024, (y) => `aqa-${y}-paper2`),

  // ── Languages (no year range — fixed paper structures) ────────────────────
  makeFam('fr-aqa-lrw',                   'AQA Listening, Reading & Writing',    'french',     2017, 2024, (y) => `aqa-${y}-lrw`),
  makeFam('fr-aqa-speaking',              'AQA Speaking',                        'french',     null, null, ()  => 'aqa-speaking'),
  makeFam('es-aqa-lrw',                   'AQA Listening, Reading & Writing',    'spanish',    2017, 2024, (y) => `aqa-${y}-lrw`),
  makeFam('es-aqa-speaking',              'AQA Speaking',                        'spanish',    null, null, ()  => 'aqa-speaking'),
  makeFam('de-aqa-lrw',                   'AQA Listening, Reading & Writing',    'german',     2017, 2024, (y) => `aqa-${y}-lrw`),
  makeFam('de-aqa-speaking',              'AQA Speaking',                        'german',     null, null, ()  => 'aqa-speaking'),

  // ── Statistics ────────────────────────────────────────────────────────────
  makeFam('stats-aqa-paper1',             'AQA Paper 1',                         'statistics', 2017, 2024, (y) => `aqa-${y}-paper1`),
  makeFam('stats-aqa-paper2',             'AQA Paper 2',                         'statistics', 2017, 2024, (y) => `aqa-${y}-paper2`),
];

export const BUILT_IN_FAMILIES_MAP = new Map(BUILT_IN_FAMILIES.map((f) => [f.id, f]));
