import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config';
import { updateStreak, awardXpAndBadges } from './social';

// ─── Completed Papers ───────────────────────────────────────────────────────

export async function deleteCompletedPaper(userId, paperId) {
  await deleteDoc(doc(db, 'users', userId, 'completedPapers', paperId));
}

export async function updateCompletion(userId, paperId, updates) {
  const ref = doc(db, 'users', userId, 'completedPapers', paperId);
  const updateData = { marks: updates.marks ?? null, grade: updates.grade ?? null, comment: updates.comment ?? null };
  if ('actualDurationSeconds' in updates) {
    updateData.actualDurationSeconds = updates.actualDurationSeconds ?? null;
  }
  await updateDoc(ref, updateData);
}

/**
 * Returns paperPath strings completed across all time.
 */
export async function getAllCompletedPaperPaths(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'completedPapers'));
  return snap.docs.map((d) => d.data().paperPath).filter(Boolean);
}

export async function getRecentCompletedPapers(userId, beforeDate, weeksBack = 3) {
  const end = new Date(beforeDate);
  const start = new Date(beforeDate);
  start.setDate(start.getDate() - weeksBack * 7);

  const colRef = collection(db, 'users', userId, 'completedPapers');
  const q = query(
    colRef,
    where('completedAt', '>=', start.toISOString()),
    where('completedAt', '<', end.toISOString()),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().paperPath);
}

export async function recordCompletion(userId, paperData) {
  // Check if there's an existing completion record for this paper (to prevent XP farming)
  let existingXpAwarded = false;
  if (paperData.existingDocId) {
    try {
      const existingSnap = await getDoc(doc(db, 'users', userId, 'completedPapers', paperData.existingDocId));
      if (existingSnap.exists() && existingSnap.data().xpAwarded === true) {
        existingXpAwarded = true;
      }
    } catch (_) { /* best-effort */ }
  }

  // Atomically write completed paper record + public stats in a single batch
  const batch = writeBatch(db);

  const paperRef = paperData.existingDocId
    ? doc(db, 'users', userId, 'completedPapers', paperData.existingDocId)
    : doc(collection(db, 'users', userId, 'completedPapers'));

  batch.set(paperRef, {
    paperPath: paperData.paperPath,
    subject: paperData.subject,
    displayName: paperData.displayName,
    weekId: paperData.weekId,
    marks: paperData.marks ?? null,
    grade: paperData.grade ?? null,
    comment: paperData.comment ?? null,
    completedAt: new Date().toISOString(),
    xpAwarded: true,
    source: paperData.source ?? 'scheduled',
    actualDurationSeconds: paperData.actualDurationSeconds ?? null,
  });

  const studyMinutesAdd = paperData.actualDurationSeconds != null
    ? Math.round(paperData.actualDurationSeconds / 60)
    : (paperData.durationMins ?? 90);

  const statsRef = doc(db, 'userPublicStats', userId);
  const statsData = {
    papersCompleted: increment(1),
    studyMinutes: increment(studyMinutesAdd),
    lastUpdated: serverTimestamp(),
  };
  const statsMergeFields = ['papersCompleted', 'studyMinutes', 'lastUpdated'];
  if (paperData.subject) {
    statsData.subjectPapersCompleted = { [paperData.subject]: increment(1) };
    statsMergeFields.push(`subjectPapersCompleted.${paperData.subject}`);
  }
  batch.set(statsRef, statsData, { mergeFields: statsMergeFields });

  await batch.commit();

  // If XP was already awarded for this paper, skip awarding again
  if (existingXpAwarded) {
    return { xpEarned: 0, newBadges: [] };
  }

  // Streak update needs a read first, so it runs separately (best-effort)
  await updateStreak(userId).catch((e) => { console.warn('Streak update failed (best-effort):', e); });

  // Award XP + badges (best-effort, read updated stats first)
  let xpResult = { xpEarned: 0, newBadges: [] };
  try {
    const updatedSnap = await getDoc(doc(db, 'userPublicStats', userId));
    const updatedStats = updatedSnap.exists() ? updatedSnap.data() : {};
    const effectiveTimeTaken = paperData.actualDurationSeconds != null
      ? paperData.actualDurationSeconds / 60
      : paperData.timeTaken;
    xpResult = await awardXpAndBadges(userId, { ...paperData, timeTaken: effectiveTimeTaken }, updatedStats);
  } catch (e) { console.warn('XP/badge award failed (best-effort):', e); }

  // Update personal best (best-effort)
  let isPB = false;
  try {
    if (paperData.actualDurationSeconds && paperData.subject && paperData.paperPath) {
      isPB = await maybeUpdatePB(userId, paperData.subject, paperData.paperPath, paperData.actualDurationSeconds);
    }
  } catch (e) { console.warn('PB update failed (best-effort):', e); }

  return { ...xpResult, isPB };
}

