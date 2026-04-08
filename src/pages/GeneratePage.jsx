import { useState, useEffect, useCallback } from 'react';
import { analytics } from '../firebase/config';
import { Link } from 'react-router-dom';
import { useTutorial } from '../contexts/TutorialContext';
import { format, addDays, addWeeks } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import {
  getTermCalendar, getWeekTemplates, getWeekTemplate,
  getPaperDurations, getRecentCompletedPapers, getAllCompletedPaperPaths,
  saveWeeklySchedule, getCustomPapers, getExamTimetable,
  getWeeklySchedule,
} from '../firebase/db';
import { generateWeeklySchedule } from '../lib/generateSchedule';
import SubjectBadge from '../components/SubjectBadge';
import WeekTypeBadge from '../components/WeekTypeBadge';
import WeekGridEditor from '../components/WeekGridEditor';
import { getMondayStr } from '../lib/dateUtils';

/** Snap any date string to its week's Monday. */
function snapToMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00'); // parse as local date
  return getMondayStr(d);
}

const DAYS_OFFSET = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

/** Returns true if `day` in `weekId` is exactly `examDate`. */
function p_isExamOnDay(weekId, day, examDate) {
  const [yr, mo, dy] = weekId.split('-').map(Number);
  const monday = new Date(yr, mo - 1, dy);
  const paperDate = addDays(monday, DAYS_OFFSET[day] ?? 0);
  return format(paperDate, 'yyyy-MM-dd') === examDate;
}

/**
 * Returns conflict level for a paper's scheduledDay in weekId vs examDate.
 * 0-1 days = 'red', 2-5 days = 'amber', else null.
 */
function conflictLevel(weekId, scheduledDay, examDate) {
  const [yr, mo, dy] = weekId.split('-').map(Number);
  const monday = new Date(yr, mo - 1, dy);
  const paperDate = addDays(monday, DAYS_OFFSET[scheduledDay] ?? 0);
  const exam = new Date(examDate + 'T00:00:00');
  const diffDays = Math.round((exam - paperDate) / 86400000);
  if (diffDays >= 0 && diffDays <= 1) return 'red';
  if (diffDays >= 0 && diffDays <= 5) return 'amber';
  return null;
}

/** Collect all Mondays between startMonday and endMonday (inclusive). */
function mondaysBetween(startStr, endStr) {
  const result = [];
  let current = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  while (current <= end) {
    result.push(format(current, 'yyyy-MM-dd'));
    current = addWeeks(current, 1);
  }
  return result;
}

