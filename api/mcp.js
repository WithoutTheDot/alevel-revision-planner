import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Firebase init (safe for hot-reload / multiple invocations)

function getDb() {
  if (!getApps().length) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
    initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  return getFirestore();
}

// Guide (loaded once at cold start)

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUIDE = readFileSync(join(__dirname, '../functions/CLAUDE_GUIDE.md'), 'utf8');

// MCP constants

const SERVER_INFO = { name: 'pastpapers-mcp', version: '1.0.0' };
const PROTOCOL_VERSION = '2024-11-05';

const TOOLS = [
  {
    name: 'get_revision_history',
    description: 'Returns a list of past papers the user has recently completed, with subject, grade, marks, time taken, and date.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of papers to return (default 20, max 50)' },
      },
    },
  },
  {
    name: 'get_upcoming_papers',
    description: 'Returns papers scheduled in the current and next few weeks that have not yet been completed.',
    inputSchema: {
      type: 'object',
      properties: {
        weeks: { type: 'number', description: 'How many weeks ahead to look (default 2)' },
      },
    },
  },
  {
    name: 'get_subjects',
    description: "Returns the user's subjects with labels, and per-subject paper completion counts.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_stats',
    description: "Returns the user's overall revision statistics: total papers completed, total study minutes, current streak, and XP.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_exam_timetable',
    description: "Returns the user's actual exam dates with days remaining until each exam.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_coverage_gaps',
    description: 'Returns completed papers grouped by subject and name — reveals which years or series are missing from revision.',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Filter to a specific subject ID (optional)' },
      },
    },
  },
  {
    name: 'get_review_queue',
    description: 'Returns topics the user has explicitly flagged for review, grouped by subject.',
    inputSchema: { type: 'object', properties: {} },
  },
];

const RESOURCES = [
  {
    uri: 'revision://guide',
    name: 'Revision Assistant Guide',
    description: 'Instructions and suggested use cases for this MCP server',
    mimeType: 'text/markdown',
  },
];

const PROMPTS = [
  { name: 'revision_overview',      description: 'Full picture of where revision stands right now' },
  { name: 'focus_today',            description: 'Decide what to work on today' },
  { name: 'grade_trends',           description: 'Analyse recent grade trends and spot patterns' },
  { name: 'review_topics',          description: 'Summarise topics flagged for review' },
  { name: 'subject_balance',        description: 'Check whether revision is spread evenly across subjects' },
  { name: 'exam_countdown',         description: 'Urgency check: time left per exam and what still needs doing' },
  { name: 'gap_analysis',           description: 'Find which paper years or series are missing' },
  { name: 'review_topic',           description: 'Deep-dive on a specific topic: explanation, mistakes, worked example' },
  { name: 'generate_question_sheet', description: 'Generate a printable HTML practice question sheet based on weak areas' },
];

const PROMPT_MESSAGES = {
  revision_overview: [{ role: 'user', content: { type: 'text', text: "Give me a full overview of where my revision stands. Fetch my stats, subjects, recent history, and upcoming papers, then summarise: what I've done, what's coming up, and anything that looks off-balance or worth flagging." } }],
  focus_today: [{ role: 'user', content: { type: 'text', text: "What should I work on today? Check my upcoming schedule and recent history, and give me a specific recommendation — which paper or subject to focus on and why." } }],
  grade_trends: [{ role: 'user', content: { type: 'text', text: "Fetch my recent revision history and analyse my grades. Are they improving, declining, or consistent? Are there any subjects or paper types where I'm noticeably weaker?" } }],
  review_topics: [{ role: 'user', content: { type: 'text', text: "Look at my recent revision history and pull out all the review topics I've flagged. Group them by subject and tell me which topics keep coming up — those are the ones I should drill." } }],
  subject_balance: [{ role: 'user', content: { type: 'text', text: "Check my subjects and revision history. Is my revision spread evenly across subjects, or am I spending too much time on some and neglecting others? Give me a concrete breakdown." } }],
  exam_countdown: [{ role: 'user', content: { type: 'text', text: "Fetch my exam timetable, upcoming papers, and revision history. For each upcoming exam: how many days left, how many papers are still scheduled before it, and based on my recent history for that subject, am I in good shape or behind? Flag anything urgent." } }],
  gap_analysis: [{ role: 'user', content: { type: 'text', text: "Fetch my coverage data and subjects. For each subject, tell me which paper years or series I have done versus which ones I have not touched. Identify the biggest gaps and suggest which ones to prioritise next." } }],
  review_topic: [{ role: 'user', content: { type: 'text', text: `First fetch my review queue and revision history to find my weakest topics.

Then pick the highest-priority topic and do a structured review covering:

1. **Core concept** — explain it clearly, assume I know the basics but keep it precise
2. **Where people go wrong** — the specific mistakes that show up in A-level marking
3. **Worked example** — walk through one problem step by step, showing every line of working
4. **Things to memorise** — any formulas, identities, or key facts I need at my fingertips
5. **Exam technique** — how to approach questions on this topic under time pressure

If I have multiple weak topics, list them at the start and ask which one to focus on first.` } }],
  generate_question_sheet: [{ role: 'user', content: { type: 'text', text: `Fetch my review queue, revision history, and subjects.

Identify my top weak topics (use review queue + recurring low grades from history).

Then generate a practice question sheet as a **complete, self-contained HTML document** that I can save and open in a browser.

Requirements for the HTML:
- Clean styling: white background, 16px body font, max-width 800px centred, print-friendly (@media print)
- Title: "Practice Question Sheet" with today's date
- One section per topic with a subject/topic heading
- 4–6 questions per topic, difficulty graduated from straightforward to exam-standard
- Each question numbered, with mark allocation e.g. [3 marks]
- Answers hidden using <details><summary>Show answer</summary>...</details>
- Full worked answer inside each details block — not just the final value
- Section subtotal and running total marks counter
- "Areas covered" summary at the bottom listing topics and question counts

Output ONLY the raw HTML — no markdown fences, no explanation before or after. Just the HTML starting with <!DOCTYPE html>.` } }],
};

