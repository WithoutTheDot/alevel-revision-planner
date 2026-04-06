import { SUBJECT_TREES } from './paperTrees';
import { weightedRandom, weightedRandomChoice } from './random';
import { getDisplayName, getPaperPath } from './paperPaths';

// ─── getAllPaperPaths ─────────────────────────────────────────────────────────

/**
 * Recursively collect all terminal paper paths from a tree node.
 * Returns array of path arrays (each array is a sequence of values).
 */
function collectPaths(node, pathSoFar) {
  const results = [];
  for (const opt of node.options) {
    const current = [...pathSoFar, opt.value];
    if (opt.terminal) {
      results.push(current);
    } else if (opt.next) {
      results.push(...collectPaths(opt.next, current));
    }
  }
  return results;
}

/**
 * Returns all built-in paper paths across all subjects.
 * Each entry: { subject, paperPath, displayName }
 */
export function getAllPaperPaths() {
  const result = [];
  for (const [subject, tree] of Object.entries(SUBJECT_TREES)) {
    const paths = collectPaths(tree, []);
    for (const path of paths) {
      result.push({
        subject,
        paperPath: getPaperPath(path),
        displayName: getDisplayName(path),
      });
    }
  }
  return result;
}

const DEFAULT_DURATION = 120; // minutes

export function getDefaultDurationForPath(path, subject) {
  if (subject === 'computerScience') return 150;
  if (subject === 'physics') {
    if (path.includes('modelling-physics') || path.includes('exploring-physics')) return 135;
    if (path.includes('unified-physics')) return 90;
  }
  return 120; // maths, furtherMaths, AQA physics papers
}
const DEFAULT_BREAK    = 10; // minutes — plan default

/**
 * Recursively collect all leaf paths from a tree node, each with a combined weight
 * (product of raw option weights along the path, defaulting to 1).
 * Returns [{ path: string[], weight: number }]
 */
function collectLeafPaths(node, pathSoFar = [], weightSoFar = 1) {
  const results = [];
  for (const opt of node.options) {
    const w = (opt.weight ?? 1) * weightSoFar;
    const p = [...pathSoFar, opt.value];
    if (opt.terminal) {
      results.push({ path: p, weight: w });
    } else if (opt.next) {
      results.push(...collectLeafPaths(opt.next, p, w));
    }
  }
  return results;
}

/**
 * Select one paper for a given subject using coverage-first weighted selection.
 *
 * @param {string}   subject
 * @param {Set}      weekExcluded  - paperPath strings already chosen this week (weight = 0)
 * @param {string[]} recentPaths   - completed in past N weeks (weight × 0.01)
 * @param {object}   durations     - { paperPath: minutes, _default: 90 }
 * @param {object}   [customPapers] - map from familyId to family data
 * @param {string[]} [allTimePaths] - all ever-completed paper paths (weight × 0.05 if seen, 1.0 if unseen)
 */