/**
 * Log an ad-hoc paper (outside of scheduled timetable).
 * Enforces a daily cap of 3 ad-hoc papers that award XP.
 */
export async function logAdhocPaper(userId, paperData) {
  // Count today's ad-hoc completions
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const adhocQuery = query(
    collection(db, 'users', userId, 'completedPapers'),
    where('source', '==', 'adhoc'),
    where('completedAt', '>=', startOfToday.toISOString()),
    limit(4)
  );
  const adhocSnap = await getDocs(adhocQuery);
  const todayCount = adhocSnap.size;

  const batch = writeBatch(db);
  const paperRef = doc(collection(db, 'users', userId, 'completedPapers'));
  batch.set(paperRef, {
    paperPath: paperData.paperPath ?? 'adhoc',
    subject: paperData.subject,
    displayName: paperData.displayName,
    weekId: null,
    marks: paperData.marks ?? null,
    grade: paperData.grade ?? null,
    comment: paperData.comment ?? null,
    completedAt: paperData.completedAt ?? new Date().toISOString(),
    xpAwarded: todayCount < 3,
    source: 'adhoc',
    actualDurationSeconds: paperData.actualDurationSeconds ?? null,
  });

  const studyMinutesAdd = paperData.actualDurationSeconds != null
    ? Math.round(paperData.actualDurationSeconds / 60)
    : (paperData.durationMins ?? 90);

  const statsRef = doc(db, 'userPublicStats', userId);
  const statsData = {
    papersCompleted: increment(1),
    studyMinutes: increment(studyMinutesAdd),
    lastUpdated: serverTimestamp(),
  };
  const statsMergeFields = ['papersCompleted', 'studyMinutes', 'lastUpdated'];
  if (paperData.subject) {
    statsData.subjectPapersCompleted = { [paperData.subject]: increment(1) };
    statsMergeFields.push(`subjectPapersCompleted.${paperData.subject}`);
  }
  batch.set(statsRef, statsData, { mergeFields: statsMergeFields });

  await batch.commit();

  // Daily cap: only award XP for first 3 ad-hoc papers per day
  if (todayCount >= 3) {
    return { xpEarned: 0, newBadges: [], capReached: true };
  }

  await updateStreak(userId).catch((e) => { console.warn('Streak update failed (best-effort):', e); });

  let xpResult = { xpEarned: 0, newBadges: [] };
  try {
    const updatedSnap = await getDoc(doc(db, 'userPublicStats', userId));
    const updatedStats = updatedSnap.exists() ? updatedSnap.data() : {};
    const effectiveTimeTaken = paperData.actualDurationSeconds != null
      ? paperData.actualDurationSeconds / 60
      : paperData.timeTaken;
    xpResult = await awardXpAndBadges(userId, { ...paperData, timeTaken: effectiveTimeTaken }, updatedStats);
  } catch (e) { console.warn('XP/badge award failed (best-effort):', e); }

  let isPB = false;
  try {
    if (paperData.actualDurationSeconds && paperData.subject && paperData.paperPath) {
      isPB = await maybeUpdatePB(userId, paperData.subject, paperData.paperPath, paperData.actualDurationSeconds);
    }
  } catch (e) { console.warn('PB update failed (best-effort):', e); }

  return { ...xpResult, capReached: false, isPB };
}