export default function GeneratePage() {
  const { currentUser } = useAuth();
  const { active, step: tutStep, notifyActionDone } = useTutorial();

  // Step state: 'select' | 'preview' | 'saved'
  const [step, setStep] = useState('select');

  // Step 1 state — default to this week's Monday
  const [weekStart, setWeekStart] = useState(() => getMondayStr(new Date()));
  const [templates, setTemplates] = useState({});
  const [calendarEntry, setCalendarEntry] = useState(null);
  const [templateId, setTemplateId] = useState('week-a');
  const [loadingCtx, setLoadingCtx] = useState(true);
  const [ctxError, setCtxError] = useState('');

  // Batch generation state
  const [localBlocks, setLocalBlocks] = useState([]);

  const [batchMode, setBatchMode] = useState(false);
  const [batchEnd, setBatchEnd] = useState(() => getMondayStr(addWeeks(new Date(), 4)));
  const [batchProgress, setBatchProgress] = useState('');
  const [batchSummary, setBatchSummary] = useState(null);

  // Step 2 state
  const [preview, setPreview] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [examEntries, setExamEntries] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCtx = useCallback(async () => {
    setLoadingCtx(true);
    setCtxError('');
    try {
      const [calendar, tmpl] = await Promise.all([
        getTermCalendar(currentUser.uid),
        getWeekTemplates(currentUser.uid),
      ]);
      setTemplates(tmpl);
      const entry = calendar[weekStart];
      setCalendarEntry(entry || null);
      // Auto-select the template matching the term calendar entry
      let resolvedId = templateId;
      if (entry?.templateId && tmpl[entry.templateId]) {
        resolvedId = entry.templateId;
        setTemplateId(resolvedId);
      } else if (!tmpl[templateId] && Object.keys(tmpl).length > 0) {
        // Current templateId no longer exists — pick first available
        resolvedId = Object.keys(tmpl)[0];
        setTemplateId(resolvedId);
      }
      setLocalBlocks(tmpl[resolvedId]?.timeBlocks ?? []);
    } catch (e) {
      setCtxError('Failed to load context: ' + e.message);
    } finally {
      setLoadingCtx(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.uid, weekStart]);

  useEffect(() => { loadCtx(); }, [loadCtx]);

  useEffect(() => {
    if (active && tutStep?.key === 'GENERATE_SAVE' && step === 'saved') {
      notifyActionDone();
    }
  }, [active, tutStep, step, notifyActionDone]);

  function handleDateChange(e) {
    // Snap to Monday of the selected week
    setWeekStart(snapToMonday(e.target.value));
  }


  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setWarnings([]);
    try {
      const [template, durations, recent, allTimePaths, customPapers, exams] = await Promise.all([
        getWeekTemplate(currentUser.uid, templateId),
        getPaperDurations(currentUser.uid),
        getRecentCompletedPapers(currentUser.uid, weekStart, 3),
        getAllCompletedPaperPaths(currentUser.uid),
        getCustomPapers(currentUser.uid),
        getExamTimetable(currentUser.uid),
      ]);
      setExamEntries(exams);
      if (!template) {
        throw new Error(`Template "${templateId}" not found. Check your Templates page.`);
      }
      const weekType = calendarEntry?.weekType || templateId;
      const scheduleTemplate = { ...template, timeBlocks: localBlocks };
      const { schedule, warnings: w } = generateWeeklySchedule(
        currentUser.uid, weekStart, weekType, scheduleTemplate, recent, durations, customPapers, allTimePaths
      );
      setPreview(schedule);
      setPreviewTemplate(scheduleTemplate);
      setWarnings(w);
      setStep('preview');
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    setGenerating(true);
    setError('');
    setWarnings([]);
    try {
      const [template, durations, recent, allTimePaths, customPapers, exams] = await Promise.all([
        getWeekTemplate(currentUser.uid, templateId),
        getPaperDurations(currentUser.uid),
        getRecentCompletedPapers(currentUser.uid, weekStart, 3),
        getAllCompletedPaperPaths(currentUser.uid),
        getCustomPapers(currentUser.uid),
        getExamTimetable(currentUser.uid),
      ]);
      setExamEntries(exams);
      if (!template) throw new Error(`Template "${templateId}" not found.`);
      const weekType = calendarEntry?.weekType || templateId;
      const scheduleTemplate = { ...template, timeBlocks: localBlocks };
      const { schedule, warnings: w } = generateWeeklySchedule(
        currentUser.uid, weekStart, weekType, scheduleTemplate, recent, durations, customPapers, allTimePaths
      );
      setPreview(schedule);
      setPreviewTemplate(scheduleTemplate);
      setWarnings(w);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleBackToSelect() {
    setStep('select');
    setPreview(null);
    setWarnings([]);
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await saveWeeklySchedule(currentUser.uid, weekStart, preview);
      if (analytics) {
        import('firebase/analytics').then(({ logEvent }) => {
          logEvent(analytics, 'schedule_generated', { paper_count: preview.length });
        }).catch(() => {});
      }
      setStep('saved');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchGenerate() {
    setGenerating(true);
    setError('');
    setBatchSummary(null);
    setBatchProgress('');
    try {
      const [template, durations, customPapers, , termCalendar] = await Promise.all([
        getWeekTemplate(currentUser.uid, templateId),
        getPaperDurations(currentUser.uid),
        getCustomPapers(currentUser.uid),
        getExamTimetable(currentUser.uid),
        getTermCalendar(currentUser.uid),
      ]);
      if (!template) throw new Error(`Template "${templateId}" not found.`);

      const mondays = mondaysBetween(weekStart, batchEnd);
      let saved = 0;
      let skipped = 0;
      for (let i = 0; i < mondays.length; i++) {
        const mon = mondays[i];
        setBatchProgress(`Generating week ${i + 1} of ${mondays.length}…`);
        // Skip weeks already having a saved schedule
        const existing = await getWeeklySchedule(currentUser.uid, mon);
        if (existing) { skipped++; continue; }
        const [recent, allTimePaths] = await Promise.all([
          getRecentCompletedPapers(currentUser.uid, mon, 3),
          getAllCompletedPaperPaths(currentUser.uid),
        ]);
        const weekType = termCalendar[mon]?.weekType || templateId;
        const { schedule } = generateWeeklySchedule(
          currentUser.uid, mon, weekType, template, recent, durations, customPapers, allTimePaths
        );
        await saveWeeklySchedule(currentUser.uid, mon, schedule);
        saved++;
      }
      setBatchProgress('');
      setBatchSummary({ total: mondays.length, saved, skipped });
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function removePaper(idx) {
    setPreview((p) => ({ ...p, papers: p.papers.filter((_, i) => i !== idx) }));
  }

  // Group papers by day, preserving original index
  const byDay = preview?.papers.reduce((acc, p, idx) => {
    const day = p.scheduledDay || 'Unscheduled';
    if (!acc[day]) acc[day] = [];
    acc[day].push({ ...p, _idx: idx });
    return acc;
  }, {});

  const DAYS_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Unscheduled'];

  // Compute unused time per time block for the nudge banner
  const unusedSlots = (() => {
    if (!preview || !previewTemplate?.timeBlocks?.length) return [];
    const result = [];
    for (const block of previewTemplate.timeBlocks) {
      const blockStartMin = block.startTime.split(':').map(Number).reduce((h, m) => h * 60 + m);
      const blockEndMin = block.endTime.split(':').map(Number).reduce((h, m) => h * 60 + m);
      const blockLen = blockEndMin - blockStartMin;
      const papersInBlock = preview.papers.filter(
        (p) => p.scheduledDay === block.day && p.scheduledStart != null
      );
      const breakMin = previewTemplate.breakDuration ?? 10;
      const used = papersInBlock.reduce((sum, p, i) => sum + p.duration + (i > 0 ? breakMin : 0), 0);
      const unused = blockLen - used;
      if (unused >= 30) {
        result.push({ label: `${block.day} ${block.startTime}–${block.endTime}`, unusedMin: unused });
      }
    }
    return result;
  })();

  return (
    <div data-tutorial-id="generate-page-root" className="max-w-3xl">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">Generate Schedule</h1>

      {error && <div className="mb-4 p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] rounded-[var(--radius-md)] text-sm">{error}</div>}

      {/* ── Step 1: Select week ─────────────────────────────── */}
      {step === 'select' && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 space-y-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={batchMode} onChange={(e) => setBatchMode(e.target.checked)} className="w-4 h-4 rounded text-[var(--color-accent)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Batch generate (multiple weeks)</span>
          </label>

          <div className={batchMode ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">{batchMode ? 'Start Monday' : 'Week starting (Monday)'}</label>
              <input data-tutorial-id="generate-week-picker" type="date" value={weekStart} onChange={handleDateChange}
                className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)]" />
              {!batchMode && <p className="text-xs text-[var(--color-text-muted)] mt-1">Any date is snapped to that week's Monday.</p>}
            </div>
            {batchMode && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">End Monday</label>
                <input type="date" value={batchEnd} onChange={(e) => setBatchEnd(snapToMonday(e.target.value))}
                  className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)]" />
              </div>
            )}
          </div>

          {ctxError && <p className="text-sm text-red-600">{ctxError}</p>}

          {loadingCtx ? (
            <p className="text-[var(--color-text-muted)] text-sm">Loading…</p>
          ) : (
            <>
              {!batchMode && (
                calendarEntry ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <span>Term calendar:</span>
                    <WeekTypeBadge weekType={calendarEntry.weekType} />
                    <span className="text-[var(--color-text-muted)]">(auto-detected)</span>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600">
                    This week isn&apos;t marked in your <Link to="/term-schedule" className="underline font-medium">Term Schedule</Link> — select a template manually below.
                  </p>
                )
              )}

              {Object.keys(templates).length === 0 ? (
                <p className="text-sm text-red-600">No templates found. <Link to="/templates" className="underline font-medium">Create one in Templates</Link> first.</p>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Template</label>
                  <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setLocalBlocks(templates[e.target.value]?.timeBlocks ?? []); }}
                    className="border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                    {Object.entries(templates).map(([id, t]) => (
                      <option key={id} value={id}>{t.templateName}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Templates define your daily study time slots. <Link to="/templates" className="underline">Edit in Templates.</Link></p>
                </div>
              )}

              {templates[templateId] && (
                <>
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-xs text-[var(--color-text-secondary)] space-y-0.5">
                    <p className="font-medium text-[var(--color-text-primary)]">{templates[templateId].templateName}</p>
                    <p>Max per subject: {templates[templateId].maxPapersPerSubject} · Most common: {templates[templateId].mostCommonPapersPerSubject}</p>
                    <p>Max total: {templates[templateId].maxTotalPapers} · {localBlocks.length} time blocks · {templates[templateId].breakDuration}min break</p>
                  </div>
                  {!batchMode && (
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Time blocks for this week</p>
                      <WeekGridEditor value={localBlocks} onChange={setLocalBlocks} />
                    </div>
                  )}
                </>
              )}

              {batchMode && batchProgress && <p className="text-sm text-[var(--color-accent)]">{batchProgress}</p>}
              {batchSummary && (
                <div className="p-3 bg-[var(--color-success-bg)] text-[var(--color-success-text)] rounded-[var(--radius-md)] text-sm">
                  Batch complete: {batchSummary.saved} week(s) generated, {batchSummary.skipped} skipped.
                </div>
              )}

              <button data-tutorial-id="generate-generate-btn"
                onClick={batchMode ? handleBatchGenerate : handleGenerate}
                disabled={generating || Object.keys(templates).length === 0}
                className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
                {generating ? 'Generating…' : (batchMode ? 'Batch Generate' : 'Generate Schedule')}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Preview ─────────────────────────────────── */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {warnings.length > 0 && (
            <div className="p-3 bg-[var(--color-warning-bg)] border border-amber-200 rounded-[var(--radius-md)] text-sm text-[var(--color-warning-text)] space-y-1">
              {warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}
          {unusedSlots.length > 0 && (
            <div className="p-3 bg-[var(--color-accent-subtle)] border border-[var(--color-accent-subtle)] text-[var(--color-accent-text)] rounded-[var(--radius-md)] text-sm space-y-1">
              <p className="font-medium">Some time blocks have unused capacity:</p>
              {unusedSlots.map((s) => <p key={s.label}>· {s.label}: {s.unusedMin} min unused</p>)}
              <p className="text-xs mt-1 opacity-70">Consider increasing max papers per session in your template.</p>
            </div>
          )}
          {preview.papers.some((p) => p.duration < 60) && (
            <div className="p-3 bg-[var(--color-warning-bg)] border border-amber-200 text-[var(--color-warning-text)] rounded-[var(--radius-md)] text-sm">
              One or more papers have a duration under 60 min.{' '}
              <Link to="/settings" className="underline font-medium hover:text-amber-900">Check Settings → Papers</Link>
            </div>
          )}

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">Week of {weekStart}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{preview.papers.length} papers</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRegenerate} disabled={generating}
                className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50 transition-colors">
                {generating ? 'Regenerating…' : 'Regenerate'}
              </button>
              <button data-tutorial-id="generate-save-btn" onClick={handleSave} disabled={saving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Schedule'}
              </button>
            </div>
          </div>

          {byDay && DAYS_ORDER.filter((d) => byDay[d]).map((day) => {
            const dayExams = examEntries.filter((e) => p_isExamOnDay(weekStart, day, e.date));
            return (
              <div key={day} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center gap-2 bg-[var(--color-surface)]">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{day}</h3>
                  {dayExams.map((e) => (
                    <span key={e.id} className="text-xs font-medium bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                      EXAM: {e.paperLabel}
                    </span>
                  ))}
                </div>
                <div>
                  {byDay[day].map((p) => {
                    const level = p.scheduledDay ? (() => {
                      for (const e of examEntries) {
                        if (e.subject !== p.subject) continue;
                        const l = conflictLevel(weekStart, p.scheduledDay, e.date);
                        if (l) return l;
                      }
                      return null;
                    })() : null;
                    return (
                      <div key={p._idx} className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] last:border-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <SubjectBadge subject={p.subject} />
                          <span className="text-sm text-[var(--color-text-primary)]">{p.displayName}</span>
                          <span className="text-xs text-[var(--color-text-muted)]">{p.duration}min</span>
                          {p.scheduledStart && <span className="text-xs text-[var(--color-accent)]">{p.scheduledStart}–{p.scheduledEnd}</span>}
                          {level === 'red' && <span className="text-xs font-medium bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] px-2 py-0.5 rounded-[var(--radius-sm)]">Exam conflict (0–1 days)</span>}
                          {level === 'amber' && <span className="text-xs font-medium bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] px-2 py-0.5 rounded-[var(--radius-sm)]">Exam nearby (2–5 days)</span>}
                        </div>
                        <button onClick={() => removePaper(p._idx)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] ml-2 flex-shrink-0 text-lg leading-none">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-2">
            <button onClick={handleBackToSelect} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">Back</button>
            <button onClick={handleRegenerate} disabled={generating} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] disabled:opacity-50 transition-colors">
              {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Saved ────────────────────────────────────── */}
      {step === 'saved' && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)] flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z" clipRule="evenodd"/></svg>
          </div>
          <p className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Schedule saved</p>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">View it on the Calendar page.</p>
          <button onClick={() => { setStep('select'); setPreview(null); setWarnings([]); }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">
            Generate another
          </button>
        </div>
      )}
    </div>
  );
}
