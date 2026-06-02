const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

initializeApp();
const db = getFirestore();

// ── MCP protocol constants ────────────────────────────────────────────────────

const SERVER_INFO = { name: 'pastpapers-mcp', version: '1.0.0' };
const PROTOCOL_VERSION = '2024-11-05';

const GUIDE = fs.readFileSync(path.join(__dirname, 'CLAUDE_GUIDE.md'), 'utf8');

const TOOLS = [
  {
    name: 'get_revision_history',
    description:
      'Returns a list of past papers the user has recently completed, with subject, grade, marks, time taken, and date.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of papers to return (default 20, max 50)',
        },
      },
    },
  },
  {
    name: 'get_upcoming_papers',
    description:
      'Returns papers scheduled in the current and next few weeks that have not yet been completed.',
    inputSchema: {
      type: 'object',
      properties: {
        weeks: {
          type: 'number',
          description: 'How many weeks ahead to look (default 2)',
        },
      },
    },
  },
  {
    name: 'get_subjects',
    description:
      "Returns the user's subjects with labels, and per-subject paper completion counts.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_stats',
    description:
      "Returns the user's overall revision statistics: total papers completed, total study minutes, current streak, and XP.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_exam_timetable',
    description:
      "Returns the user's actual exam dates with days remaining until each exam. Essential for urgency-aware advice.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_coverage_gaps',
    description:
      'Returns completed papers grouped by subject, showing which specific paper names have been done. Use this to identify which years or paper types are missing from revision.',
    inputSchema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Filter to a specific subject ID (optional — omit for all subjects)',
        },
      },
    },
  },
  {
    name: 'get_review_queue',
    description:
      'Returns topics the user has explicitly flagged for review, grouped by subject. These are weak areas identified during past paper sessions.',
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
  {
    name: 'revision_overview',
    description: 'Get a full picture of where revision stands right now',
  },
  {
    name: 'focus_today',
    description: 'Decide what to work on today based on upcoming schedule and weak areas',
  },
  {
    name: 'grade_trends',
    description: 'Analyse recent grade trends and spot patterns in performance',
  },
  {
    name: 'review_topics',
    description: 'Summarise topics flagged for review across recent papers',
  },
  {
    name: 'subject_balance',
    description: 'Check whether revision time is spread evenly across subjects',
  },
  {
    name: 'review_topic',
    description: 'Deep-dive on a specific topic: explanation, common mistakes, worked examples',
  },
  {
    name: 'generate_question_sheet',
    description: 'Generate a printable HTML practice question sheet based on weak areas and review topics',
  },
  {
    name: 'exam_countdown',
    description: 'Urgency check: how much time is left per exam and what still needs doing',
  },
  {
    name: 'gap_analysis',
    description: 'Find which paper years or series are missing from revision history',
  },
];

// ── Auth ──────────────────────────────────────────────────────────────────────

