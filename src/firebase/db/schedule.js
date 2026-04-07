import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config';

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