export function selectPaper(subject, weekExcluded, recentPaths, durations, customPapers, allTimePaths = []) {
  const tree = SUBJECT_TREES[subject];
  const recentSet = new Set(recentPaths);
  const allTimeSet = new Set(allTimePaths);

  function effectiveWeight(paperPath, naturalWeight) {
    if (weekExcluded.has(paperPath)) return 0;
    if (recentSet.has(paperPath)) return naturalWeight * 0.01;
    if (allTimeSet.has(paperPath)) return naturalWeight * 0.05;
    return naturalWeight;
  }

  // Collect custom paper candidates for this subject
  const customCandidates = [];
  if (customPapers) {
    for (const [familyId, family] of Object.entries(customPapers)) {
      if (family.subject !== subject) continue;
      for (let y = family.yearStart; y <= family.yearEnd; y++) {
        const pp = `custom-${familyId}-${y}`;
        const ew = effectiveWeight(pp, 1);
        customCandidates.push({
          subject,
          path: ['custom', familyId, String(y)],
          paperPath: pp,
          displayName: `${family.familyName} ${y}`,
          duration: (durations && durations[pp]) ?? family.duration ?? getDefaultDurationForPath(pp, subject) ?? durations?._default ?? DEFAULT_DURATION,
          weight: ew,
        });
      }
    }
  }

  if (!tree) {
    if (customCandidates.length === 0) return null;
    // Normalise: if all weights are 0, allow all
    const pool = customCandidates.some((c) => c.weight > 0)
      ? customCandidates.filter((c) => c.weight > 0)
      : customCandidates.map((c) => ({ ...c, weight: 1 }));
    const chosen = weightedRandomChoice(pool);
    return { subject, path: chosen.path, paperPath: chosen.paperPath, displayName: chosen.displayName, duration: chosen.duration };
  }

  // Enumerate all leaf paths with effective weights
  const leaves = collectLeafPaths(tree).map(({ path, weight }) => {
    const paperPath = getPaperPath(path);
    return {
      path,
      paperPath,
      displayName: getDisplayName(path),
      duration: (durations && durations[paperPath]) ?? getDefaultDurationForPath(paperPath, subject) ?? durations?._default ?? DEFAULT_DURATION,
      weight: effectiveWeight(paperPath, weight),
    };
  });

  // Merge built-in leaves + custom candidates
  const allCandidates = [...leaves, ...customCandidates];

  // Normalise: if all weights are 0, fall back to equal weight for non-weekExcluded
  let pool = allCandidates.filter((c) => c.weight > 0);
  if (pool.length === 0) {
    pool = allCandidates
      .filter((c) => !weekExcluded.has(c.paperPath))
      .map((c) => ({ ...c, weight: 1 }));
  }
  if (pool.length === 0) {
    pool = allCandidates.map((c) => ({ ...c, weight: 1 }));
  }

  const chosen = weightedRandomChoice(pool);
  return { subject, path: chosen.path, paperPath: chosen.paperPath, displayName: chosen.displayName, duration: chosen.duration };
}

// ─── Scheduling ──────────────────────────────────────────────────────────────

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Bin-pack papers into timeBlocks (longest-fit-decreasing).
 * timeBlocks: [{ day: string, startTime: string, endTime: string }]
 * breakMinutes: gap between papers in a block
 */
function schedulePapers(papers, timeBlocks, breakMinutes) {
  const sorted = [...papers].sort((a, b) => b.duration - a.duration);

  const slots = timeBlocks.map((b) => ({
    day: b.day,
    start: toMinutes(b.startTime),
    end: toMinutes(b.endTime),
    cursor: toMinutes(b.startTime),
  }));

  // First pass: longest-fit-decreasing with break-shrinking
  const scheduled = sorted.map((paper) => {
    for (const slot of slots) {
      let gap = slot.cursor > slot.start ? breakMinutes : 0;
      let startAt = slot.cursor + gap;
      if (startAt + paper.duration > slot.end && gap > 0) {
        // Try without break to squeeze paper in
        startAt = slot.cursor;
        gap = 0;
      }
      if (startAt + paper.duration <= slot.end) {
        slot.cursor = startAt + paper.duration;
        return {
          ...paper,
          scheduledDay: slot.day,
          scheduledStart: fromMinutes(startAt),
          scheduledEnd: fromMinutes(startAt + paper.duration),
        };
      }
    }
    return { ...paper, scheduledDay: null, scheduledStart: null, scheduledEnd: null };
  });

  // Second pass: gap-fill with unscheduled papers (shortest first)
  const unscheduled = scheduled.filter((p) => p.scheduledDay === null);
  if (unscheduled.length > 0) {
    unscheduled.sort((a, b) => a.duration - b.duration);
    // Sort slots by remaining capacity descending
    const slotsByCapacity = [...slots].sort((a, b) => (b.end - b.cursor) - (a.end - a.cursor));
    for (const slot of slotsByCapacity) {
      for (let i = 0; i < unscheduled.length; i++) {
        const paper = unscheduled[i];
        if (paper.scheduledDay !== null) continue; // already placed in a previous iteration
        const gap = slot.cursor > slot.start ? breakMinutes : 0;
        let startAt = slot.cursor + gap;
        if (startAt + paper.duration > slot.end && gap > 0) {
          startAt = slot.cursor;
        }
        if (startAt + paper.duration <= slot.end) {
          slot.cursor = startAt + paper.duration;
          const idx = scheduled.indexOf(paper);
          scheduled[idx] = {
            ...paper,
            scheduledDay: slot.day,
            scheduledStart: fromMinutes(startAt),
            scheduledEnd: fromMinutes(startAt + paper.duration),
          };
          unscheduled[i] = scheduled[idx]; // mark as placed
        }
      }
    }
  }

  return scheduled;
}

