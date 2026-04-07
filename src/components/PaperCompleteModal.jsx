import { useState } from 'react';
import Modal from './Modal';
import SubjectBadge from './SubjectBadge';
import { GRADES, normaliseMarks } from '../lib/gradeUtils';
import { inputCls as baseInputCls } from '../lib/styles';

import { secsToInput, inputToSecs } from '../lib/timeUtils';

export default function PaperCompleteModal({ paper, index, onSave, onClose, actualDurationSeconds, reviewModeEnabled }) {
  const [completed, setCompleted] = useState(paper.completed ?? false);
  // Support existing plain-number marks as well as fraction strings
  const initialMarks = paper.marks !== null && paper.marks !== undefined ? String(paper.marks) : '';
  const [marksRaw, setMarksRaw] = useState(initialMarks);
  const [marksError, setMarksError] = useState('');
  const [grade, setGrade] = useState(paper.grade ?? '');
  const [comment, setComment] = useState(paper.comment ?? '');
  const [durationInput, setDurationInput] = useState(secsToInput(actualDurationSeconds));
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState(paper.reviewTopics ?? []);
  const [tagInput, setTagInput] = useState('');

  function handleMarksBlur() {
    const { normalised, invalid } = normaliseMarks(marksRaw);
    if (invalid) {
      setMarksError('Enter marks as a number or fraction, e.g. 85/100');
    } else {
      setMarksError('');
      setMarksRaw(normalised);
    }
  }

  const { score, outOf } = normaliseMarks(marksRaw);
  const percentage = score !== null && outOf ? Math.round(score / outOf * 100) : null;

  function commitTagInput() {
    const val = tagInput.trim().toLowerCase().replace(/,+$/, '');
    if (val && !tags.includes(val)) {
      setTags((prev) => [...prev, val]);
    }
    setTagInput('');
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTagInput();
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function removeTag(tag) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSave() {
    const { normalised, invalid } = normaliseMarks(marksRaw);
    if (invalid) {
      setMarksError('Enter marks as a number or fraction, e.g. 85/100');
      return;
    }
    // Commit any partially typed tag before saving
    const finalTags = (() => {
      const val = tagInput.trim().toLowerCase().replace(/,+$/, '');
      if (val && !tags.includes(val)) return [...tags, val];
      return tags;
    })();
    setSaving(true);
    await onSave(index, {
      completed,
      marks: normalised || null,
      grade: grade || null,
      comment: comment.trim() || null,
      actualDurationSeconds: inputToSecs(durationInput),
      reviewTopics: completed && reviewModeEnabled ? finalTags : [],
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
            {reviewModeEnabled && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Topics to review <span className="font-normal text-[var(--color-text-muted)]">(press Enter or comma to add)</span>
                </label>
                <div className={'flex flex-wrap gap-1.5 min-h-[38px] p-2 border border-[var(--color-border)] rounded-[var(--radius-sm)] bg-white focus-within:ring-1 focus-within:ring-[var(--color-accent)]'}>
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)]">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] leading-none"
                        aria-label={`Remove ${tag}`}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
            )}
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
