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

export async function getMcpSettings(userId) {
  const snap = await getDoc(doc(db, 'users', userId, 'settings', 'mcp'));
  return snap.exists() ? snap.data() : null;
}

export async function generateMcpApiKey(userId) {
  // Remove old key from reverse-lookup collection if one exists
  const existing = await getMcpSettings(userId);
  if (existing?.apiKey) {
    await deleteDoc(doc(db, 'mcpApiKeys', existing.apiKey)).catch(() => {});
  }

  const apiKey = randomApiKey();
  const createdAt = new Date().toISOString();

  // Reverse-lookup: mcpApiKeys/{key} → { uid }
  await setDoc(doc(db, 'mcpApiKeys', apiKey), { uid: userId, createdAt });

  // User-side storage: users/{uid}/settings/mcp → { apiKey, createdAt }
  await setDoc(doc(db, 'users', userId, 'settings', 'mcp'), { apiKey, createdAt });

  return apiKey;
}

export async function revokeMcpApiKey(userId) {
  const existing = await getMcpSettings(userId);
  if (existing?.apiKey) {
    await deleteDoc(doc(db, 'mcpApiKeys', existing.apiKey)).catch(() => {});
  }
  await deleteDoc(doc(db, 'users', userId, 'settings', 'mcp'));
}
