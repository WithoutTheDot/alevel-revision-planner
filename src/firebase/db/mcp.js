import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config';

function randomApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Returns { keyHint, createdAt } — the full key is never returned after creation
export async function getMcpSettings(userId) {
  const snap = await getDoc(doc(db, 'users', userId, 'settings', 'mcp'));
  if (!snap.exists()) return null;
  const { keyHint, createdAt } = snap.data();
  return { keyHint, createdAt };
}

// Returns the full key exactly once — caller must display and discard it
export async function generateMcpApiKey(userId) {
  const apiKey = randomApiKey();
  const createdAt = new Date().toISOString();
  const keyHint = apiKey.slice(-4);
  await setDoc(doc(db, 'users', userId, 'settings', 'mcp'), { apiKey, keyHint, createdAt });
  return { apiKey, keyHint, createdAt };
}

export async function revokeMcpApiKey(userId) {
  await deleteDoc(doc(db, 'users', userId, 'settings', 'mcp'));
}
