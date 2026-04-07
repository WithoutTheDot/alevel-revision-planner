import {
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config';

/**
 * Upsert review topics into the queue.
 * If a topic+subject combo already exists with status "pending", skip duplicate.
 */
export async function addReviewTopics(userId, topics, subject) {
  if (!topics || topics.length === 0) return;
  if (!subject) return;

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
    if (!topic) continue;
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

function normaliseTopic(t) {
  return String(t ?? '').trim().toLowerCase();
}

function chunk10(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 10) out.push(arr.slice(i, i + 10));
  return out;
}

/**
 * Sync reviewQueue after editing a completion's reviewTopics.
 *
 * Policy:
 * - Adds new topics as pending items
 * - Removes topics by deleting matching *pending* items only (scheduled/done are preserved)
 */
export async function syncReviewQueueForCompletionEdit(userId, { subject, prevTopics, nextTopics }) {
  if (!subject) return;
  const prev = new Set((Array.isArray(prevTopics) ? prevTopics : []).map(normaliseTopic).filter(Boolean));
  const next = new Set((Array.isArray(nextTopics) ? nextTopics : []).map(normaliseTopic).filter(Boolean));

  const added = [...next].filter((t) => !prev.has(t));
  const removed = [...prev].filter((t) => !next.has(t));

  if (added.length > 0) {
    await addReviewTopics(userId, added, subject);
  }

  if (removed.length === 0) return;

  const colRef = collection(db, 'users', userId, 'reviewQueue');
  for (const chunk of chunk10(removed)) {
    const q = query(
      colRef,
      where('status', '==', 'pending'),
      where('subject', '==', subject),
      where('topic', 'in', chunk)
    );
    const snap = await getDocs(q);
    if (snap.empty) continue;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
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
      const t = normaliseTopic(topic);
      if (!t) continue;
      counts[t] = (counts[t] ?? 0) + 1;
      if (!subjectCount[t]) subjectCount[t] = {};
      subjectCount[t][paper.subject] = (subjectCount[t][paper.subject] ?? 0) + 1;
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