// ─── Main generator ──────────────────────────────────────────────────────────

/**
 * Generate a weekly schedule.
 *
 * Template shape (from Firestore):
 * {
 *   subjects: string[],
 *   maxPapersPerSubject: number,
 *   mostCommonPapersPerSubject: number,
 *   maxTotalPapers: number,
 *   breakDuration: number,   // minutes between papers
 *   timeBlocks: [{ day, startTime, endTime }]
 * }
 */
export function generateWeeklySchedule(userId, weekStart, weekType, template, recentPaths, durations, customPapers, allTimePaths = []) {
  const {
    subjects = [],
    maxPapersPerSubject = 6,
    mostCommonPapersPerSubject = 2,
    maxTotalPapers = 16,
    breakDuration = DEFAULT_BREAK,
    timeBlocks = [],
  } = template;

  const recentSet = new Set(recentPaths);

  // Step 1: determine per-subject counts
  const counts = {};
  let total = 0;
  for (const subject of subjects) {
    counts[subject] = weightedRandom(mostCommonPapersPerSubject, maxPapersPerSubject);
    total += counts[subject];
  }

  // Enforce maxTotalPapers — reduce subjects with most papers first
  const warnings = [];
  if (total > maxTotalPapers) {
    const requested = total;
    let excess = total - maxTotalPapers;
    // Sort subjects by count descending to reduce the biggest first
    const sorted = [...subjects].sort((a, b) => counts[b] - counts[a]);
    for (const subject of sorted) {
      if (excess <= 0) break;
      const reduce = Math.min(counts[subject] - 1, excess); // keep at least 1
      counts[subject] -= reduce;
      excess -= reduce;
    }
    warnings.push(`Schedule trimmed from ${requested} to ${maxTotalPapers} papers (template limit).`);
  }

  // Step 2: select papers
  const papers = [];
  const weekExcluded = new Set(); // hard-exclude: no dups within a week
  // Textbook is special: can appear up to 2× — track separately, don't add to weekExcluded
  let textbookCount = 0;

  for (const subject of subjects) {
    const target = counts[subject];
    let picked = 0;
    let attempts = 0;

    while (picked < target && attempts < 100) {
      attempts++;
      const paper = selectPaper(subject, weekExcluded, [...recentSet], durations, customPapers, allTimePaths);
      if (!paper) break; // no papers available for this subject (no tree, no custom)
      const isTextbook = paper.paperPath === 'textbook';

      if (isTextbook) {
        if (textbookCount >= 2) continue; // cap reached
        textbookCount++;
        // Don't add textbook to weekExcluded so the second one can be selected
        papers.push({ ...paper, completed: false, marks: null, grade: null });
        picked++;
        continue;
      }

      if (weekExcluded.has(paper.paperPath)) continue;
      weekExcluded.add(paper.paperPath);
      papers.push({ ...paper, completed: false, marks: null, grade: null });
      picked++;
    }
  }

  // Step 3: shuffle so papers are interleaved across subjects
  for (let i = papers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [papers[i], papers[j]] = [papers[j], papers[i]];
  }

  // Step 4: schedule into time blocks
  const scheduledPapers = timeBlocks.length > 0
    ? schedulePapers(papers, timeBlocks, breakDuration)
    : papers.map((p) => ({ ...p, scheduledDay: null, scheduledStart: null, scheduledEnd: null }));

  const unscheduledCount = scheduledPapers.filter((p) => p.scheduledDay === null).length;
  if (unscheduledCount > 0) {
    warnings.push(`${unscheduledCount} paper(s) could not be scheduled — add more time blocks or reduce max papers per week.`);
  }

  return {
    schedule: {
      weekId: weekStart,
      weekStart,
      weekType,
      generatedAt: new Date().toISOString(),
      papers: scheduledPapers,
    },
    warnings,
  };
}
