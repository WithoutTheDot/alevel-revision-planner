import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { BADGE_DEFS, xpToLevel } from '../../lib/badges';

// ─── Streaks ─────────────────────────────────────────────────────────────────

export async function updateStreak(uid) {
  const ref = doc(db, 'userPublicStats', uid);
  const snap = await getDoc(ref);
  const today = new Date().toISOString().slice(0, 10);
  const data = snap.exists() ? snap.data() : {};
  const last = data.lastStudyDate ?? '';
  const current = data.currentStreak ?? 0;
  const longest = data.longestStreak ?? 0;

  if (last === today) return; // already counted today
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const newStreak = last === yStr ? current + 1 : 1;

  await setDoc(ref, {
    currentStreak: newStreak,
    longestStreak: Math.max(longest, newStreak),
    lastStudyDate: today,
  }, { merge: true });
}

// ─── XP & Badges ─────────────────────────────────────────────────────────────

/**
 * Awards XP and unlocks any newly earned badges.
 * Returns { xpEarned, newBadges }.
 */
export async function awardXpAndBadges(uid, paperData, updatedStats) {
  // Base XP
  const base = 25;
  let xpEarned = base;
  // Grade bonus
  const gradeBonus = (paperData.grade === 'A' || paperData.grade === 'A*') ? 25 : 0;
  xpEarned += gradeBonus;
  // Timer bonus: proportional to how much faster than expected, capped at +50
  let timeBonus = 0;
  if (paperData.timeTaken != null && paperData.expectedTime != null
      && paperData.timeTaken < paperData.expectedTime && paperData.expectedTime > 0) {
    const pctFaster = (paperData.expectedTime - paperData.timeTaken) / paperData.expectedTime;
    timeBonus = Math.min(50, Math.round(pctFaster * 100));
  }
  xpEarned += timeBonus;
  // Streak bonuses (only on exact milestone hits)
  const streak = updatedStats.currentStreak ?? 0;
  if (streak === 7) xpEarned += 50;
  if (streak === 30) xpEarned += 150;

  // Build context for badge checks
  const papersCompleted = (updatedStats.papersCompleted ?? 0);
  const longestStreak = (updatedStats.longestStreak ?? 0);
  const existingBadgeIds = updatedStats.badgeIds ?? [];

  // Subject count for subject-mastery badge
  let subjectCounts = {};
  try {
    const colRef = collection(db, 'users', uid, 'completedPapers');
    const subSnap = await getDocs(query(colRef, where('subject', '==', paperData.subject), limit(21)));
    subjectCounts[paperData.subject] = subSnap.size;
  } catch (_) { /* best-effort */ }

  const ctx = { papersCompleted, longestStreak, subjectCounts };

  // Filter to newly unlocked badges
  const newBadgeDefs = BADGE_DEFS.filter(
    (b) => !existingBadgeIds.includes(b.id) && b.check(ctx)
  );

  // Add badge XP
  const badgeXp = newBadgeDefs.reduce((sum, b) => sum + b.xpReward, 0);
  const totalXp = xpEarned + badgeXp;

  // Read current XP to compute new total
  const statsRef = doc(db, 'userPublicStats', uid);
  const statsSnap = await getDoc(statsRef);
  const currentXp = statsSnap.exists() ? (statsSnap.data().xp ?? 0) : 0;
  const newXp = currentXp + totalXp;
  const newLevel = xpToLevel(newXp);

  // Update public stats
  const newBadgeIds = newBadgeDefs.map((b) => b.id);
  const statsUpdate = {
    xp: increment(totalXp),
    level: newLevel,
    lastUpdated: serverTimestamp(),
  };
  if (newBadgeIds.length > 0) {
    statsUpdate.badgeIds = arrayUnion(...newBadgeIds);
  }
  await updateDoc(statsRef, statsUpdate);

  // Write badge docs
  for (const b of newBadgeDefs) {
    await setDoc(doc(db, 'users', uid, 'badges', b.id), {
      badgeId: b.id,
      earnedAt: new Date().toISOString(),
      xpAwarded: b.xpReward,
    });
  }

  return { xpEarned: totalXp, newBadges: newBadgeDefs, breakdown: { base, grade: gradeBonus, time: timeBonus, badge: badgeXp } };
}

export async function getUserBadges(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'badges'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Public Stats ────────────────────────────────────────────────────────────

export async function updateDisplayName(uid, displayName) {
  await Promise.all([
    setDoc(doc(db, 'users', uid, 'profile', 'main'), { displayName }, { merge: true }),
    setDoc(doc(db, 'userPublicStats', uid), { displayName }, { merge: true }),
  ]);
}

export async function initPublicStats(uid, displayName) {
  const ref = doc(db, 'userPublicStats', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      papersCompleted: 0,
      studyMinutes: 0,
      xp: 0,
      level: 1,
      badgeIds: [],
      lastUpdated: serverTimestamp(),
    });
  }
}