async function resolveUid(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  const key = auth.slice(7).trim();
  if (!key) return null;
  const snap = await db.collection('mcpApiKeys').doc(key).get();
  if (!snap.exists) return null;
  return snap.data().uid || null;
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function getRevisionHistory(uid, args) {
  const limit = Math.min(Number(args?.limit) || 20, 50);
  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('completedPapers')
    .orderBy('completedAt', 'desc')
    .limit(limit)
    .get();

  const papers = snap.docs.map((d) => {
    const p = d.data();
    return {
      name: p.displayName || p.paperPath || 'Unknown paper',
      subject: p.subject || 'Unknown',
      completedAt: p.completedAt || null,
      grade: p.grade || null,
      marks: p.marks ?? null,
      durationMinutes: p.actualDurationSeconds ? Math.round(p.actualDurationSeconds / 60) : null,
      reviewTopics: p.reviewTopics?.length ? p.reviewTopics : null,
    };
  });

  return formatText(papers.length === 0
    ? 'No revision history found.'
    : papers.map((p) => {
        const parts = [`${p.name} (${p.subject})`];
        if (p.completedAt) parts.push(`on ${p.completedAt.slice(0, 10)}`);
        if (p.grade) parts.push(`grade: ${p.grade}`);
        if (p.marks != null) parts.push(`marks: ${p.marks}`);
        if (p.durationMinutes) parts.push(`time: ${p.durationMinutes}min`);
        if (p.reviewTopics) parts.push(`review topics: ${p.reviewTopics.join(', ')}`);
        return '• ' + parts.join(' | ');
      }).join('\n'));
}

async function getUpcomingPapers(uid, args) {
  const weeks = Math.min(Number(args?.weeks) || 2, 6);
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + daysToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  const weekIds = [];
  for (let i = 0; i < weeks; i++) {
    const d = new Date(thisMonday);
    d.setDate(thisMonday.getDate() + i * 7);
    weekIds.push(d.toISOString().slice(0, 10));
  }

  const results = [];
  for (const weekId of weekIds) {
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('weeklySchedules')
      .doc(weekId)
      .get();

    if (!snap.exists) continue;
    const { papers = [] } = snap.data();
    const pending = papers.filter((p) => !p.completed);
    if (pending.length === 0) continue;

    results.push(`Week of ${weekId}:`);
    for (const p of pending) {
      const name = p.displayName || p.paperPath || 'Unknown';
      results.push(`  • ${name} (${p.subject || 'unknown subject'})`);
    }
  }

  return formatText(results.length === 0
    ? 'No upcoming papers found in the schedule.'
    : results.join('\n'));
}

async function getSubjects(uid) {
  const profileSnap = await db.collection('users').doc(uid).get();
  const subjects = profileSnap.exists ? (profileSnap.data().subjects || []) : [];

  const statsSnap = await db.collection('userPublicStats').doc(uid).get();
  const subjectCounts = statsSnap.exists
    ? (statsSnap.data().subjectPapersCompleted || {})
    : {};

  if (subjects.length === 0) {
    return formatText('No subjects configured.');
  }

  const lines = subjects.map((s) => {
    const count = subjectCounts[s.id] || 0;
    return `• ${s.label} (${s.id}): ${count} paper${count !== 1 ? 's' : ''} completed`;
  });

  return formatText(lines.join('\n'));
}

async function getStats(uid) {
  const snap = await db.collection('userPublicStats').doc(uid).get();
  if (!snap.exists) {
    return formatText('No stats found yet.');
  }
  const d = snap.data();
  const lines = [
    `Papers completed: ${d.papersCompleted ?? 0}`,
    `Study time: ${d.studyMinutes ?? 0} minutes`,
    `Current streak: ${d.currentStreak ?? 0} days`,
    `XP: ${d.xp ?? 0}`,
    `Level: ${d.level ?? 1}`,
  ];
  return formatText(lines.join('\n'));
}

async function getExamTimetable(uid) {
  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('examTimetable')
    .orderBy('date', 'asc')
    .get();

  if (snap.empty) return formatText('No exam dates added yet.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lines = snap.docs.map((d) => {
    const e = d.data();
    const examDate = new Date(e.date);
    examDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.round((examDate - today) / 86400000);
    const when = daysLeft < 0
      ? `${Math.abs(daysLeft)} days ago`
      : daysLeft === 0 ? 'TODAY'
      : `${daysLeft} days away`;
    const parts = [`${e.paperLabel} (${e.subject})`];
    parts.push(`date: ${e.date}`);
    if (e.time) parts.push(`time: ${e.time}`);
    if (e.durationMins) parts.push(`duration: ${e.durationMins}min`);
    parts.push(when);
    return '• ' + parts.join(' | ');
  });

  return formatText(lines.join('\n'));
}

