import { useState } from 'react';
import { format } from 'date-fns';
import Modal from './Modal';
import { GRADES, normaliseMarks } from '../lib/gradeUtils';
import { inputCls as baseInputCls } from '../lib/styles';

export default function LogPaperModal({ subjects, onSave, onClose, onStartTimer }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [subject, setSubject] = useState(subjects[0]?.id ?? '');
  const [displayName, setDisplayName] = useState('');
  const [completedAt, setCompletedAt] = useState(todayStr);
  const [marksRaw, setMarksRaw] = useState('');
  const [marksError, setMarksError] = useState('');
  const [grade, setGrade] = useState('');
  const [comment, setComment] = useState('');
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
    if (!displayName.trim()) return;
    const { normalised, invalid } = normaliseMarks(marksRaw);
    if (invalid) {
      setMarksError('Enter marks as a number or fraction, e.g. 85/100');
      return;
    }
    setSaving(true);
    await onSave({
      subject,
      displayName: displayName.trim(),
      completedAt: new Date(completedAt + 'T12:00:00').toISOString(),
      marks: normalised || null,
      grade: grade || null,
      comment: comment.trim() || null,
    });
    setSaving(false);
  }

  const inputCls = baseInputCls;

  return (
    <Modal open onClose={onClose} title="Log Additional Paper">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Record a paper you completed outside your scheduled timetable. XP is awarded (up to 3 ad-hoc papers per day).
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Paper name / description</label>
          <input
            type="text"
            placeholder="e.g. AQA 2023 Paper 1"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date completed</label>
          <input
            type="date"
            value={completedAt}
            max={todayStr}
            onChange={(e) => setCompletedAt(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marks (optional)</label>
            <input
              type="text"
              placeholder="e.g. 72/100"
              value={marksRaw}
              onChange={(e) => { setMarksRaw(e.target.value); setMarksError(''); }}
              onBlur={handleMarksBlur}
              className={inputCls + (marksError ? ' border-red-400' : '')}
            />
            {marksError && <p className="text-xs text-red-500 mt-1">{marksError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade (optional)</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls}>
              {GRADES.map((g) => <option key={g} value={g}>{g || '—'}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            rows={3}
            placeholder="e.g. Struggled with Q5, topics to revisit…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={inputCls + ' resize-none'}
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Cancel</button>
          {onStartTimer && (
            <button
              onClick={() => {
                if (!displayName.trim()) return;
                onStartTimer({ subject, displayName: displayName.trim() });
              }}
              disabled={!displayName.trim()}
              className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
            >
              Start Timer
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Logging…' : 'Log Paper'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
