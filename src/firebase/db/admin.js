import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { xpToLevel } from '../../lib/badges';
import { generateClassCode } from './social';

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

/**
 * Deletes all Firestore data for a user. Call this before deleteUser() (Firebase Auth).
 * Also removes the user from any classes they belong to.
 */
export async function deleteAllUserData(userId) {
  const subcollections = [
    'profile', 'examTimetable', 'settings', 'weekTemplates',
    'termCalendar', 'weeklySchedules', 'completedPapers', 'nudges', 'badges', 'reviewQueue',
  ];

  // Delete all subcollection docs
  const docDeletions = [];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, 'users', userId, sub));
    snap.docs.forEach((d) => docDeletions.push(deleteDoc(d.ref)));
  }
  await Promise.all(docDeletions);

  // Delete top-level user stats doc
  await deleteDoc(doc(db, 'userPublicStats', userId));

  // Remove user from all classes they belong to
  const classSnap = await getDocs(
    query(collection(db, 'classes'), where('members', 'array-contains', userId))
  );
  await Promise.all(classSnap.docs.map((d) => updateDoc(d.ref, { members: arrayRemove(userId) })));
}

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