// Auth

async function resolveUid(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  const key = auth.slice(7).trim();
  if (!key) return null;
  const db = getDb();
  const snap = await db.collectionGroup('settings').where('apiKey', '==', key).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].ref.parent.parent?.id || null;
}

// Tool implementations

function fmt(text) {
  return { content: [{ type: 'text', text }] };
}

async function getRevisionHistory(uid, args) {
  const db = getDb();
  const limit = Math.min(Number(args?.limit) || 20, 50);
  const snap = await db.collection('users').doc(uid).collection('completedPapers')
    .orderBy('completedAt', 'desc').limit(limit).get();

  if (snap.empty) return fmt('No revision history found.');
  return fmt(snap.docs.map((d) => {
    const p = d.data();
    const parts = [`${p.displayName || p.paperPath || 'Unknown'} (${p.subject || 'Unknown'})`];
    if (p.completedAt) parts.push(`on ${p.completedAt.slice(0, 10)}`);
    if (p.grade) parts.push(`grade: ${p.grade}`);
    if (p.marks != null) parts.push(`marks: ${p.marks}`);
    if (p.actualDurationSeconds) parts.push(`time: ${Math.round(p.actualDurationSeconds / 60)}min`);
    if (p.reviewTopics?.length) parts.push(`review topics: ${p.reviewTopics.join(', ')}`);
    return '• ' + parts.join(' | ');
  }).join('\n'));
}

async function getUpcomingPapers(uid, args) {
  const db = getDb();
  const weeks = Math.min(Number(args?.weeks) || 2, 6);
  const today = new Date();
  const daysToMonday = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  const results = [];
  for (let i = 0; i < weeks; i++) {
    const d = new Date(thisMonday);
    d.setDate(thisMonday.getDate() + i * 7);
    const weekId = d.toISOString().slice(0, 10);
    const snap = await db.collection('users').doc(uid).collection('weeklySchedules').doc(weekId).get();
    if (!snap.exists) continue;
    const pending = (snap.data().papers || []).filter((p) => !p.completed);
    if (!pending.length) continue;
    results.push(`Week of ${weekId}:`);
    pending.forEach((p) => results.push(`  • ${p.displayName || p.paperPath || 'Unknown'} (${p.subject || 'unknown'})`));
  }
  return fmt(results.length ? results.join('\n') : 'No upcoming papers found in the schedule.');
}

async function getSubjects(uid) {
  const db = getDb();
  const [profileSnap, statsSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('userPublicStats').doc(uid).get(),
  ]);
  const subjects = profileSnap.exists ? (profileSnap.data().subjects || []) : [];
  if (!subjects.length) return fmt('No subjects configured.');
  const counts = statsSnap.exists ? (statsSnap.data().subjectPapersCompleted || {}) : {};
  return fmt(subjects.map((s) => {
    const n = counts[s.id] || 0;
    return `• ${s.label} (${s.id}): ${n} paper${n !== 1 ? 's' : ''} completed`;
  }).join('\n'));
}

async function getStats(uid) {
  const db = getDb();
  const snap = await db.collection('userPublicStats').doc(uid).get();
  if (!snap.exists) return fmt('No stats found yet.');
  const d = snap.data();
  return fmt([
    `Papers completed: ${d.papersCompleted ?? 0}`,
    `Study time: ${d.studyMinutes ?? 0} minutes`,
    `Current streak: ${d.currentStreak ?? 0} days`,
    `XP: ${d.xp ?? 0}`,
    `Level: ${d.level ?? 1}`,
  ].join('\n'));
}

