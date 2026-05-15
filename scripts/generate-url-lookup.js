#!/usr/bin/env node
/**
 * Parses papers-manifest.json and generates src/lib/pmtManifestLookup.js.
 *
 * Usage:
 *   node scripts/generate-url-lookup.js [--stats]
 *
 * --stats: print counts and unparseable URLs instead of writing the file
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATS_ONLY = process.argv.includes('--stats');

const manifest = JSON.parse(readFileSync(join(__dirname, 'papers-manifest.json'), 'utf8'));
const OUTPUT = join(__dirname, '../src/lib/pmtManifestLookup.js');

// Types we want to keep (QP, MS only)
const KEEP_TYPES = new Set(['QP', 'MS']);

// Boards to skip entirely
const SKIP_BOARDS = new Set(['OCR-Old', 'OCR-B']);

// Filename fragments that indicate non-paper files
const SKIP_FRAGMENTS = ['data sheet', 'formulae sheet', 'assembly language', 'pmt mock', 'insert sheet'];

const BASE = 'https://pmt.physicsandmathstutor.com/download/';

// Map manifest subject strings to app subject IDs
const SUBJECT_MAP = {
  'biology':         'biology',
  'chemistry':       'chemistry',
  'computer-science':'computerScience',
  'economics':       'economics',
  'english-lang':    'englishLang',
  'english-lit':     'english',
  'geography':       'geography',
  'history':         'history',
  'psychology':      'psychology',
  // maths/physics/furtherMaths have their own URL builders in pmtLinks.js — skip
};

// (subject, board) pairs that have multi-variant papers per folder (can't pick one)
// History Edexcel: Paper-1 has 1A/1B/1C options, Paper-2 has 2A/2B/2C, etc.
const SKIP_BOARD_PAIRS = new Set([
  'history|Edexcel',
]);

// Count stats
const stats = {
  total: 0,
  skipped: { noSubjectMap: 0, skipBoard: 0, skipBoardPair: 0, skipFragment: 0, noYear: 0, skipType: 0 },
  parsed: 0,
  unparseable: [],
};

// lookup[key] = { qp, ms }
// key = "{appSubject}|{board}|{folder}|{year}"
const lookup = {};

for (const entry of manifest.collected) {
  stats.total++;

  const appSubject = SUBJECT_MAP[entry.subject];
  if (!appSubject) { stats.skipped.noSubjectMap++; continue; }

  const rest = entry.url.slice(BASE.length);
  // rest = "Subject/A-level/Past-Papers/Board/Folder[/TypeSub]/filename.pdf"
  const parts = rest.split('/');
  // parts[0]=Subject, parts[1]=A-level, parts[2]=Past-Papers|Papers, parts[3]=Board, parts[4]=Folder, [parts[5]=TypeSub|filename], [parts[6]=filename]

  const board = parts[3];
  const folder = parts[4];

  if (!board || !folder) { stats.unparseable.push(entry.url); continue; }
  if (SKIP_BOARDS.has(board)) { stats.skipped.skipBoard++; continue; }

  if (SKIP_BOARD_PAIRS.has(`${entry.subject}|${board}`)) { stats.skipped.skipBoardPair++; continue; }

  // Determine type and filename
  let type = null;
  let filename = null;
  if (parts.length >= 7) {
    // Has type subfolder: parts[5] = QP/MS/MA/IN/ER etc., parts[6] = filename
    type = parts[5];
    filename = parts[6];
  } else if (parts.length === 6) {
    // No type subfolder: parts[5] = filename, type embedded in filename
    filename = parts[5];
    // Extract type from filename: first word that's all-caps 2-3 chars
    const m = filename.match(/\b(QP|MS|MA|IN|ER)\b/);
    type = m ? m[1] : null;
  } else {
    stats.unparseable.push(entry.url);
    continue;
  }

  if (!KEEP_TYPES.has(type)) { stats.skipped.skipType++; continue; }

  // Skip non-paper files
  const fnameLower = (filename || '').toLowerCase();
  if (SKIP_FRAGMENTS.some(f => fnameLower.includes(f))) { stats.skipped.skipFragment++; continue; }

  // Extract year from filename (June/October/November YYYY)
  const yearMatch = filename.match(/(?:June|October|November|Oct|Nov)\s+(\d{4})/i);
  if (!yearMatch) { stats.skipped.noYear++; continue; }
  const year = yearMatch[1];

  const key = `${appSubject}|${board}|${folder}|${year}`;
  if (!lookup[key]) lookup[key] = {};
  lookup[key][type.toLowerCase()] = entry.url;
  stats.parsed++;
}

if (STATS_ONLY) {
  console.log('\n=== Parse stats ===');
  console.log(`Total entries: ${stats.total}`);
  console.log(`Parsed (kept): ${stats.parsed}`);
  console.log('Skipped:');
  for (const [k, v] of Object.entries(stats.skipped)) console.log(`  ${k}: ${v}`);
  console.log(`Unparseable: ${stats.unparseable.length}`);
  if (stats.unparseable.length) {
    console.log('\nUnparseable URLs:');
    stats.unparseable.slice(0, 20).forEach(u => console.log(' ', u));
  }

  const keys = Object.keys(lookup);
  console.log(`\nLookup entries: ${keys.length}`);

  // Show coverage per subject/board
  const coverage = {};
  for (const key of keys) {
    const [subj, board] = key.split('|');
    const k2 = `${subj}|${board}`;
    if (!coverage[k2]) coverage[k2] = { qpOnly: 0, msOnly: 0, both: 0 };
    const e = lookup[key];
    if (e.qp && e.ms) coverage[k2].both++;
    else if (e.qp) coverage[k2].qpOnly++;
    else coverage[k2].msOnly++;
  }
  console.log('\nCoverage (subject|board): both / qp-only / ms-only');
  for (const [k, v] of Object.entries(coverage).sort()) {
    console.log(`  ${k}: ${v.both} both, ${v.qpOnly} QP-only, ${v.msOnly} MS-only`);
  }
  process.exit(0);
}

// Write output
const entries = Object.entries(lookup).map(([key, val]) => {
  const qp = val.qp ? JSON.stringify(val.qp) : 'null';
  const ms = val.ms ? JSON.stringify(val.ms) : 'null';
  return `  ${JSON.stringify(key)}: { qp: ${qp}, ms: ${ms} }`;
});

const output = `// Auto-generated by scripts/generate-url-lookup.js — do not edit manually.
// Maps "{appSubject}|{board}|{folder}|{year}" → { qp: url | null, ms: url | null }
export const PMT_LOOKUP = {
${entries.join(',\n')},
};
`;

writeFileSync(OUTPUT, output, 'utf8');
console.log(`Wrote ${entries.length} entries to ${OUTPUT}`);
