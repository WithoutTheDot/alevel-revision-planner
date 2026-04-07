import { doc, getDocs, collection, setDoc, serverTimestamp, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../config';

/**
 * Rebuilds the userPublicStats document by scanning the canonical completedPapers log.
 * Fixes drift in studyMinutes, papersCompleted, and subject-specific counts.
 *
 * @param {string} uid User ID
 */
export async function rebuildUserPublicStatsFromCompletedPapers(uid) {
  const colRef = collection(db, 'users', uid, 'completedPapers');
  let papersCompleted = 0;
  let totalSeconds = 0;
  const subjectCounts = {};
  
  let lastDoc = null;
  while (true) {
    const q = lastDoc
      ? query(colRef, orderBy('__name__'), startAfter(lastDoc), limit(1000))
      : query(colRef, orderBy('__name__'), limit(1000));

    const snap = await getDocs(q);
    if (snap.empty) break;

    for (const d of snap.docs) {
      const data = d.data();
      papersCompleted++;
      
      const secs = data.actualDurationSeconds;
      if (typeof secs === 'number' && Number.isFinite(secs) && secs > 0) {
        totalSeconds += secs;
      }
      
      if (data.subject) {
        subjectCounts[data.subject] = (subjectCounts[data.subject] || 0) + 1;
      }
    }

    if (snap.docs.length < 1000) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  const statsRef = doc(db, 'userPublicStats', uid);
  await setDoc(statsRef, {
    papersCompleted,
    studyMinutes: Math.round(totalSeconds / 60),
    subjectPapersCompleted: subjectCounts,
    lastReconciled: serverTimestamp(),
  }, { merge: true });

  return { papersCompleted, studyMinutes: Math.round(totalSeconds / 60) };
}

/**
 * Produces per-week counts and study hours from completedPapers.
 * Stores results in users/{uid}/rollups/weekly.
 *
 * @param {string} uid User ID
 */
export async function computeWeeklyRollups(uid) {
  const colRef = collection(db, 'users', uid, 'completedPapers');
  const weeklyStats = {}; // { weekId: { count: number, seconds: number } }

  // We fetch all to build the full history of rollups
  const snap = await getDocs(colRef);
  
  snap.forEach((d) => {
    const data = d.data();
    if (!data.completedAt) return;
    
    // completedAt is ISO string. We need to find the Monday of that week.
    const date = new Date(data.completedAt);
    const day = date.getUTCDay();
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setUTCDate(diff));
    const weekId = monday.toISOString().slice(0, 10);

    if (!weeklyStats[weekId]) {
      weeklyStats[weekId] = { count: 0, seconds: 0 };
    }
    weeklyStats[weekId].count++;
    if (typeof data.actualDurationSeconds === 'number') {
      weeklyStats[weekId].seconds += data.actualDurationSeconds;
    }
  });

  // Write each week to the rollups subcollection
  for (const [weekId, stats] of Object.entries(weeklyStats)) {
    const rollupRef = doc(db, 'users', uid, 'rollups', 'weekly', 'weeks', weekId);
    await setDoc(rollupRef, {
      weekId,
      papersCompleted: stats.count,
      studyMinutes: Math.round(stats.seconds / 60),
      lastUpdated: serverTimestamp(),
    });
  }
}