async function getCoverageGaps(uid, args) {
  const subjectFilter = args?.subject || null;

  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('completedPapers')
    .get();

  // Group completed paper names by subject
  const bySubject = {};
  for (const d of snap.docs) {
    const { subject, displayName, paperPath } = d.data();
    if (subjectFilter && subject !== subjectFilter) continue;
    const subj = subject || 'unknown';
    const name = displayName || paperPath || 'unknown';
    if (!bySubject[subj]) bySubject[subj] = new Set();
    bySubject[subj].add(name);
  }

  if (Object.keys(bySubject).length === 0) {
    return formatText(subjectFilter
      ? `No completed papers found for subject: ${subjectFilter}`
      : 'No completed papers found.');
  }

  const lines = [];
  for (const [subject, names] of Object.entries(bySubject)) {
    lines.push(`${subject} (${names.size} distinct papers done):`);
    const sorted = [...names].sort();
    for (const n of sorted) lines.push(`  • ${n}`);
  }

  return formatText(lines.join('\n'));
}

async function getReviewQueue(uid) {
  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('reviewQueue')
    .orderBy('addedAt', 'desc')
    .get();

  if (snap.empty) return formatText('Review queue is empty.');

  const pending = snap.docs.filter((d) => d.data().status === 'pending');
  if (pending.length === 0) return formatText('No pending review topics.');

  // Group by subject
  const bySubject = {};
  for (const d of pending) {
    const { topic, subject, addedAt } = d.data();
    const subj = subject || 'unknown';
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push({ topic, addedAt });
  }

  const lines = [`${pending.length} pending review topic(s):`];
  for (const [subject, items] of Object.entries(bySubject)) {
    lines.push(`\n${subject}:`);
    for (const { topic, addedAt } of items) {
      const date = addedAt ? addedAt.slice(0, 10) : '';
      lines.push(`  • ${topic}${date ? ` (flagged ${date})` : ''}`);
    }
  }

  return formatText(lines.join('\n'));
}

function formatText(text) {
  return { content: [{ type: 'text', text }] };
}

// ── Prompt templates ──────────────────────────────────────────────────────────

const PROMPT_MESSAGES = {
  revision_overview: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Give me a full overview of where my revision stands. Fetch my stats, subjects, recent history, and upcoming papers, then summarise: what I\'ve done, what\'s coming up, and anything that looks off-balance or worth flagging.',
      },
    },
  ],
  focus_today: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'What should I work on today? Check my upcoming schedule and recent history, and give me a specific recommendation — which paper or subject to focus on and why.',
      },
    },
  ],
  grade_trends: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Fetch my recent revision history and analyse my grades. Are they improving, declining, or consistent? Are there any subjects or paper types where I\'m noticeably weaker?',
      },
    },
  ],
  review_topics: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Look at my recent revision history and pull out all the review topics I\'ve flagged. Group them by subject and tell me which topics keep coming up — those are the ones I should drill.',
      },
    },
  ],
  subject_balance: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Check my subjects and revision history. Is my revision spread evenly across subjects, or am I spending too much time on some and neglecting others? Give me a concrete breakdown.',
      },
    },
  ],
  review_topic: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `First fetch my review queue and revision history to find my weakest topics.

Then pick the highest-priority topic and do a structured review covering:

1. **Core concept** — explain it clearly, assume I know the basics but keep it precise
2. **Where people go wrong** — the specific mistakes that show up in A-level marking
3. **Worked example** — walk through one problem step by step, showing every line of working
4. **Things to memorise** — any formulas, identities, or key facts I need to have at my fingertips
5. **Exam technique** — how to approach questions on this topic under time pressure

If I have multiple weak topics, list them at the start and ask which one to focus on first.`,
      },
    },
  ],
  generate_question_sheet: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Fetch my review queue, revision history, and subjects.

Identify my top weak topics (use review queue + recurring low grades from history).

Then generate a practice question sheet as a **complete, self-contained HTML document** that I can save and open in a browser.