export async function updatePublicStats(uid, papersToAdd, minutesToAdd, subject) {
  const ref = doc(db, 'userPublicStats', uid);
  const data = {
    papersCompleted: increment(papersToAdd),
    studyMinutes: increment(minutesToAdd),
    lastUpdated: serverTimestamp(),
  };
  const fields = ['papersCompleted', 'studyMinutes', 'lastUpdated'];
  if (subject) {
    data.subjectPapersCompleted = { [subject]: increment(papersToAdd) };
    fields.push(`subjectPapersCompleted.${subject}`);
  }
  await setDoc(ref, data, { mergeFields: fields });
}

/**
 * Rebuild subjectPapersCompleted from the user's completedPapers history.
 * Safe to call repeatedly — only writes if counts have changed.
 */
export async function rebuildSubjectStats(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'completedPapers'));
  const counts = {};
  for (const d of snap.docs) {
    const subject = d.data().subject;
    if (subject) counts[subject] = (counts[subject] ?? 0) + 1;
  }
  if (Object.keys(counts).length === 0) return;
  const statsRef = doc(db, 'userPublicStats', uid);
  const mergeFields = Object.keys(counts).map((s) => `subjectPapersCompleted.${s}`);
  const subjectPapersCompleted = counts;
  await setDoc(statsRef, { subjectPapersCompleted }, { mergeFields });
}

// ─── Classes ─────────────────────────────────────────────────────────────────

export function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createClass(uid, displayName, className, subject) {
  await initPublicStats(uid, displayName);
  let code;
  let attempts = 0;
  while (attempts < 10) {
    code = generateClassCode();
    const existing = await getDocs(query(collection(db, 'classes'), where('code', '==', code)));
    if (existing.empty) break;
    attempts++;
  }
  const ref = await addDoc(collection(db, 'classes'), {
    code,
    name: className,
    subject: subject ?? null,
    createdAt: serverTimestamp(),
    members: [uid],
  });
  return { id: ref.id, code };
}

export async function joinClass(uid, displayName, code) {
  await initPublicStats(uid, displayName);
  const snap = await getDocs(query(collection(db, 'classes'), where('code', '==', code.toUpperCase())));
  if (snap.empty) throw new Error('Class not found. Check the code and try again.');
  const classDoc = snap.docs[0];
  if (classDoc.data().members.includes(uid)) return classDoc.id;
  await updateDoc(doc(db, 'classes', classDoc.id), { members: arrayUnion(uid) });
  return classDoc.id;
}

export async function leaveClass(uid, classId) {
  const ref = doc(db, 'classes', classId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const members = snap.data().members.filter((m) => m !== uid);
  if (members.length === 0) {
    await deleteDoc(ref);
  } else {
    await updateDoc(ref, { members: arrayRemove(uid) });
  }
}

export async function getUserClasses(uid) {
  const snap = await getDocs(query(collection(db, 'classes'), where('members', 'array-contains', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getClass(classId) {
  const snap = await getDoc(doc(db, 'classes', classId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getClassLeaderboard(classId) {
  const classData = await getClass(classId);
  if (!classData) return { subject: null, entries: [] };
  const members = classData.members ?? [];
  const subject = classData.subject ?? null;

  const stats = await Promise.all(
    members.map(async (uid) => {
      const snap = await getDoc(doc(db, 'userPublicStats', uid));
      const base = snap.exists()
        ? { uid, ...snap.data() }
        : { uid, displayName: 'Unknown', papersCompleted: 0, studyMinutes: 0 };
      if (subject) {
        base.papersCompleted = base.subjectPapersCompleted?.[subject] ?? 0;
      }
      return base;
    })
  );
  return {
    subject,
    entries: stats.sort((a, b) =>
      b.papersCompleted - a.papersCompleted || b.studyMinutes - a.studyMinutes
    ),
  };
}

// ─── Nudges ──────────────────────────────────────────────────────────────────

export async function sendNudge(toUid, fromDisplayName) {
  await addDoc(collection(db, 'users', toUid, 'nudges'), {
    fromDisplayName,
    sentAt: serverTimestamp(),
  });
}

export async function getPendingNudges(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'nudges'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function clearNudge(uid, nudgeId) {
  await deleteDoc(doc(db, 'users', uid, 'nudges', nudgeId));
}
