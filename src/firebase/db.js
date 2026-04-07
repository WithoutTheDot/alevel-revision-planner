import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { DEFAULT_SUBJECTS } from '../lib/allSubjects';
import { BADGE_DEFS, xpToLevel } from '../lib/badges';

// ─── User Profile ────────────────────────────────────────────────────────────
// Schema: { subjects: [{ id, label, color, text, light }], onboardingComplete: boolean }

export async function getUserProfile(userId) {
  const snap = await getDoc(doc(db, 'users', userId, 'profile', 'main'));
  return snap.exists() ? snap.data() : null;
}

export async function saveUserProfile(userId, data) {
  await setDoc(doc(db, 'users', userId, 'profile', 'main'), data, { merge: true });
}

export async function initDefaultProfile(userId) {
  const ref = doc(db, 'users', userId, 'profile', 'main');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      subjects: DEFAULT_SUBJECTS,
      onboardingComplete: false,
    });
  }
}

// ─── Exam Timetable ──────────────────────────────────────────────────────────
// Subcollection: users/{uid}/examTimetable/{autoId}
// Schema: { subject, paperLabel, date, time, durationMins }

export async function getExamTimetable(userId) {
  const snap = await getDocs(
    query(collection(db, 'users', userId, 'examTimetable'), orderBy('date', 'asc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addExamEntry(userId, entry) {
  return addDoc(collection(db, 'users', userId, 'examTimetable'), entry);
}

export async function updateExamEntry(userId, id, data) {
  await updateDoc(doc(db, 'users', userId, 'examTimetable', id), data);
}

export async function deleteExamEntry(userId, id) {
  await deleteDoc(doc(db, 'users', userId, 'examTimetable', id));
}

// ─── User Settings ─────────────────────────────────────────────────────────

export async function getUserSettings(userId) {
  const snap = await getDoc(doc(db, 'users', userId, 'settings', 'main'));
  return snap.exists() ? snap.data() : {
    defaultPaperDuration: 90,
    breakDuration: 10,
    calendarStartHour: 6,
    calendarEndHour: 23,
    reviewModeEnabled: true,
  };
}

export async function updateUserSettings(userId, data) {
  await setDoc(doc(db, 'users', userId, 'settings', 'main'), data, { merge: true });
}

// ─── Paper Durations ────────────────────────────────────────────────────────
// Stored as a single map doc: { paperPath: minutes, _default: 90 }
// Individual overrides are merged in; _default is the fallback.

export async function getPaperDurations(userId) {
  const snap = await getDoc(doc(db, 'users', userId, 'settings', 'durations'));
  return snap.exists() ? snap.data() : { _default: 120 };
}

export async function setPaperDuration(userId, paperPath, minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw new Error('Duration must be a positive number');
  }
  await setDoc(
    doc(db, 'users', userId, 'settings', 'durations'),
    { [paperPath]: minutes },
    { merge: true }
  );
}

export async function initDefaultDurations(userId) {
  const ref = doc(db, 'users', userId, 'settings', 'durations');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { _default: 120 });
  }
}

// ─── Week Templates ─────────────────────────────────────────────────────────
// Schema per plan:
// { templateName, maxPapersPerSubject, mostCommonPapersPerSubject, maxTotalPapers,
//   breakDuration, subjects, timeBlocks: [{ day, startTime, endTime }] }

export async function getWeekTemplates(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'weekTemplates'));
  const templates = {};
  snap.forEach((d) => { templates[d.id] = { id: d.id, ...d.data() }; });
  return templates;
}

