import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import Modal from './Modal';
import SubjectBadge from './SubjectBadge';
import { GRADES, normaliseMarks } from '../lib/gradeUtils';
import { inputCls as baseInputCls } from '../lib/styles';
import { secsToInput, inputToSecs } from '../lib/timeUtils';
import { useSubjects } from '../contexts/SubjectsContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserSettings } from '../firebase/db';

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

  // Keep parent updated when initialTags change (best-effort; not controlled).
  // (We keep this component small and stateful to avoid wiring complexity.)

  if (!enabled) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
        Topics to review <span className="font-normal text-[var(--color-text-muted)]">(press Enter or comma to add)</span>
      </label>
      <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-white focus-within:ring-1 focus-within:ring-[var(--color-accent)]">
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

  function handleMarksBlur() {
    const { normalised, invalid } = normaliseMarks(marksRaw);
    if (invalid) {
      setMarksError('Enter marks as a number or fraction, e.g. 85/100');
    } else {
      setMarksError('');
      setMarksRaw(normalised);
    }
  }

  async function handleSave() {
    if (isAdhoc && !displayName.trim()) return;

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
        await onSubmit?.({
          completed,
          ...common,
        });
      } else if (isAdhoc) {
        await onSubmit?.({
          subject,
          displayName: displayName.trim(),
          completedAt: new Date((completedAt || todayStr) + 'T12:00:00').toISOString(),
          ...common,
        });
      } else if (isHistory) {
        await onSubmit?.({
          ...common,
        });
      }
    } finally {
      setSaving(false);
    }
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
            className="border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] bg-white text-[var(--color-text-primary)]"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={
        isAdhoc ? 'Log Paper' : isHistory ? 'Edit Completion' : 'Paper Details'
      }
    >
      <div className="space-y-4">
        {isAdhoc && (
          <>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>
                {subjectsList.map((id) => (
                  <option key={id} value={id}>{subjectMeta[id]?.label ?? id}</option>
                ))}
              </select>
            </div>
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
          <button
            onClick={handleSave}
            disabled={saving || (isAdhoc && !displayName.trim())}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : (submitLabel ?? (isAdhoc ? 'Log Paper' : 'Save'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}

