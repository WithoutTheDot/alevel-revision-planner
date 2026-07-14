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
import { syncReviewQueueForCompletionEdit } from './review';
import { cleanDisplayName } from '../../lib/paperPaths';

// sums from the completedPapers log directly, not the cached counters in userPublicStats
export async function getTotalStudySecondsFromCompletedPapers(userId) {
  const colRef = collection(db, 'users', userId, 'completedPapers');
  let total = 0;
  let lastDoc = null;

  while (true) {
    const q = lastDoc
      ? query(colRef, orderBy('__name__'), startAfter(lastDoc), limit(1000))
      : query(colRef, orderBy('__name__'), limit(1000));

    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const secs = d.data()?.actualDurationSeconds;
      if (typeof secs === 'number' && Number.isFinite(secs) && secs > 0) total += secs;
    }
    if (snap.docs.length < 1000) break;
    lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    if (!lastDoc) break;
  }

  return total;
}

export async function deleteCompletedPaper(userId, paperId) {
  await deleteDoc(doc(db, 'users', userId, 'completedPapers', paperId));
}

export async function updateCompletion(userId, paperId, updates) {
  const ref = doc(db, 'users', userId, 'completedPapers', paperId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const prevData = snap.data();
  const updateData = { marks: updates.marks ?? null, grade: updates.grade ?? null, comment: updates.comment ?? null };
  if ('actualDurationSeconds' in updates) {
    updateData.actualDurationSeconds = updates.actualDurationSeconds ?? null;
  }
  if ('reviewTopics' in updates) {
    updateData.reviewTopics = Array.isArray(updates.reviewTopics) ? updates.reviewTopics : [];
  }
  await updateDoc(ref, updateData);

  if ('reviewTopics' in updates) {
    await syncReviewQueueForCompletionEdit(userId, {
      subject: prevData.subject,
      prevTopics: prevData.reviewTopics,
      nextTopics: updates.reviewTopics,
    }).catch((e) => console.warn('Review queue sync failed (best-effort):', e));
  }
}

export async function getAllCompletedPaperPaths(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'completedPapers'));
  return snap.docs.map((d) => d.data().paperPath).filter(Boolean);
}

// keeps the most recent entry per paperPath if it was done more than once
export async function getCoverageData(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'completedPapers'));
  const map = new Map();
  for (const d of snap.docs) {
    const { paperPath, grade, completedAt } = d.data();
    if (!paperPath) continue;
    const existing = map.get(paperPath);
    if (!existing || completedAt > existing.completedAt) {
      map.set(paperPath, { grade: grade ?? null, completedAt: completedAt ?? null });
    }
  }
  return map;
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
  // don't re-award XP if this completion was already recorded once (stops XP farming via re-edits)
  let existingXpAwarded = false;
  if (paperData.existingDocId) {
    try {
      const existingSnap = await getDoc(doc(db, 'users', userId, 'completedPapers', paperData.existingDocId));
      if (existingSnap.exists() && existingSnap.data().xpAwarded === true) {
        existingXpAwarded = true;
      }
    } catch (e) { console.error('[papers] best-effort op failed:', e); }
  }

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
    reviewTopics: Array.isArray(paperData.reviewTopics) ? paperData.reviewTopics : [],
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

  if (existingXpAwarded) {
    return { xpEarned: 0, newBadges: [] };
  }

  await updateStreak(userId);

  let xpResult = { xpEarned: 0, newBadges: [] };
  const updatedSnap = await getDoc(doc(db, 'userPublicStats', userId));
  const updatedStats = updatedSnap.exists() ? updatedSnap.data() : {};
  const effectiveTimeTaken = paperData.actualDurationSeconds != null
    ? paperData.actualDurationSeconds / 60
    : paperData.timeTaken;
  xpResult = await awardXpAndBadges(userId, { ...paperData, timeTaken: effectiveTimeTaken }, updatedStats);

  let isPB = false;
  if (paperData.actualDurationSeconds && paperData.subject && paperData.paperPath) {
    isPB = await maybeUpdatePB(userId, paperData.subject, paperData.paperPath, paperData.actualDurationSeconds);
  }

  return { ...xpResult, isPB };
}

// caps at 3 XP-earning ad-hoc papers per day
export async function logAdhocPaper(userId, paperData) {
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
    reviewTopics: Array.isArray(paperData.reviewTopics) ? paperData.reviewTopics : [],
  });

  // no duration means 0, we don't fabricate study time
  const studyMinutesAdd = paperData.actualDurationSeconds != null
    ? Math.round(paperData.actualDurationSeconds / 60)
    : 0;

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

  if (todayCount >= 3) {
    return { xpEarned: 0, newBadges: [], capReached: true };
  }

  await updateStreak(userId);

  let xpResult = { xpEarned: 0, newBadges: [] };
  const updatedSnap = await getDoc(doc(db, 'userPublicStats', userId));
  const updatedStats = updatedSnap.exists() ? updatedSnap.data() : {};
  const effectiveTimeTaken = paperData.actualDurationSeconds != null
    ? paperData.actualDurationSeconds / 60
    : paperData.timeTaken;
  xpResult = await awardXpAndBadges(userId, { ...paperData, timeTaken: effectiveTimeTaken }, updatedStats);

  let isPB = false;
  if (paperData.actualDurationSeconds && paperData.subject && paperData.paperPath) {
    isPB = await maybeUpdatePB(userId, paperData.subject, paperData.paperPath, paperData.actualDurationSeconds);
  }

  return { ...xpResult, capReached: false, isPB };
}

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
    papers: docs.map((d) => { const p = { id: d.id, ...d.data() }; if (p.displayName) p.displayName = cleanDisplayName(p.displayName); return p; }),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

// users/{uid}/customPapers/{familyId} — { familyName, subject, yearStart, yearEnd, duration }
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

// userPublicStats/{uid}.personalBests map: { "${subject}-${paperPath}": seconds }
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