async function getExamTimetable(uid) {
  const db = getDb();
  const snap = await db.collection('users').doc(uid).collection('examTimetable')
    .orderBy('date', 'asc').get();
  if (snap.empty) return fmt('No exam dates added yet.');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return fmt(snap.docs.map((d) => {
    const e = d.data();
    const daysLeft = Math.round((new Date(e.date) - today) / 86400000);
    const when = daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? 'TODAY' : `${daysLeft} days away`;
    const parts = [`${e.paperLabel} (${e.subject})`, `date: ${e.date}`];
    if (e.time) parts.push(`time: ${e.time}`);
    if (e.durationMins) parts.push(`duration: ${e.durationMins}min`);
    parts.push(when);
    return '• ' + parts.join(' | ');
  }).join('\n'));
}

async function getCoverageGaps(uid, args) {
  const db = getDb();
  const subjectFilter = args?.subject || null;
  const snap = await db.collection('users').doc(uid).collection('completedPapers').get();
  const bySubject = {};
  for (const d of snap.docs) {
    const { subject, displayName, paperPath } = d.data();
    if (subjectFilter && subject !== subjectFilter) continue;
    const subj = subject || 'unknown';
    const name = displayName || paperPath || 'unknown';
    if (!bySubject[subj]) bySubject[subj] = new Set();
    bySubject[subj].add(name);
  }
  if (!Object.keys(bySubject).length) return fmt(subjectFilter ? `No completed papers for subject: ${subjectFilter}` : 'No completed papers found.');
  const lines = [];
  for (const [subj, names] of Object.entries(bySubject)) {
    lines.push(`${subj} (${names.size} distinct papers done):`);
    [...names].sort().forEach((n) => lines.push(`  • ${n}`));
  }
  return fmt(lines.join('\n'));
}

async function getReviewQueue(uid) {
  const db = getDb();
  const snap = await db.collection('users').doc(uid).collection('reviewQueue')
    .orderBy('addedAt', 'desc').get();
  if (snap.empty) return fmt('Review queue is empty.');
  const pending = snap.docs.filter((d) => d.data().status === 'pending');
  if (!pending.length) return fmt('No pending review topics.');
  const bySubject = {};
  for (const d of pending) {
    const { topic, subject, addedAt } = d.data();
    const subj = subject || 'unknown';
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push({ topic, addedAt });
  }
  const lines = [`${pending.length} pending review topic(s):`];
  for (const [subj, items] of Object.entries(bySubject)) {
    lines.push(`\n${subj}:`);
    items.forEach(({ topic, addedAt }) => lines.push(`  • ${topic}${addedAt ? ` (flagged ${addedAt.slice(0, 10)})` : ''}`));
  }
  return fmt(lines.join('\n'));
}

// JSON-RPC router

function rpcErr(code, message) {
  const e = new Error(message);
  e.rpcCode = code;
  return e;
}

async function handleRpc(method, params, uid) {
  if (method === 'initialize') {
    return { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: SERVER_INFO };
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list')     return { tools: TOOLS };
  if (method === 'resources/list') return { resources: RESOURCES };
  if (method === 'prompts/list')   return { prompts: PROMPTS };

  if (method === 'resources/read') {
    if (params?.uri === 'revision://guide') return { contents: [{ uri: params.uri, mimeType: 'text/markdown', text: GUIDE }] };
    throw rpcErr(-32602, `Unknown resource: ${params?.uri}`);
  }

  if (method === 'prompts/get') {
    const messages = PROMPT_MESSAGES[params?.name];
    if (!messages) throw rpcErr(-32602, `Unknown prompt: ${params?.name}`);
    return { description: PROMPTS.find((p) => p.name === params.name)?.description || '', messages };
  }

  if (method === 'tools/call') {
    if (!uid) throw rpcErr(-32001, 'Unauthorized');
    const { name, arguments: args = {} } = params || {};
    switch (name) {
      case 'get_revision_history': return getRevisionHistory(uid, args);
      case 'get_upcoming_papers':  return getUpcomingPapers(uid, args);
      case 'get_subjects':         return getSubjects(uid);
      case 'get_stats':            return getStats(uid);
      case 'get_exam_timetable':   return getExamTimetable(uid);
      case 'get_coverage_gaps':    return getCoverageGaps(uid, args);
      case 'get_review_queue':     return getReviewQueue(uid);
      default: throw rpcErr(-32602, `Unknown tool: ${name}`);
    }
  }

  throw rpcErr(-32601, `Method not found: ${method}`);
}

// Vercel handler

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const body = req.body;
  const id = body?.id ?? null;

  try {
    const uid = await resolveUid(req);
    if (body?.method === 'tools/call' && !uid) {
      res.status(401).json({ jsonrpc: '2.0', id, error: { code: -32001, message: 'Invalid or missing API key' } });
      return;
    }
    const result = await handleRpc(body?.method, body?.params, uid);
    if (result === null) { res.status(204).end(); return; }
    res.status(200).json({ jsonrpc: '2.0', id, result });
  } catch (err) {
    console.error('[mcp]', err);
    res.status(200).json({ jsonrpc: '2.0', id, error: { code: err.rpcCode ?? -32603, message: err.message ?? 'Internal error' } });
  }
}
