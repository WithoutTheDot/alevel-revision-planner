import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import Modal from './Modal';
import SubjectBadge from './SubjectBadge';
import { GRADES, normaliseMarks } from '../lib/gradeUtils';
import { inputCls as baseInputCls } from '../lib/styles';
import { secsToInput, inputToSecs } from '../lib/timeUtils';
import { useSubjects } from '../contexts/SubjectsContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserSettings, getCustomPapers, getPaperDurations } from '../firebase/db';
import { BUILT_IN_FAMILIES } from '../lib/builtInFamilies';
import { getDefaultDurationForPath } from '../lib/generateSchedule';
import { useTimerContext } from '../contexts/TimerContext';

function normaliseTopic(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/,+$/, '');
}

function TagInput({ enabled, initialTags, onChange }) {
  const [tags, setTags] = useState(Array.isArray(initialTags) ? initialTags : []);
  const [tagInput, setTagInput] = useState('');

  function commitTagInput() {
    const val = normaliseTopic(tagInput);
    if (val && !tags.includes(val)) {
      const next = [...tags, val];
      setTags(next);
      onChange?.(next);
    }
    setTagInput('');
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTagInput();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      const next = tags.slice(0, -1);
      setTags(next);
      onChange?.(next);
    }
  }

  function removeTag(tag) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    onChange?.(next);
  }

  if (!enabled) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
        Topics to review <span className="font-normal text-[var(--color-text-muted)]">(press Enter or comma to add)</span>
      </label>
      <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-[var(--color-surface)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)]">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] leading-none"
              aria-label={`Remove ${tag}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          onBlur={commitTagInput}
          placeholder={tags.length === 0 ? 'e.g. integration, chain rule' : ''}
          className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
        />
      </div>
    </div>
  );
}

/**
 * Unified completion/details modal.
 *
 * Modes:
 * - scheduled: completing/editing a scheduled paper (supports "Mark as completed")
 * - adhoc: logging an ad-hoc completion (always completed)
 * - history: editing an existing completion record (always completed)
 */
export default function CompletionDetailsModal({
  mode, // 'scheduled' | 'adhoc' | 'history'
  paper,
  onClose,
  onSubmit,
  actualDurationSeconds,
  defaultCompletedAt, // yyyy-MM-dd for adhoc
  submitLabel,
}) {
  const inputCls = baseInputCls;
  const { subjectMeta } = useSubjects();
  const { currentUser } = useAuth();
  const timerCtx = useTimerContext();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isScheduled = mode === 'scheduled';
  const isAdhoc = mode === 'adhoc';
  const isHistory = mode === 'history';

  const [reviewModeEnabled, setReviewModeEnabled] = useState(true);
  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserSettings(currentUser.uid)
      .then((s) => setReviewModeEnabled(s?.reviewModeEnabled ?? true))
      .catch(() => setReviewModeEnabled(true));
  }, [currentUser?.uid]);

  const [completed, setCompleted] = useState(isScheduled ? (paper?.completed ?? false) : true);

  const subjectsList = useMemo(() => Object.keys(subjectMeta ?? {}), [subjectMeta]);
  const [subject, setSubject] = useState(paper?.subject ?? subjectsList[0] ?? '');
  const [displayName, setDisplayName] = useState(paper?.displayName ?? '');
  const [completedAt, setCompletedAt] = useState(defaultCompletedAt ?? todayStr);

  const initialMarks = paper?.marks !== null && paper?.marks !== undefined ? String(paper.marks) : '';
  const [marksRaw, setMarksRaw] = useState(initialMarks);
  const [marksError, setMarksError] = useState('');
  const [grade, setGrade] = useState(paper?.grade ?? '');
  const [comment, setComment] = useState(paper?.comment ?? '');

  const [durationInput, setDurationInput] = useState(
    actualDurationSeconds != null
      ? secsToInput(actualDurationSeconds)
      : (paper?.actualDurationSeconds != null ? secsToInput(paper.actualDurationSeconds) : '')
  );

  const [reviewTopics, setReviewTopics] = useState(Array.isArray(paper?.reviewTopics) ? paper.reviewTopics : []);
  const [saving, setSaving] = useState(false);

  // ── Family picker state (adhoc only) ──────────────────────────────────────
  const [useFamily, setUseFamily] = useState(false);
  const [allFamilies, setAllFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [yearInput, setYearInput] = useState('');
  const [computedPaperPath, setComputedPaperPath] = useState('');
  const [durations, setDurations] = useState({});

  // Load families + durations for adhoc mode
  useEffect(() => {
    if (!isAdhoc || !currentUser?.uid) return;

    getCustomPapers(currentUser.uid).then((customMap) => {
      const builtInIds = new Set(BUILT_IN_FAMILIES.map((f) => f.id));
      const result = [...BUILT_IN_FAMILIES];
      for (const [id, fam] of Object.entries(customMap)) {
        if (!builtInIds.has(id) && !fam.deleted) {
          result.push({
            id,
            name: fam.familyName,
            subject: fam.subject,
            yearStart: fam.yearStart ?? null,
            yearEnd: fam.yearEnd ?? null,
            pathFn: null,
            isBuiltIn: false,
          });
        }
      }
      setAllFamilies(result);
    }).catch(() => setAllFamilies(BUILT_IN_FAMILIES));

    getPaperDurations(currentUser.uid).then(setDurations).catch(() => setDurations({}));
  }, [isAdhoc, currentUser?.uid]);

  // Families filtered by current subject
  const subjectFamilies = useMemo(
    () => allFamilies.filter((f) => f.subject === subject).sort((a, b) => a.name.localeCompare(b.name)),
    [allFamilies, subject]
  );

  const selectedFamily = useMemo(
    () => allFamilies.find((f) => f.id === selectedFamilyId) ?? null,
    [allFamilies, selectedFamilyId]
  );

  // Auto-compute displayName, paperPath, duration when family + year changes
  useEffect(() => {
    if (!useFamily || !selectedFamily) return;

    const hasYearRange = selectedFamily.yearStart !== null && selectedFamily.yearEnd !== null;

    if (hasYearRange) {
      const year = parseInt(yearInput);
      if (!yearInput || isNaN(year)) {
        setComputedPaperPath('');
        setDisplayName('');
        return;
      }
      const path = selectedFamily.pathFn
        ? selectedFamily.pathFn(year)
        : `custom-${selectedFamily.id}-${year}`;
      setComputedPaperPath(path);
      setDisplayName(`${selectedFamily.name} ${year}`);
      const durMins = durations[path] ?? getDefaultDurationForPath(path, subject);
      setDurationInput(String(durMins));
    } else {
      // Single paper (no year range)
      const path = selectedFamily.pathFn
        ? selectedFamily.pathFn(null)
        : `custom-${selectedFamily.id}`;
      setComputedPaperPath(path);
      setDisplayName(selectedFamily.name);
      const durMins = durations[path] ?? getDefaultDurationForPath(path, subject);
      setDurationInput(String(durMins));
    }
  }, [useFamily, selectedFamily, yearInput, durations, subject]);

  // Reset family state when toggling off
  function switchToManual() {
    setUseFamily(false);
    setSelectedFamilyId('');
    setYearInput('');
    setComputedPaperPath('');
    setDisplayName('');
    setDurationInput('');
  }

  function switchToFamily() {
    setUseFamily(true);
    setDisplayName('');
    setDurationInput('');
  }

  // Reset family selection when subject changes (in family mode)
  function handleSubjectChange(newSubject) {
    setSubject(newSubject);
    if (useFamily) {
      setSelectedFamilyId('');
      setYearInput('');
      setComputedPaperPath('');
      setDisplayName('');
      setDurationInput('');
    }
  }

  function handleMarksBlur() {
    const { normalised, invalid } = normaliseMarks(marksRaw);
    if (invalid) {
      setMarksError('Enter marks as a number or fraction, e.g. 85/100');
    } else {
      setMarksError('');
      setMarksRaw(normalised);
    }
  }

  // ── Year validation ────────────────────────────────────────────────────────
  const yearNum = parseInt(yearInput);
  const yearInRange = selectedFamily?.yearStart !== null
    ? (yearInput && !isNaN(yearNum) && yearNum >= selectedFamily.yearStart && yearNum <= selectedFamily.yearEnd)
    : true;

  const adhocCanSubmit = useFamily
    ? (selectedFamily !== null && (selectedFamily.yearStart === null || yearInRange) && displayName.trim() !== '')
    : displayName.trim() !== '';

  async function handleSave() {
    if (isAdhoc && !adhocCanSubmit) return;

    const { normalised, invalid } = normaliseMarks(marksRaw);
    if (invalid) {
      setMarksError('Enter marks as a number or fraction, e.g. 85/100');
      return;
    }

    setSaving(true);
    try {
      const common = {
        marks: normalised || null,
        grade: grade || null,
        comment: comment.trim() || null,
        actualDurationSeconds: inputToSecs(durationInput),
        reviewTopics: (completed && reviewModeEnabled) ? (reviewTopics ?? []) : [],
      };

      if (isScheduled) {
        await onSubmit?.({ completed, ...common });
      } else if (isAdhoc) {
        await onSubmit?.({
          subject,
          displayName: displayName.trim(),
          completedAt: new Date((completedAt || todayStr) + 'T12:00:00').toISOString(),
          ...(computedPaperPath ? { paperPath: computedPaperPath } : {}),
          ...common,
        });
      } else if (isHistory) {
        await onSubmit?.({ ...common });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStartTimer() {
    if (!timerCtx?.startSession || !displayName.trim()) return;
    const durationMins = parseInt(durationInput) || getDefaultDurationForPath(computedPaperPath || 'adhoc', subject) || 90;
    await timerCtx.startSession(
      {
        subject,
        displayName: displayName.trim(),
        paperPath: computedPaperPath || null,
        source: 'adhoc',
      },
      durationMins
    );
    onClose?.();
  }

  const header = (
    <div className="flex items-start gap-3 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
      <SubjectBadge subject={subject} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--color-text-primary)] text-sm">
          {displayName || paper?.displayName || 'Paper'}
        </p>
        {paper?.duration != null && <p className="text-xs text-[var(--color-text-muted)]">{paper.duration} min</p>}
        <div className="mt-1.5">
          <label className="block text-xs text-[var(--color-text-muted)] mb-0.5">Time taken (MM:SS or minutes)</label>
          <input
            type="text"
            placeholder="e.g. 85:00"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            className="border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={isAdhoc ? 'Log Paper' : isHistory ? 'Edit Completion' : 'Paper Details'}
    >
      <div className="space-y-4">
        {isAdhoc && (
          <>
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={switchToManual}
                className={`flex-1 py-2 text-sm rounded-[var(--radius-sm)] border transition-colors ${
                  !useFamily
                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
                }`}
              >
                Manual entry
              </button>
              <button
                type="button"
                onClick={switchToFamily}
                className={`flex-1 py-2 text-sm rounded-[var(--radius-sm)] border transition-colors ${
                  useFamily
                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
                }`}
              >
                Select from family
              </button>
            </div>

            {/* Subject (always shown) */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Subject</label>
              <select value={subject} onChange={(e) => handleSubjectChange(e.target.value)} className={inputCls}>
                {subjectsList.map((id) => (
                  <option key={id} value={id}>{subjectMeta[id]?.label ?? id}</option>
                ))}
              </select>
            </div>

            {useFamily ? (
              <>
                {/* Family dropdown */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Paper family</label>
                  <select
                    value={selectedFamilyId}
                    onChange={(e) => { setSelectedFamilyId(e.target.value); setYearInput(''); }}
                    className={inputCls}
                  >
                    <option value="">Select a family…</option>
                    {subjectFamilies.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Year input (only if family has a year range) */}
                {selectedFamily && selectedFamily.yearStart !== null && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                      Year ({selectedFamily.yearStart}–{selectedFamily.yearEnd})
                    </label>
                    <input
                      type="number"
                      min={selectedFamily.yearStart}
                      max={selectedFamily.yearEnd}
                      value={yearInput}
                      onChange={(e) => setYearInput(e.target.value)}
                      placeholder={String(selectedFamily.yearEnd)}
                      className={inputCls + (!yearInRange && yearInput ? ' !border-red-400' : '')}
                    />
                    {!yearInRange && yearInput && (
                      <p className="text-xs text-red-500 mt-1">
                        Enter a year between {selectedFamily.yearStart} and {selectedFamily.yearEnd}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Paper name / description</label>
                <input
                  type="text"
                  placeholder="e.g. AQA 2023 Paper 1"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}

            {/* Date completed (always shown in adhoc) */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Date completed</label>
              <input
                type="date"
                value={completedAt}
                max={todayStr}
                onChange={(e) => setCompletedAt(e.target.value)}
                className={inputCls}
              />
            </div>
          </>
        )}

        {header}

        {isScheduled && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--color-accent)]"
            />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Mark as completed</span>
          </label>
        )}

        {(completed || !isScheduled) && (
          <>
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Marks</label>
                <input
                  type="text"
                  placeholder="e.g. 13/50 or 72"
                  value={marksRaw}
                  onChange={(e) => { setMarksRaw(e.target.value); setMarksError(''); }}
                  onBlur={handleMarksBlur}
                  className={inputCls + (marksError ? ' !border-red-400' : '')}
                />
                {marksError && <p className="text-xs text-red-500 mt-1">{marksError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Grade</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls}>
                  {GRADES.map((g) => <option key={g} value={g}>{g || '—'}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Notes <span className="font-normal text-[var(--color-text-muted)]">(what went wrong, topics to revisit)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Struggled with integration by parts…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={inputCls + ' resize-none'}
              />
            </div>
            <TagInput
              enabled={reviewModeEnabled}
              initialTags={reviewTopics}
              onChange={setReviewTopics}
            />
          </>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
          >
            Cancel
          </button>
          {isAdhoc && timerCtx?.startSession && (
            <button
              onClick={handleStartTimer}
              disabled={!adhocCanSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 disabled:opacity-50 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-.75-10.25a.75.75 0 0 1 .75.75v3.69l2.22 1.28a.75.75 0 1 1-.75 1.3L7 10.31V5.5a.75.75 0 0 1 .75-.75h-.5Z" clipRule="evenodd" />
              </svg>
              Start Timer
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || (isAdhoc && !adhocCanSubmit)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : (submitLabel ?? (isAdhoc ? 'Log Paper' : 'Save'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}
