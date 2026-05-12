#!/usr/bin/env node
/**
 * Scrapes ALL A-level past papers from physicsandmathstutor.com using Playwright,
 * then downloads them and uploads to Firebase Storage.
 *
 * Usage:
 *   npm install playwright firebase-admin
 *   npx playwright install chromium
 *   node scripts/scrape-all-papers.js
 *
 * Optional flags:
 *   --dry-run          Collect URLs only, don't download
 *   --no-upload        Download to ./downloaded-papers/ but don't upload to Firebase
 *   --subject=maths    Only scrape one subject
 *
 * Requires: scripts/serviceAccountKey.json  (Firebase service account)
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const NO_UPLOAD = args.includes('--no-upload');
const SUBJECT_FILTER = (args.find(a => a.startsWith('--subject=')) ?? '').replace('--subject=', '') || null;

const DOWNLOAD_DIR = join(__dirname, 'downloaded-papers');
const MANIFEST_PATH = join(__dirname, 'papers-manifest.json');

// Only scrape current-spec A-level boards used by the app (AQA, Edexcel, OCR/OCR-A).
// Two URL patterns exist on PMT:
//   - /past-papers/a-level-<subject>/<board>-paper-<n>/  → board in last segment
//   - /maths-revision/a-level-<board>/papers[-as]/        → board in middle segment
const BOARD_ALLOW_PATTERNS = [
  /\baqa-paper-/,           // e.g. aqa-paper-1-as, aqa-paper-1
  /\bedexcel-paper-/,       // e.g. edexcel-paper-1
  /\bocr-a-paper-/,         // e.g. ocr-a-paper-1 (sciences)
  /\bocr-paper-/,           // e.g. ocr-paper-1 (cs, economics, english)
];

const MATHS_BOARD_ALLOW = [
  /a-level-aqa\//,
  /a-level-edexcel\//,
  /a-level-ocr\//,          // includes ocr and ocr-mei
];

function isAllowedSubpage(url) {
  // Maths-revision style: check full URL
  if (url.includes('/maths-revision/')) {
    return MATHS_BOARD_ALLOW.some(p => p.test(url));
  }
  // Standard past-papers style: check last path segment
  const segment = url.split('/').filter(Boolean).pop() ?? '';
  return BOARD_ALLOW_PATTERNS.some(p => p.test(segment));
}

// ── All A-level subject index pages on PMT ───────────────────────────────────
const SUBJECT_PAGES = [
  { subject: 'maths',           url: 'https://www.physicsandmathstutor.com/a-level-maths-papers/' },
  { subject: 'further-maths',   url: 'https://www.physicsandmathstutor.com/a-level-maths-papers/' }, // same page, FM section
  { subject: 'physics',         url: 'https://www.physicsandmathstutor.com/past-papers/a-level-physics/' },
  { subject: 'chemistry',       url: 'https://www.physicsandmathstutor.com/past-papers/a-level-chemistry/' },
  { subject: 'biology',         url: 'https://www.physicsandmathstutor.com/past-papers/a-level-biology/' },
  { subject: 'computer-science',url: 'https://www.physicsandmathstutor.com/past-papers/a-level-computer-science/' },
  { subject: 'economics',       url: 'https://www.physicsandmathstutor.com/past-papers/a-level-economics/' },
  { subject: 'psychology',      url: 'https://www.physicsandmathstutor.com/past-papers/a-level-psychology/' },
  { subject: 'geography',       url: 'https://www.physicsandmathstutor.com/past-papers/a-level-geography/' },
  { subject: 'history',         url: 'https://www.physicsandmathstutor.com/past-papers/a-level-history/' },
  { subject: 'english-lit',     url: 'https://www.physicsandmathstutor.com/past-papers/a-level-english-literature/' },
  { subject: 'english-lang',    url: 'https://www.physicsandmathstutor.com/past-papers/a-level-english-language/' },
];

// ── Firebase setup (skipped in dry-run / no-upload mode) ─────────────────────
let bucket = null;
if (!DRY_RUN && !NO_UPLOAD) {
  const keyPath = join(__dirname, 'serviceAccountKey.json');
  if (!existsSync(keyPath)) {
    console.error('❌  scripts/serviceAccountKey.json not found.');
    console.error('    Download from Firebase Console → Project Settings → Service Accounts.');
    process.exit(1);
  }
  const { default: admin } = await import('firebase-admin');
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), storageBucket: `${serviceAccount.project_id}.appspot.com` });
  bucket = admin.storage().bucket();
  console.log(`Uploading to gs://${bucket.name}`);
}

if (!DRY_RUN) mkdirSync(DOWNLOAD_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

function storagePathForUrl(pdfUrl) {
  // e.g. ".../download/Maths/A-level/Papers/AQA/Paper-1/QP/June 2023 QP.pdf"
  //   →  "scraped/Maths/A-level/Papers/AQA/Paper-1/QP/June 2023 QP.pdf"
  const marker = '/download/';
  const idx = pdfUrl.indexOf(marker);
  if (idx === -1) return null;
  return 'scraped/' + decodeURIComponent(pdfUrl.slice(idx + marker.length));
}

function localPathForUrl(pdfUrl) {
  const sp = storagePathForUrl(pdfUrl);
  if (!sp) return null;
  return join(DOWNLOAD_DIR, sp.replace(/\//g, '_'));
}

async function downloadBuffer(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120',
      'Referer': 'https://www.physicsandmathstutor.com/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function compressPdf(buffer) {
  const id = randomBytes(6).toString('hex');
  const inPath  = join(tmpdir(), `pmt-in-${id}.pdf`);
  const outPath = join(tmpdir(), `pmt-out-${id}.pdf`);
  try {
    writeFileSync(inPath, buffer);
    await execFileAsync('gs', [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook',   // 150 DPI — readable on screen, ~60-80% smaller
      '-dNOPAUSE', '-dBATCH', '-dQUIET',
      `-sOutputFile=${outPath}`,
      inPath,
    ]);
    const compressed = readFileSync(outPath);
    // Only use compressed version if it's actually smaller
    return compressed.length < buffer.length ? compressed : buffer;
  } finally {
    try { unlinkSync(inPath); } catch {}
    try { unlinkSync(outPath); } catch {}
  }
}

async function uploadToStorage(buffer, storagePath) {
  const file = bucket.file(storagePath);
  await file.save(buffer, { metadata: { contentType: 'application/pdf' }, resumable: false });
  return `gs://${bucket.name}/${storagePath}`;
}

// ── Playwright scraping ───────────────────────────────────────────────────────

let cookiesAccepted = false;

async function ensureCookiesAccepted(page) {
  if (cookiesAccepted) return;
  try {
    const frame = page.frameLocator('iframe[title="FastCMP"]');
    const btn = frame.getByRole('button', { name: 'Accept' });
    await btn.waitFor({ timeout: 5000 });
    await btn.click();
    await page.waitForTimeout(1000);
  } catch {}
  cookiesAccepted = true;
}

async function loadPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await ensureCookiesAccepted(page);
  // Links are wrapped: /pdf-pages/?pdf=<encoded-url> — wait for those to appear
  await Promise.race([
    page.waitForSelector('a[href*="pdf-pages/?pdf="]', { timeout: 8000 }).catch(() => {}),
    page.waitForSelector('a[href*="pmt.physicsandmathstutor.com/download"]', { timeout: 8000 }).catch(() => {}),
    page.waitForTimeout(5000),
  ]);
}

function extractPdfUrl(href) {
  // Unwrap /pdf-pages/?pdf=<encoded-url> wrapper
  try {
    const u = new URL(href);
    const pdfParam = u.searchParams.get('pdf');
    if (pdfParam) return pdfParam;
  } catch {}
  return href;
}

async function getPdfLinksFromPage(page, url) {
  await loadPage(page, url);
  const links = await page.evaluate(() => {
    return [...document.querySelectorAll('a')]
      .map(a => a.href)
      .filter(h => h && (
        h.includes('pmt.physicsandmathstutor.com/download') ||
        (h.includes('pdf-pages/?pdf=') && h.includes('pmt.physicsandmathstutor.com'))
      ));
  });
  return [...new Set(links.map(extractPdfUrl).filter(h => h.includes('pmt.physicsandmathstutor.com/download') && h.endsWith('.pdf')))];
}

async function getSubpagesFromIndex(page, url) {
  await loadPage(page, url);
  const subpages = await page.evaluate(() => {
    return [...document.querySelectorAll('a')]
      .map(a => a.href)
      .filter(h => h &&
        h.includes('physicsandmathstutor.com') &&
        !h.includes('pmt.physicsandmathstutor.com') &&
        !h.includes('pmt.education') &&
        !h.endsWith('#') &&
        (h.includes('/papers/') || h.includes('/papers-as/') ||
         h.match(/past-papers\/a-level-[^/]+\/[^/]+\/?$/))
      );
  });
  return [...new Set(subpages)];
}

// ── Main ──────────────────────────────────────────────────────────────────────

const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  : { collected: [], downloaded: [], failed: [] };

const alreadyCollected = new Set(manifest.collected.map(e => e.url));
const alreadyDone      = new Set(manifest.downloaded.map(e => e.url));

console.log(`Starting scraper — ${DRY_RUN ? 'DRY RUN ' : ''}${NO_UPLOAD ? '(no upload) ' : ''}`);
console.log(`Already collected: ${alreadyCollected.size} URLs, already downloaded: ${alreadyDone.size}`);

const browser = await chromium.launch({ headless: true });
const page    = await browser.newPage();
page.setDefaultTimeout(30000);

const subjects = SUBJECT_FILTER
  ? SUBJECT_PAGES.filter(s => s.subject === SUBJECT_FILTER)
  : SUBJECT_PAGES;

// ── Phase 1: Collect all PDF URLs ─────────────────────────────────────────────
console.log('\n=== Phase 1: Collecting PDF URLs ===');

for (const { subject, url } of subjects) {
  console.log(`\n[${subject}] Index: ${url}`);

  let subpages;
  try {
    subpages = await getSubpagesFromIndex(page, url);
    console.log(`  Found ${subpages.length} subpages`);
  } catch (e) {
    console.log(`  ⚠ Failed to load index: ${e.message}`);
    continue;
  }

  // Also try to grab PDFs directly from the index page (maths does this)
  try {
    const rawLinks = await page.evaluate(() =>
      [...document.querySelectorAll('a')]
        .map(a => a.href)
        .filter(h => h && (
          h.includes('pmt.physicsandmathstutor.com/download') ||
          (h.includes('pdf-pages/?pdf=') && h.includes('pmt.physicsandmathstutor.com'))
        ))
    );
    const directLinks = rawLinks.map(extractPdfUrl).filter(h => h.includes('pmt.physicsandmathstutor.com/download') && h.endsWith('.pdf'));
    for (const link of directLinks) {
      if (!alreadyCollected.has(link)) {
        manifest.collected.push({ subject, url: link });
        alreadyCollected.add(link);
      }
    }
    if (directLinks.length) console.log(`  +${directLinks.length} direct PDF links from index`);
  } catch {}

  const filteredSubpages = subpages.filter(isAllowedSubpage);
  console.log(`  After board filter: ${filteredSubpages.length} / ${subpages.length} subpages`);

  for (const subpage of filteredSubpages) {
    try {
      const pdfs = await getPdfLinksFromPage(page, subpage);
      let newCount = 0;
      for (const pdfUrl of pdfs) {
        if (!alreadyCollected.has(pdfUrl)) {
          manifest.collected.push({ subject, url: pdfUrl });
          alreadyCollected.add(pdfUrl);
          newCount++;
        }
      }
      console.log(`  ${subpage.split('/').slice(-2).join('/')}: ${pdfs.length} PDFs (+${newCount} new)`);
    } catch (e) {
      console.log(`  ⚠ ${subpage}: ${e.message}`);
    }
    await page.waitForTimeout(300); // polite delay
  }

  // Save manifest after each subject
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

await browser.close();

const totalCollected = manifest.collected.length;
console.log(`\n=== Phase 1 done: ${totalCollected} PDF URLs collected ===`);
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

if (DRY_RUN) {
  console.log('Dry run — stopping here. Manifest saved to', MANIFEST_PATH);
  process.exit(0);
}

// ── Phase 2: Download + upload ─────────────────────────────────────────────────
console.log('\n=== Phase 2: Downloading PDFs ===');

const toDownload = manifest.collected.filter(e => !alreadyDone.has(e.url));
console.log(`${toDownload.length} to download (${alreadyDone.size} already done)`);

let done = 0, failed = 0;

for (const entry of toDownload) {
  const { subject, url: pdfUrl } = entry;
  const storagePath = storagePathForUrl(pdfUrl);
  const label = storagePath?.split('/').slice(-3).join('/') ?? pdfUrl;
  process.stdout.write(`[${done + failed + 1}/${toDownload.length}] ${label}... `);

  try {
    // Check if already in Storage
    if (bucket) {
      const [exists] = await bucket.file(storagePath).exists();
      if (exists) {
        console.log('already in Storage');
        manifest.downloaded.push({ subject, url: pdfUrl, storagePath });
        alreadyDone.add(pdfUrl);
        done++;
        continue;
      }
    }

    const rawBuffer = await downloadBuffer(pdfUrl);
    const buffer = await compressPdf(rawBuffer);
    const rawKb  = (rawBuffer.length / 1024).toFixed(0);
    const kb     = (buffer.length / 1024).toFixed(0);
    const saved  = rawBuffer.length !== buffer.length ? ` (${rawKb}→${kb}KB)` : ` (${kb}KB)`;

    if (NO_UPLOAD) {
      const localPath = localPathForUrl(pdfUrl);
      writeFileSync(localPath, buffer);
      console.log(`saved locally${saved}`);
    } else {
      const gsPath = await uploadToStorage(buffer, storagePath);
      console.log(`uploaded${saved} → ${gsPath}`);
    }

    manifest.downloaded.push({ subject, url: pdfUrl, storagePath });
    alreadyDone.add(pdfUrl);
    done++;

    // Save progress every 20 files
    if (done % 20 === 0) writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    await new Promise(r => setTimeout(r, 400)); // polite delay
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
    manifest.failed.push({ subject, url: pdfUrl, error: e.message });
    failed++;
  }
}

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
console.log(`\n=== Done: ${done} downloaded, ${failed} failed ===`);
console.log(`Manifest: ${MANIFEST_PATH}`);
