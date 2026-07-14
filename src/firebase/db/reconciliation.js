import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp, query, orderBy, limit, startAfter, arrayUnion, increment, updateDoc } from 'firebase/firestore';
import { format, startOfWeek, parseISO } from 'date-fns';
import { db } from '../config';
import { BADGE_DEFS, xpToLevel } from '../../lib/badges';

// rebuilds userPublicStats from the completedPapers log, fixes any drift in the counters
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

// safe to call repeatedly, only awards badges that are missing
export async function reconcileBadgesForUser(uid) {
  const colRef = collection(db, 'users', uid, 'completedPapers');
  let papersCompleted = 0;
  const subjectCounts = {};

  let lastDoc = null;
  while (true) {
    const q = lastDoc
      ? query(colRef, orderBy('__name__'), startAfter(lastDoc), limit(1000))
      : query(colRef, orderBy('__name__'), limit(1000));
    const snap = await getDocs(q);
    if (snap.empty) break;
    for (const d of snap.docs) {
      papersCompleted++;
      if (d.data().subject) subjectCounts[d.data().subject] = (subjectCounts[d.data().subject] || 0) + 1;
    }
    if (snap.docs.length < 1000) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  const statsRef = doc(db, 'userPublicStats', uid);
  const statsSnap = await getDoc(statsRef);
  const stats = statsSnap.exists() ? statsSnap.data() : {};
  const longestStreak = stats.longestStreak ?? 0;
  const existingBadgeIds = stats.badgeIds ?? [];

  const ctx = { papersCompleted, longestStreak, subjectCounts };

  const missing = BADGE_DEFS.filter(
    (b) => !existingBadgeIds.includes(b.id) && b.check(ctx)
  );

  if (missing.length === 0) return { newBadges: [], xpAwarded: 0 };

  const xpAwarded = missing.reduce((sum, b) => sum + b.xpReward, 0);
  const newBadgeIds = missing.map((b) => b.id);

  const currentXp = stats.xp ?? 0;
  const newXp = currentXp + xpAwarded;
  await updateDoc(statsRef, {
    xp: increment(xpAwarded),
    level: xpToLevel(newXp),
    badgeIds: arrayUnion(...newBadgeIds),
    lastUpdated: serverTimestamp(),
  });

  for (const b of missing) {
    await setDoc(doc(db, 'users', uid, 'badges', b.id), {
      badgeId: b.id,
      earnedAt: new Date().toISOString(),
      xpAwarded: b.xpReward,
    }, { merge: true });
  }

  return { newBadges: newBadgeIds, xpAwarded };
}

export async function computeWeeklyRollups(uid) {
  const colRef = collection(db, 'users', uid, 'completedPapers');
  const weeklyStats = {}; // { weekId: { count: number, seconds: number } }

  const snap = await getDocs(colRef);
  
  snap.forEach((d) => {
    const data = d.data();
    if (!data.completedAt) return;
    
    // completedAt is ISO string. Use date-fns for consistency with the rest of the app.
    const monday = startOfWeek(parseISO(data.completedAt), { weekStartsOn: 1 });
    const weekId = format(monday, 'yyyy-MM-dd');

    if (!weeklyStats[weekId]) {
      weeklyStats[weekId] = { count: 0, seconds: 0 };
    }
    weeklyStats[weekId].count++;
    if (typeof data.actualDurationSeconds === 'number') {
      weeklyStats[weekId].seconds += data.actualDurationSeconds;
    }
  });

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