/**
 * Paginated fetch of completed papers.
 * @param {string} userId
 * @param {{ limit?: number, startAfter?: import('firebase/firestore').QueryDocumentSnapshot | null }} options
 * @returns {{ papers: object[], lastDoc: object|null, hasMore: boolean }}
 */
export async function getAllCompletedPapers(userId, { limit: limitCount = 50, startAfter: startAfterDoc = null } = {}) {
  let q = query(
    collection(db, 'users', userId, 'completedPapers'),
    orderBy('completedAt', 'desc'),
    limit(limitCount + 1) // fetch one extra to detect if more exist
  );
  if (startAfterDoc) {
    q = query(
      collection(db, 'users', userId, 'completedPapers'),
      orderBy('completedAt', 'desc'),
      startAfter(startAfterDoc),
      limit(limitCount + 1)
    );
  }
  const snap = await getDocs(q);
  const hasMore = snap.docs.length > limitCount;
  const docs = hasMore ? snap.docs.slice(0, limitCount) : snap.docs;
  return {
    papers: docs.map((d) => ({ id: d.id, ...d.data() })),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

// ─── Custom Papers ───────────────────────────────────────────────────────────
// Subcollection: users/{uid}/customPapers/{familyId}
// Schema: { familyName, subject, yearStart, yearEnd, duration }

export async function getCustomPapers(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'customPapers'));
  const result = {};
  snap.forEach((d) => { result[d.id] = { id: d.id, ...d.data() }; });
  return result;
}

export async function saveCustomPaper(userId, familyId, data) {
  await setDoc(doc(db, 'users', userId, 'customPapers', familyId), data, { merge: true });
}

export async function deleteCustomPaper(userId, familyId, yearStart, yearEnd) {
  await deleteDoc(doc(db, 'users', userId, 'customPapers', familyId));
  // Clean up durations for all years in range
  const durRef = doc(db, 'users', userId, 'settings', 'durations');
  const snap = await getDoc(durRef);
  if (snap.exists()) {
    const deletions = {};
    for (let y = yearStart; y <= yearEnd; y++) {
      deletions[`custom-${familyId}-${y}`] = deleteField();
    }
    await updateDoc(durRef, deletions);
  }
}

// ─── Personal Bests ───────────────────────────────────────────────────────────
// Stored in userPublicStats/{uid}.personalBests map: { "${subject}-${paperPath}": seconds }

export function pbKey(subject, paperPath) {
  return `${subject}-${paperPath}`;
}

export async function getPaperPB(uid, subject, paperPath) {
  const snap = await getDoc(doc(db, 'userPublicStats', uid));
  if (!snap.exists()) return null;
  const pbs = snap.data().personalBests ?? {};
  const val = pbs[pbKey(subject, paperPath)];
  return val !== undefined ? val : null;
}

async function maybeUpdatePB(uid, subject, paperPath, actualDurationSeconds) {
  if (!actualDurationSeconds || actualDurationSeconds <= 0 || !subject || !paperPath) return false;
  const key = pbKey(subject, paperPath);
  const statsRef = doc(db, 'userPublicStats', uid);
  const snap = await getDoc(statsRef);
  const currentPBs = snap.exists() ? (snap.data().personalBests ?? {}) : {};
  const currentPB = currentPBs[key] !== undefined ? currentPBs[key] : null;
  if (currentPB === null || actualDurationSeconds < currentPB) {
    await setDoc(statsRef, { personalBests: { [key]: actualDurationSeconds } }, { merge: true });
    return true;
  }
  return false;
}