export async function getWeekTemplate(userId, templateId) {
  const snap = await getDoc(doc(db, 'users', userId, 'weekTemplates', templateId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveWeekTemplate(userId, templateId, data) {
  await setDoc(doc(db, 'users', userId, 'weekTemplates', templateId), data);
}

export async function deleteWeekTemplate(userId, templateId) {
  await deleteDoc(doc(db, 'users', userId, 'weekTemplates', templateId));
}

const DEFAULT_TEMPLATES = {
  'week-a': {
    templateName: 'Week A',
    subjects: ['maths', 'furtherMaths', 'physics', 'computerScience'],
    maxPapersPerSubject: 6,
    mostCommonPapersPerSubject: 2,
    maxTotalPapers: 16,
    breakDuration: 10,
    timeBlocks: [
      { day: 'Monday',    startTime: '09:00', endTime: '12:00' },
      { day: 'Monday',    startTime: '14:00', endTime: '17:00' },
      { day: 'Tuesday',   startTime: '09:00', endTime: '12:00' },
      { day: 'Wednesday', startTime: '09:00', endTime: '12:00' },
      { day: 'Wednesday', startTime: '14:00', endTime: '17:00' },
      { day: 'Thursday',  startTime: '09:00', endTime: '12:00' },
      { day: 'Friday',    startTime: '09:00', endTime: '12:00' },
    ],
  },
  'week-b': {
    templateName: 'Week B',
    subjects: ['maths', 'furtherMaths', 'physics', 'computerScience'],
    maxPapersPerSubject: 5,
    mostCommonPapersPerSubject: 2,
    maxTotalPapers: 14,
    breakDuration: 10,
    timeBlocks: [
      { day: 'Monday',  startTime: '09:00', endTime: '12:00' },
      { day: 'Tuesday', startTime: '09:00', endTime: '12:00' },
      { day: 'Thursday',startTime: '09:00', endTime: '12:00' },
      { day: 'Friday',  startTime: '09:00', endTime: '12:00' },
    ],
  },
  'holiday': {
    templateName: 'Holiday',
    subjects: ['maths', 'furtherMaths', 'physics', 'computerScience'],
    maxPapersPerSubject: 8,
    mostCommonPapersPerSubject: 3,
    maxTotalPapers: 20,
    breakDuration: 10,
    timeBlocks: [
      { day: 'Monday',    startTime: '09:00', endTime: '12:00' },
      { day: 'Monday',    startTime: '14:00', endTime: '17:00' },
      { day: 'Tuesday',   startTime: '09:00', endTime: '12:00' },
      { day: 'Tuesday',   startTime: '14:00', endTime: '17:00' },
      { day: 'Wednesday', startTime: '09:00', endTime: '12:00' },
      { day: 'Wednesday', startTime: '14:00', endTime: '17:00' },
      { day: 'Thursday',  startTime: '09:00', endTime: '12:00' },
      { day: 'Thursday',  startTime: '14:00', endTime: '17:00' },
      { day: 'Friday',    startTime: '09:00', endTime: '12:00' },
      { day: 'Friday',    startTime: '14:00', endTime: '17:00' },
    ],
  },
};

export async function initDefaultTemplates(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'weekTemplates'));
  if (snap.empty) {
    for (const [id, data] of Object.entries(DEFAULT_TEMPLATES)) {
      await setDoc(doc(db, 'users', userId, 'weekTemplates', id), data);
    }
  }
}

// ─── Term Calendar ──────────────────────────────────────────────────────────
// Subcollection: users/{userId}/termCalendar/{mondayDateStr}
// Each doc: { weekStart: string, weekType: string, templateId: string }

export async function getTermCalendar(userId) {
  const snap = await getDocs(collection(db, 'users', userId, 'termCalendar'));
  const calendar = {};
  snap.forEach((d) => { calendar[d.id] = d.data(); });
  return calendar;
}

export async function setWeekType(userId, mondayDateStr, weekType, templateId) {
  await setDoc(doc(db, 'users', userId, 'termCalendar', mondayDateStr), {
    weekStart: mondayDateStr,
    weekType,
    templateId,
  });
}

export async function clearWeekType(userId, mondayDateStr) {
  await deleteDoc(doc(db, 'users', userId, 'termCalendar', mondayDateStr));
}

// ─── Weekly Schedules ───────────────────────────────────────────────────────

export async function getWeeklySchedule(userId, weekId) {
  const snap = await getDoc(doc(db, 'users', userId, 'weeklySchedules', weekId));
  return snap.exists() ? snap.data() : null;
}

export async function dismissOverdueWeek(userId, weekId) {
  const ref = doc(db, 'users', userId, 'weeklySchedules', weekId);
  await updateDoc(ref, { dismissedOverdue: true });
}

export async function saveWeeklySchedule(userId, weekId, data) {
  await setDoc(doc(db, 'users', userId, 'weeklySchedules', weekId), data);
}

export async function updatePaper(userId, weekId, paperIndex, updates) {
  const ref = doc(db, 'users', userId, 'weeklySchedules', weekId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const papers = [...(snap.data().papers || [])];
  papers[paperIndex] = { ...papers[paperIndex], ...updates };
  await updateDoc(ref, { papers });
}

export async function deletePaper(userId, weekId, paperIndex) {
  const ref = doc(db, 'users', userId, 'weeklySchedules', weekId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const papers = [...(data.papers || [])];
  papers.splice(paperIndex, 1);
  await setDoc(ref, { ...data, papers });
}

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
 * Returns paperPath strings completed in the past `weeksBack` weeks before `beforeDate`.
 * Uses a simple date-range query (no orderBy to avoid composite index requirement).
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
    reviewTopics: paperData.reviewTopics ?? [],
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

function generateClassCode() {
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

// ─── Active Session ───────────────────────────────────────────────────────────
// Single doc at users/{uid}/activeSession/current

export async function getActiveSession(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'activeSession', 'current'));
  return snap.exists() ? snap.data() : null;
}

export async function startActiveSession(uid, sessionData) {
  await setDoc(doc(db, 'users', uid, 'activeSession', 'current'), {
    ...sessionData,
    startedAt: serverTimestamp(),
    isRunning: true,
    isPaused: false,
    elapsedSeconds: 0,
  });
}

export async function pauseActiveSession(uid, elapsedSeconds) {
  await updateDoc(doc(db, 'users', uid, 'activeSession', 'current'), {
    elapsedSeconds,
    isPaused: true,
    isRunning: false,
    pausedAt: serverTimestamp(),
  });
}

export async function resumeActiveSession(uid, elapsedSeconds) {
  await updateDoc(doc(db, 'users', uid, 'activeSession', 'current'), {
    elapsedSeconds,
    startedAt: serverTimestamp(),
    isRunning: true,
    isPaused: false,
    pausedAt: null,
  });
}

export async function clearActiveSession(uid) {
  await deleteDoc(doc(db, 'users', uid, 'activeSession', 'current'));
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

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function getIsAdmin(uid) {
  const snap = await getDoc(doc(db, 'admins', uid));
  return snap.exists();
}

export async function getAllPublicStats() {
  const snap = await getDocs(collection(db, 'userPublicStats'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function getAllClasses() {
  const snap = await getDocs(collection(db, 'classes'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function adminGetUserCompletions(uid, limitCount = 20) {
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'completedPapers'),
      orderBy('completedAt', 'desc'),
      limit(limitCount)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function adminOverrideUserStats(uid, { xp, studyMinutes, papersCompleted }) {
  const updates = { lastUpdated: serverTimestamp() };
  if (xp !== undefined) { updates.xp = xp; updates.level = xpToLevel(xp); }
  if (studyMinutes !== undefined) updates.studyMinutes = studyMinutes;
  if (papersCompleted !== undefined) updates.papersCompleted = papersCompleted;
  await setDoc(doc(db, 'userPublicStats', uid), updates, { merge: true });
}

export async function adminAddUserToClass(classId, uid) {
  await updateDoc(doc(db, 'classes', classId), { members: arrayUnion(uid) });
}

export async function adminRemoveUserFromClass(classId, uid) {
  await updateDoc(doc(db, 'classes', classId), { members: arrayRemove(uid) });
}

export async function adminRegenerateClassCode(classId) {
  const code = generateClassCode();
  await updateDoc(doc(db, 'classes', classId), { code });
  return code;
}

// ─── Review Queue ─────────────────────────────────────────────────────────────
// Subcollection: users/{uid}/reviewQueue/{autoId}
// Schema: { topic, subject, addedAt, status, scheduledWeekId, completedAt }

/**
 * Upsert review topics into the queue after paper completion.
 * If a topic+subject combo already exists with status "pending", skip duplicate.
 */
export async function addReviewTopics(userId, topics, subject) {
  if (!topics || topics.length === 0) return;
  // Fetch existing pending items to avoid duplicates
  const existingSnap = await getDocs(
    query(
      collection(db, 'users', userId, 'reviewQueue'),
      where('status', '==', 'pending'),
      where('subject', '==', subject)
    )
  );
  const existingTopics = new Set(existingSnap.docs.map((d) => d.data().topic));
  const batch = writeBatch(db);
  for (const topic of topics) {
    if (existingTopics.has(topic)) continue;
    const ref = doc(collection(db, 'users', userId, 'reviewQueue'));
    batch.set(ref, {
      topic,
      subject,
      addedAt: new Date().toISOString(),
      status: 'pending',
      scheduledWeekId: null,
      completedAt: null,
    });
  }
  await batch.commit();
}

export async function getReviewQueue(userId) {
  const snap = await getDocs(
    query(collection(db, 'users', userId, 'reviewQueue'), orderBy('addedAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateReviewQueueItem(userId, itemId, updates) {
  await updateDoc(doc(db, 'users', userId, 'reviewQueue', itemId), updates);
}

export async function deleteReviewQueueItem(userId, itemId) {
  await deleteDoc(doc(db, 'users', userId, 'reviewQueue', itemId));
}

/**
 * Compute topic frequency from an array of completed paper objects.
 * Returns topics sorted by count descending: [{ topic, subject, count }]
 * Optionally filter by subject.
 */
export function computeTopicFrequency(papers, subjectFilter) {
  const counts = {};
  const subjectCount = {};
  for (const paper of papers) {
    if (!Array.isArray(paper.reviewTopics) || paper.reviewTopics.length === 0) continue;
    if (subjectFilter && paper.subject !== subjectFilter) continue;
    for (const topic of paper.reviewTopics) {
      counts[topic] = (counts[topic] ?? 0) + 1;
      if (!subjectCount[topic]) subjectCount[topic] = {};
      subjectCount[topic][paper.subject] = (subjectCount[topic][paper.subject] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([topic, count]) => {
      const subjectEntries = Object.entries(subjectCount[topic] ?? {});
      const dominantSubject = subjectEntries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { topic, count, subject: dominantSubject };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── Data Export ─────────────────────────────────────────────────────────────

export async function exportAllUserData(userId) {
  const [settings, durations, templatesSnap, termCalSnap, schedulesSnap, completedSnap] =
    await Promise.all([
      getDoc(doc(db, 'users', userId, 'settings', 'main')),
      getDoc(doc(db, 'users', userId, 'settings', 'durations')),
      getDocs(collection(db, 'users', userId, 'weekTemplates')),
      getDocs(collection(db, 'users', userId, 'termCalendar')),
      getDocs(collection(db, 'users', userId, 'weeklySchedules')),
      getDocs(collection(db, 'users', userId, 'completedPapers')),
    ]);

  const templates = {};
  templatesSnap.forEach((d) => { templates[d.id] = d.data(); });
  const termCalendar = {};
  termCalSnap.forEach((d) => { termCalendar[d.id] = d.data(); });
  const schedules = {};
  schedulesSnap.forEach((d) => { schedules[d.id] = d.data(); });
  const completedPapers = completedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    exportedAt: new Date().toISOString(),
    settings: settings.exists() ? settings.data() : {},
    durations: durations.exists() ? durations.data() : {},
    templates,
    termCalendar,
    schedules,
    completedPapers,
  };
}