Requirements for the HTML:
- Clean, readable styling with a white background, sensible font size, print-friendly layout
- A title at the top: "Practice Question Sheet" with today's date
- Sections per subject/topic
- 4–6 questions per topic, ranging from straightforward to exam-standard difficulty
- Each question numbered clearly
- Answers hidden by default using <details><summary>Show answer</summary>...</details> so I can attempt the question first
- Mark allocation shown for each question e.g. [3 marks]
- A "Total marks" count at the bottom of each section
- At the very end, a small "Areas covered" summary listing which topics the sheet targets

Output ONLY the raw HTML — no markdown fences, no explanation before or after. Just the HTML starting with <!DOCTYPE html>.`,
      },
    },
  ],
  exam_countdown: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Fetch my exam timetable, upcoming papers, and revision history. For each upcoming exam: how many days left, how many papers are still scheduled before it, and based on my recent history for that subject, am I in good shape or behind? Flag anything urgent.',
      },
    },
  ],
  gap_analysis: [
    {
      role: 'user',
      content: {
        type: 'text',
        text: 'Fetch my coverage data and subjects. For each subject, tell me which paper years or series I have done versus which ones I have not touched. Identify the biggest gaps — years I have skipped entirely or underrepresented — and suggest which ones to prioritise next.',
      },
    },
  ],
};

// ── JSON-RPC router ───────────────────────────────────────────────────────────

async function handleRpc(method, params, uid) {
  if (method === 'initialize') {
    return {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: SERVER_INFO,
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'tools/list') {
    return { tools: TOOLS };
  }

  if (method === 'resources/list') {
    return { resources: RESOURCES };
  }

  if (method === 'resources/read') {
    const { uri } = params || {};
    if (uri === 'revision://guide') {
      return {
        contents: [{ uri, mimeType: 'text/markdown', text: GUIDE }],
      };
    }
    throw rpcError(-32602, `Unknown resource: ${uri}`);
  }

  if (method === 'prompts/list') {
    return { prompts: PROMPTS };
  }

  if (method === 'prompts/get') {
    const { name } = params || {};
    const messages = PROMPT_MESSAGES[name];
    if (!messages) throw rpcError(-32602, `Unknown prompt: ${name}`);
    const meta = PROMPTS.find((p) => p.name === name);
    return { description: meta?.description || '', messages };
  }

  if (method === 'tools/call') {
    if (!uid) throw rpcError(-32001, 'Unauthorized');
    const { name, arguments: args = {} } = params || {};
    switch (name) {
      case 'get_revision_history': return getRevisionHistory(uid, args);
      case 'get_upcoming_papers':  return getUpcomingPapers(uid, args);
      case 'get_subjects':         return getSubjects(uid);
      case 'get_stats':            return getStats(uid);
      case 'get_exam_timetable':   return getExamTimetable(uid);
      case 'get_coverage_gaps':    return getCoverageGaps(uid, args);
      case 'get_review_queue':     return getReviewQueue(uid);
      default: throw rpcError(-32602, `Unknown tool: ${name}`);
    }
  }

  throw rpcError(-32601, `Method not found: ${method}`);
}

function rpcError(code, message) {
  const e = new Error(message);
  e.rpcCode = code;
  return e;
}

// ── Cloud Function ────────────────────────────────────────────────────────────

exports.mcp = onRequest({ cors: true, region: 'europe-west2' }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.set('Access-Control-Allow-Origin', '*');

  const body = req.body;
  const id = body?.id ?? null;

  try {
    const uid = await resolveUid(req);

    const method = body?.method;
    const needsAuth = method === 'tools/call';
    if (needsAuth && !uid) {
      res.status(401).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32001, message: 'Invalid or missing API key' },
      });
      return;
    }

    const result = await handleRpc(method, body?.params, uid);

    if (result === null) {
      res.status(204).send('');
      return;
    }

    res.status(200).json({ jsonrpc: '2.0', id, result });
  } catch (err) {
    console.error('[mcp] error:', err);
    res.status(200).json({
      jsonrpc: '2.0',
      id,
      error: { code: err.rpcCode ?? -32603, message: err.message ?? 'Internal error' },
    });
  }
});
