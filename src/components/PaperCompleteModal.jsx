import { useState } from 'react';
import Modal from './Modal';
import SubjectBadge from './SubjectBadge';
import { GRADES, normaliseMarks } from '../lib/gradeUtils';
import { inputCls as baseInputCls } from '../lib/styles';

import { formatTime, secsToInput, inputToSecs } from '../lib/timeUtils';

export default function PaperCompleteModal({ paper, index, onSave, onClose, actualDurationSeconds }) {
  const [completed, setCompleted] = useState(paper.completed ?? false);
  // Support existing plain-number marks as well as fraction strings
  const initialMarks = paper.marks !== null && paper.marks !== undefined ? String(paper.marks) : '';
  const [marksRaw, setMarksRaw] = useState(initialMarks);
  const [marksError, setMarksError] = useState('');
  const [grade, setGrade] = useState(paper.grade ?? '');
  const [comment, setComment] = useState(paper.comment ?? '');
  const [durationInput, setDurationInput] = useState(secsToInput(actualDurationSeconds));
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

  const { score, outOf, invalid: marksInvalid } = normaliseMarks(marksRaw);
  const percentage = score !== null && outOf ? Math.round(score / outOf * 100) : null;

  async function handleSave() {
    const { normalised, invalid } = normaliseMarks(marksRaw);
    if (invalid) {
      setMarksError('Enter marks as a number or fraction, e.g. 85/100');
      return;
    }
    setSaving(true);
    await onSave(index, {
      completed,
      marks: normalised || null,
      grade: grade || null,
      comment: comment.trim() || null,
      actualDurationSeconds: inputToSecs(durationInput),
    });
    setSaving(false);
  }

  const inputCls = baseInputCls;

  return (
    <Modal open onClose={onClose} title="Paper Details">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)]">
          <SubjectBadge subject={paper.subject} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--color-text-primary)] text-sm">{paper.displayName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{paper.duration} min</p>
            <div className="mt-1.5">
              <label className="block text-xs text-[var(--color-text-muted)] mb-0.5">Time taken (MM:SS or minutes)</label>
              <input type="text" placeholder="e.g. 85:00" value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                className="border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] bg-white text-[var(--color-text-primary)]" />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)}
            className="w-4 h-4 rounded text-[var(--color-accent)]" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Mark as completed</span>
        </label>

        {completed && (
          <>
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Marks</label>
                <input type="text" placeholder="e.g. 13/50 or 72" value={marksRaw}
                  onChange={(e) => { setMarksRaw(e.target.value); setMarksError(''); }}
                  onBlur={handleMarksBlur}
                  className={inputCls + (marksError ? ' !border-red-400' : '')} />
                {marksError && <p className="text-xs text-red-500 mt-1">{marksError}</p>}
                {!marksError && percentage !== null && <p className="text-xs text-[var(--color-text-muted)] mt-1">{percentage}%</p>}
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
              <textarea rows={3} placeholder="e.g. Struggled with integration by parts…"
                value={comment} onChange={(e) => setComment(e.target.value)}
                className={inputCls + ' resize-none'} />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
