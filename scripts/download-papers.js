#!/usr/bin/env node
/**
 * Downloads all past paper PDFs and uploads them to Firebase Storage.
 *
 * Usage:
 *   node scripts/download-papers.js
 *
 * Requirements:
 *   1. Place your Firebase service account key at scripts/serviceAccountKey.json
 *      (download from Firebase Console -> Project Settings -> Service accounts)
 *   2. npm install firebase-admin node-fetch
 *      (or: npm install --save-dev firebase-admin node-fetch)
 *
 * PDFs are uploaded to:
 *   gs://<bucket>/papers/<subject>/<paperPath>-<type>.pdf
 *
 * After running, the Storage URLs can be used in the app by calling
 * getDownloadURL() from Firebase Storage SDK with the same path.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// ── Firebase Admin setup ─────────────────────────────────────────────────────

const serviceAccountPath = join(import.meta.dirname, 'serviceAccountKey.json');

let admin;
try {
  admin = (await import('firebase-admin')).default;
} catch {
  console.error('firebase-admin not installed. Run: npm install firebase-admin');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch {
  console.error(`Service account key not found at ${serviceAccountPath}`);
  console.error('Download it from: Firebase Console -> Project settings -> Service accounts -> Generate new private key');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`,
});

const bucket = admin.storage().bucket();

// ── URL generation (mirrors src/lib/pmtLinks.js) ────────────────────────────

const PMT_BASE = 'https://pmt.physicsandmathstutor.com/download/';
const OCR_BASE = 'https://www.ocr.org.uk/Images/';

function buildPmtUrl(subjectDir, paperFolder, session, type, suffix = '') {
  return `${PMT_BASE}${subjectDir}/${paperFolder}/${type}/${session} ${type}${suffix}.pdf`;
}

const OCR_A_MATHS_IDS = {
  'pure-2018': { qp: 535607, ms: 535621 }, 'statistics-2018': { qp: 535611, ms: 535622 }, 'mechanics-2018': { qp: 535617, ms: 535623 },
  'pure-2019': { qp: 621197, ms: 621389 }, 'statistics-2019': { qp: 621199, ms: 621390 }, 'mechanics-2019': { qp: 621201, ms: 621391 },
  'pure-2020': { qp: 643526, ms: 643532 }, 'statistics-2020': { qp: 643528, ms: 643533 }, 'mechanics-2020': { qp: 643530, ms: 643534 },
  'pure-2021': { qp: 667253, ms: 667259 }, 'statistics-2021': { qp: 667255, ms: 667260 }, 'mechanics-2021': { qp: 667257, ms: 667261 },
  'pure-2022': { qp: 676845, ms: 677005 }, 'statistics-2022': { qp: 676847, ms: 677006 }, 'mechanics-2022': { qp: 676849, ms: 677007 },
  'pure-2023': { qp: 703866, ms: 704008 }, 'statistics-2023': { qp: 703868, ms: 704009 }, 'mechanics-2023': { qp: 703870, ms: 704010 },
};

const OCR_A_MATHS_COMPONENT = {
  pure: 'pure-mathematics',
  statistics: 'pure-mathematics-and-statistics',
  mechanics: 'pure-mathematics-and-mechanics',
};

function edexcelMathsSession(year) {
  const y = parseInt(year);
  return (y === 2020 || y === 2021) ? `October ${year}` : `June ${year}`;
}

function fmSession(board, year) {
  const y = parseInt(year);
  if (y === 2020 || y === 2021) {
    if (board === 'ocr') return `Nov ${year}`;
    if (board === 'aqa') return null;
  }
  return `June ${year}`;
}

function getPmtLinks(subject, paperPath) {
  if (!subject || !paperPath) return null;

  const parts = paperPath.split('-');
  if (parts.length < 3) return null;

  if (subject === 'maths') {
    const skipPaths = ['madas-mp2', 'madas-syn', 'knowledge-organiser'];
    if (skipPaths.includes(paperPath)) return null;

    const board = parts[0];
    const year = parts[1];
    const paperSuffix = parts.slice(2).join('-');

    if (board === 'ocr') {
      const entry = OCR_A_MATHS_IDS[`${paperSuffix}-${year}`];
      if (!entry) return null;
      const component = OCR_A_MATHS_COMPONENT[paperSuffix];
      if (!component) return null;
      return {
        qp: `${OCR_BASE}${entry.qp}-question-paper-${component}.pdf`,
        ms: `${OCR_BASE}${entry.ms}-mark-scheme-${component}.pdf`,
      };
    }
    if (board === 'aqa') {
      const paperNumMap = { pure: '1', 'pure-1': '1', statistics: '2', 'pure-2': '2', mechanics: '3', 'stats-and-mechanics': '3' };
      const paperN = paperNumMap[paperSuffix];
      if (!paperN) return null;
      return {
        qp: buildPmtUrl('Maths/A-level/Papers/AQA', `Paper-${paperN}`, `June ${year}`, 'QP'),
        ms: buildPmtUrl('Maths/A-level/Papers/AQA', `Paper-${paperN}`, `June ${year}`, 'MS'),
      };
    }
    if (board === 'edexcel') {
      const session = edexcelMathsSession(year);
      const folderMap = { 'pure-1': 'Paper-1', pure: 'Paper-1', 'pure-2': 'Paper-2', 'stats-and-mechanics': 'Paper-3' };
      const folder = folderMap[paperSuffix];
      if (!folder) return null;
      const suffix = paperSuffix === 'stats-and-mechanics' ? ' (Mech)' : '';
      return {
        qp: buildPmtUrl('Maths/A-level/Papers/Edexcel', folder, session, 'QP', suffix),
        ms: buildPmtUrl('Maths/A-level/Papers/Edexcel', folder, session, 'MS', suffix),
      };
    }
  }

  if (subject === 'physics') {
    if (paperPath === 'isb') return null;
    const board = parts[0];
    const year = parts[1];
    const paperSuffix = parts.slice(2).join('-');

    if (board === 'ocr') {
      const ocrMap = { 'modelling-physics': '1', 'exploring-physics': '2', 'unified-physics': '3' };
      const paperN = ocrMap[paperSuffix];
      if (!paperN) return null;
      return {
        qp: buildPmtUrl('Physics/A-level/Past-Papers/OCR-A', `Paper-${paperN}`, `June ${year}`, 'QP'),
        ms: buildPmtUrl('Physics/A-level/Past-Papers/OCR-A', `Paper-${paperN}`, `June ${year}`, 'MS'),
      };
    }
    if (board === 'aqa') {
      const skip = ['paper3ba', 'paper3bb', 'paper3bc'];
      if (skip.includes(paperSuffix)) return null;
      const aqaMap = { paper1: 'Paper-1', paper2: 'Paper-2', paper3a: 'Paper-3A' };
      const folder = aqaMap[paperSuffix];
      if (!folder) return null;
      return {
        qp: buildPmtUrl('Physics/A-level/Past-Papers/AQA', folder, `June ${year}`, 'QP'),
        ms: buildPmtUrl('Physics/A-level/Past-Papers/AQA', folder, `June ${year}`, 'MS'),
      };
    }
  }

  if (subject === 'furtherMaths') {
    if (paperPath === 'textbook') return null;
    const firstPart = parts[0];

    if (firstPart === 'ocr') {
      const year = parts[1];
      const paperSuffix = parts.slice(2).join('-');
      const session = fmSession('ocr', year);
      if (!session) return null;
      const folderMap = {
        'pure-core-1': 'Pure-Core-1', 'pure-core-2': 'Pure-Core-2',
        mechanics: 'Mechanics', statistics: 'Statistics',
        discrete: 'Discrete', 'additional-pure': 'Additional-Pure',
      };
      const folder = folderMap[paperSuffix];
      if (!folder) return null;
      return {
        qp: buildPmtUrl('Maths/A-level/Papers/OCR-Further', folder, session, 'QP'),
        ms: buildPmtUrl('Maths/A-level/Papers/OCR-Further', folder, session, 'MS'),
      };
    }

    if (firstPart === 'foreign') {
      const board = parts[1];
      const year = parts[2];
      const paperSuffix = parts.slice(3).join('-');

      if (board === 'aqa') {
        const session = fmSession('aqa', year);
        if (!session) return null;
        const folderMap = {
          'core-pure-1': 'Paper-1', 'core-pure-2': 'Paper-2',
          mechanics: 'Paper-3-Mechanics', statistics: 'Paper-3-Statistics', discrete: 'Paper-3-Discrete',
        };
        const folder = folderMap[paperSuffix];
        if (!folder) return null;
        return {
          qp: buildPmtUrl('Maths/A-level/Papers/AQA-Further', folder, session, 'QP'),
          ms: buildPmtUrl('Maths/A-level/Papers/AQA-Further', folder, session, 'MS'),
        };
      }

      if (board === 'edexcel') {
        const session = fmSession('edexcel', year);
        if (!session) return null;
        const folderMap = {
          'core-pure-1': 'Core-Pure-1', 'core-pure-2': 'Core-Pure-2',
          'further-pure-1': 'Further-Pure-1', 'further-pure-2': 'Further-Pure-2',
          'further-mechanics-1': 'Mechanics-1', 'further-mechanics-2': 'Mechanics-2',
          'statistics-1': 'Statistics-1', 'statistics-2': 'Statistics-2',
          'decision-1': 'Decision-1', 'decision-2': 'Decision-2',
        };
        const folder = folderMap[paperSuffix];
        if (!folder) return null;
        return {
          qp: buildPmtUrl('Maths/A-level/Papers/Edexcel-Further', folder, session, 'QP'),
          ms: buildPmtUrl('Maths/A-level/Papers/Edexcel-Further', folder, session, 'MS'),
        };
      }
    }
  }

  return null;
}

// ── All papers to download ───────────────────────────────────────────────────

function yearRange(start, end) {
  const out = [];
  for (let y = start; y <= end; y++) out.push(y);
  return out;
}

const PAPER_FAMILIES = [
  // Maths
  ...yearRange(2018, 2024).flatMap(y => [
    { subject: 'maths', paperPath: `ocr-${y}-pure` },
    { subject: 'maths', paperPath: `ocr-${y}-statistics` },
    { subject: 'maths', paperPath: `ocr-${y}-mechanics` },
  ]),
  ...yearRange(2018, 2024).flatMap(y => [
    { subject: 'maths', paperPath: `aqa-${y}-pure` },
    { subject: 'maths', paperPath: `aqa-${y}-statistics` },
    { subject: 'maths', paperPath: `aqa-${y}-mechanics` },
    { subject: 'maths', paperPath: `edexcel-${y}-pure-1` },
    { subject: 'maths', paperPath: `edexcel-${y}-pure-2` },
    { subject: 'maths', paperPath: `edexcel-${y}-stats-and-mechanics` },
  ]),

  // Further Maths
  ...yearRange(2019, 2024).flatMap(y => [
    { subject: 'furtherMaths', paperPath: `ocr-${y}-pure-core-1` },
    { subject: 'furtherMaths', paperPath: `ocr-${y}-pure-core-2` },
    { subject: 'furtherMaths', paperPath: `ocr-${y}-mechanics` },
    { subject: 'furtherMaths', paperPath: `ocr-${y}-additional-pure` },
    { subject: 'furtherMaths', paperPath: `foreign-aqa-${y}-core-pure-1` },
    { subject: 'furtherMaths', paperPath: `foreign-aqa-${y}-core-pure-2` },
    { subject: 'furtherMaths', paperPath: `foreign-aqa-${y}-mechanics` },
    { subject: 'furtherMaths', paperPath: `foreign-edexcel-${y}-core-pure-1` },
    { subject: 'furtherMaths', paperPath: `foreign-edexcel-${y}-core-pure-2` },
    { subject: 'furtherMaths', paperPath: `foreign-edexcel-${y}-further-pure-1` },
    { subject: 'furtherMaths', paperPath: `foreign-edexcel-${y}-further-pure-2` },
    { subject: 'furtherMaths', paperPath: `foreign-edexcel-${y}-further-mechanics-1` },
    { subject: 'furtherMaths', paperPath: `foreign-edexcel-${y}-further-mechanics-2` },
    { subject: 'furtherMaths', paperPath: `foreign-edexcel-${y}-statistics-1` },
    { subject: 'furtherMaths', paperPath: `foreign-edexcel-${y}-statistics-2` },
  ]),

  // Physics
  ...yearRange(2017, 2024).flatMap(y => [
    { subject: 'physics', paperPath: `ocr-${y}-modelling-physics` },
    { subject: 'physics', paperPath: `ocr-${y}-exploring-physics` },
    { subject: 'physics', paperPath: `ocr-${y}-unified-physics` },
    { subject: 'physics', paperPath: `aqa-${y}-paper1` },
    { subject: 'physics', paperPath: `aqa-${y}-paper2` },
    { subject: 'physics', paperPath: `aqa-${y}-paper3a` },
  ]),
];

// ── Downloader ───────────────────────────────────────────────────────────────

async function downloadBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PaperDownloader/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('pdf')) throw new Error(`Not a PDF (content-type: ${ct})`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToStorage(buffer, storagePath) {
  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType: 'application/pdf' } });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const results = { success: [], failed: [] };
let count = 0;

for (const { subject, paperPath } of PAPER_FAMILIES) {
  const links = getPmtLinks(subject, paperPath);
  if (!links) continue;

  for (const [type, url] of Object.entries(links)) {
    const storagePath = `papers/${subject}/${paperPath}-${type}.pdf`;
    count++;
    process.stdout.write(`[${count}] ${paperPath} ${type.toUpperCase()}... `);

    try {
      // Check if already uploaded
      const [exists] = await bucket.file(storagePath).exists();
      if (exists) {
        console.log('already exists, skipping');
        results.success.push({ paperPath, type, storagePath, skipped: true });
        continue;
      }

      const buffer = await downloadBuffer(url);
      const publicUrl = await uploadToStorage(buffer, storagePath);
      console.log(`OK (${(buffer.length / 1024).toFixed(0)}KB)`);
      results.success.push({ paperPath, type, storagePath, publicUrl });

      // Gentle rate limiting
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.failed.push({ paperPath, type, url, error: err.message });
    }
  }
}

// Write summary
const summaryPath = join(import.meta.dirname, 'download-results.json');
writeFileSync(summaryPath, JSON.stringify(results, null, 2));

console.log(`\nDone: ${results.success.length} uploaded, ${results.failed.length} failed`);
console.log(`Results saved to ${summaryPath}`);
