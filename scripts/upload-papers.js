#!/usr/bin/env node
/**
 * Uploads locally-downloaded papers to Firebase Storage in daily batches.
 * Run once per day — stops after uploading ~900 MB, deletes local files on success.
 *
 * Usage:
 *   node scripts/upload-papers.js
 *
 * Optional flags:
 *   --limit-mb=900     Daily upload cap in MB (default 900)
 *   --no-delete        Upload but keep local copies
 *
 * Requires: scripts/serviceAccountKey.json
 * Run scrape-all-papers.js --no-upload first to populate downloaded-papers/
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const NO_DELETE  = args.includes('--no-delete');
const LIMIT_MB   = parseFloat((args.find(a => a.startsWith('--limit-mb=')) ?? '').replace('--limit-mb=', '') || '900');
const BUCKET_OVERRIDE = (args.find(a => a.startsWith('--bucket=')) ?? '').replace('--bucket=', '') || null;
const LIMIT_BYTES = LIMIT_MB * 1024 * 1024;

const DOWNLOAD_DIR   = join(__dirname, 'downloaded-papers');
const MANIFEST_PATH  = join(__dirname, 'papers-manifest.json');
const PROGRESS_PATH  = join(__dirname, 'upload-progress.json');

// ── Firebase setup ────────────────────────────────────────────────────────────
const keyPath = join(__dirname, 'serviceAccountKey.json');
if (!existsSync(keyPath)) {
  console.error('scripts/serviceAccountKey.json not found.');
  console.error('Download from Firebase Console → Project Settings → Service Accounts.');
  process.exit(1);
}
const { default: admin } = await import('firebase-admin');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
const bucketName = BUCKET_OVERRIDE ?? `${serviceAccount.project_id}.appspot.com`;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: bucketName,
});
const bucket = admin.storage().bucket();
console.log(`Uploading to gs://${bucket.name}`);

// ── Load state ────────────────────────────────────────────────────────────────
if (!existsSync(MANIFEST_PATH)) {
  console.error('papers-manifest.json not found. Run scrape-all-papers.js --no-upload first.');
  process.exit(1);
}
// Upload progress: tracks which storage paths are confirmed uploaded
const progress = existsSync(PROGRESS_PATH)
  ? JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'))
  : { uploaded: [], failed: [] };

const alreadyUploaded = new Set(progress.uploaded.map(e => e.storagePath));

// ── Build work list from local files ─────────────────────────────────────────
function storagePathFromLocalName(filename) {
  // Local files are stored as: scraped_Subject_A-level_...pdf  (slashes → underscores)
  // Reverse: first segment is 'scraped', rest are the path
  return filename.replace(/_/g, '/');
}

if (!existsSync(DOWNLOAD_DIR)) {
  console.error(`downloaded-papers/ directory not found at ${DOWNLOAD_DIR}`);
  console.error('Run: node scripts/scrape-all-papers.js --no-upload');
  process.exit(1);
}

// Build list of all local files not yet uploaded
const allLocal = readdirSync(DOWNLOAD_DIR).filter(f => f.endsWith('.pdf'));
const toUpload = allLocal
  .map(filename => {
    const storagePath = storagePathFromLocalName(filename);
    const localPath   = join(DOWNLOAD_DIR, filename);
    return { filename, storagePath, localPath };
  })
  .filter(({ storagePath }) => !alreadyUploaded.has(storagePath));

const totalLocal    = allLocal.length;
const alreadyCount  = totalLocal - toUpload.length;
const pendingBytes  = toUpload.reduce((sum, { localPath }) => {
  try { return sum + statSync(localPath).size; } catch { return sum; }
}, 0);

console.log(`\nLocal files:  ${totalLocal}`);
console.log(`Already uploaded: ${alreadyCount}`);
console.log(`Pending: ${toUpload.length} files (${(pendingBytes / 1024 / 1024).toFixed(0)} MB remaining)`);
console.log(`Daily cap: ${LIMIT_MB} MB\n`);

if (toUpload.length === 0) {
  console.log('All files uploaded. Nothing to do.');
  process.exit(0);
}

// ── Upload loop ───────────────────────────────────────────────────────────────
let uploadedBytes = 0;
let done = 0, failed = 0, skipped = 0;

for (const { storagePath, localPath } of toUpload) {
  if (uploadedBytes >= LIMIT_BYTES) {
    skipped = toUpload.length - done - failed;
    break;
  }

  const label = storagePath.split('/').slice(-3).join('/');
  let fileSize = 0;
  try { fileSize = statSync(localPath).size; } catch {
    console.log(`[SKIP] ${label} — local file missing`);
    skipped++;
    continue;
  }

  process.stdout.write(`[${done + failed + 1}/${toUpload.length}] ${label} (${(fileSize/1024).toFixed(0)}KB)... `);

  try {
    // Skip if already in Storage (e.g. uploaded by another run)
    const [exists] = await bucket.file(storagePath).exists();
    if (exists) {
      console.log('already in Storage');
      progress.uploaded.push({ storagePath, uploadedAt: new Date().toISOString() });
      alreadyUploaded.add(storagePath);
      if (!NO_DELETE) unlinkSync(localPath);
      done++;
      uploadedBytes += fileSize;
      continue;
    }

    const buffer = readFileSync(localPath);
    const file   = bucket.file(storagePath);
    await file.save(buffer, { metadata: { contentType: 'application/pdf' }, resumable: false });

    console.log(`uploaded → gs://${bucket.name}/${storagePath}`);
    progress.uploaded.push({ storagePath, uploadedAt: new Date().toISOString() });
    alreadyUploaded.add(storagePath);
    uploadedBytes += fileSize;
    done++;

    if (!NO_DELETE) {
      unlinkSync(localPath);
    }

    // Save progress every 10 files
    if (done % 10 === 0) writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));

  } catch (e) {
    console.log(`FAILED: ${e.message}`);
    progress.failed.push({ storagePath, error: e.message, failedAt: new Date().toISOString() });
    failed++;
  }
}

writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));

const remaining = toUpload.length - done - failed - skipped;
console.log(`\n=== Session done ===`);
console.log(`Uploaded: ${done} files (${(uploadedBytes / 1024 / 1024).toFixed(0)} MB)`);
if (failed)  console.log(`Failed:   ${failed}`);
if (skipped) console.log(`Deferred: ${skipped} files left for next run (${(pendingBytes - uploadedBytes) / 1024 / 1024 | 0} MB)`);
if (remaining > 0 || skipped > 0) {
  console.log(`\nRun again tomorrow to continue.`);
}
