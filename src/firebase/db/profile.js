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
  orderBy,
} from 'firebase/firestore';
import { db } from '../config';
import { DEFAULT_SUBJECTS } from '../../lib/allSubjects';

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
