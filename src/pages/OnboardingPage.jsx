import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { saveUserProfile, addExamEntry, saveWeekTemplate, updateDisplayName } from '../firebase/db';
import { ALL_SUBJECTS, COLOR_PALETTE, DEFAULT_SUBJECTS } from '../lib/allSubjects';
import WeekGridEditor from '../components/WeekGridEditor';

const STEPS = ['Choose Subjects', 'Exam Timetable', 'Week Templates'];

const EMPTY_EXAM_ROW = { subject: '', paperLabel: '', date: '', time: '09:00', durationMins: 120 };

const DEFAULT_WEEK_A_BLOCKS = [
  { day: 'Monday',    startTime: '09:00', endTime: '12:00' },
  { day: 'Monday',    startTime: '14:00', endTime: '17:00' },
  { day: 'Tuesday',   startTime: '09:00', endTime: '12:00' },
  { day: 'Wednesday', startTime: '09:00', endTime: '12:00' },
  { day: 'Wednesday', startTime: '14:00', endTime: '17:00' },
  { day: 'Thursday',  startTime: '09:00', endTime: '12:00' },
  { day: 'Friday',    startTime: '09:00', endTime: '12:00' },
];

const DEFAULT_WEEK_B_BLOCKS = [
  { day: 'Monday',  startTime: '09:00', endTime: '12:00' },
  { day: 'Tuesday', startTime: '09:00', endTime: '12:00' },
  { day: 'Thursday',startTime: '09:00', endTime: '12:00' },
  { day: 'Friday',  startTime: '09:00', endTime: '12:00' },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
            ${i < current ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)]' : i === current ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
            {i < current ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            ) : i + 1}
          </div>
          <span className={`text-sm ${i === current ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{s}</span>
          {i < STEPS.length - 1 && <div className="w-8 h-px bg-[var(--color-border)]" />}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const tutorial = useTutorial();

  const [step, setStep] = useState(0);
  // Step 3 has two sub-steps: 'a' and 'b'
  const [templateSubStep, setTemplateSubStep] = useState('a');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 0 — display name
  const [displayName, setDisplayName] = useState(() => currentUser?.email?.split('@')[0] ?? '');

  // Step 1 — subjects
  const [selectedIds, setSelectedIds] = useState(new Set(DEFAULT_SUBJECTS.map((s) => s.id)));

  // Step 2 — exam rows
  const [examRows, setExamRows] = useState([{ ...EMPTY_EXAM_ROW }]);

  // Step 3 — templates
  const [weekABlocks, setWeekABlocks] = useState(DEFAULT_WEEK_A_BLOCKS);
  const [weekBBlocks, setWeekBBlocks] = useState(DEFAULT_WEEK_B_BLOCKS);


  function toggleSubject(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleFinish() {
    setSaving(true);
    setError('');
    try {
      // Build subject list with palette colours
      const selected = ALL_SUBJECTS.filter((s) => selectedIds.has(s.id));
      const subjectsWithColors = selected.map((s, i) => ({
        id: s.id,
        label: s.label,
        ...COLOR_PALETTE[i % COLOR_PALETTE.length],
      }));
      const subjectIds = subjectsWithColors.map((s) => s.id);

      const finalDisplayName = displayName.trim() || currentUser.email.split('@')[0];

      // Save profile and sync display name to public stats atomically
      await Promise.all([
        saveUserProfile(currentUser.uid, {
          displayName: finalDisplayName,
          subjects: subjectsWithColors,
          onboardingComplete: true,
        }),
        updateDisplayName(currentUser.uid, finalDisplayName),
      ]);

      // Save exam entries (skip empty rows)
      const validExams = examRows.filter((r) => r.paperLabel.trim() && r.date);
      await Promise.all(validExams.map((r) => addExamEntry(currentUser.uid, {
        ...r,
        durationMins: Number(r.durationMins),
      })));

      // Save Week A and Week B templates
      await Promise.all([
        saveWeekTemplate(currentUser.uid, 'week-a', {
          templateName: 'Week A',
          subjects: subjectIds,
          maxPapersPerSubject: 6,
          mostCommonPapersPerSubject: 2,
          maxTotalPapers: 16,
          breakDuration: 10,
          timeBlocks: weekABlocks,
        }),
        saveWeekTemplate(currentUser.uid, 'week-b', {
          templateName: 'Week B',
          subjects: subjectIds,
          maxPapersPerSubject: 5,
          mostCommonPapersPerSubject: 2,
          maxTotalPapers: 14,
          breakDuration: 10,
          timeBlocks: weekBBlocks,
        }),
      ]);

      await refreshProfile();
      tutorial.start();
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError('Something went wrong: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedSubjectIds = [...selectedIds];
  const inputCls = 'w-full border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent placeholder:text-[var(--color-text-muted)] transition-shadow';

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-6">
      <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] w-full max-w-2xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Welcome! Let's get you set up.</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">This only takes a minute.</p>
        </div>

        <StepIndicator current={step} />

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{error}</div>}

        {/* ── Step 1: Choose subjects ── */}
        {step === 0 && (
          <div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Display Name</label>
              <input
                className={inputCls}
                placeholder="How you'll appear on leaderboards"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Visible to classmates — no grades are ever shared.</p>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">Select all the A-Level subjects you're studying.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
              {ALL_SUBJECTS.map((s) => {
                const checked = selectedIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSubject(s.id)}
                    className={`text-left px-3 py-2 rounded-[var(--radius-md)] border text-sm transition-colors ${
                      checked
                        ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent-text)] font-medium'
                        : 'bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]'
                    }`}
                  >
                    {checked && <span className="mr-1 text-[var(--color-accent)]">✓</span>}{s.label}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(1)}
                disabled={selectedIds.size === 0}
                className="bg-[var(--color-accent)] text-white px-6 py-2 rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Exam timetable ── */}
        {step === 1 && (
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">Add your real exam dates. They'll appear as banners on the calendar and count down on the dashboard.</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">You can skip this and add them later in Settings → Exams.</p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {examRows.map((row, i) => (
                <div key={i} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:items-center">
                  <div className="flex gap-2 sm:contents">
                    <select className="flex-1 sm:col-span-3 border border-[var(--color-border)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                      value={row.subject}
                      onChange={(e) => setExamRows((rows) => rows.map((r, j) => j === i ? { ...r, subject: e.target.value } : r))}>
                      <option value="">Subject</option>
                      {selectedSubjectIds.map((id) => {
                        const sub = ALL_SUBJECTS.find((a) => a.id === id);
                        return <option key={id} value={id}>{sub?.label || id}</option>;
                      })}
                    </select>
                    <input className="flex-1 sm:col-span-4 border border-[var(--color-border)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent placeholder:text-[var(--color-text-muted)]"
                      placeholder="Paper label" value={row.paperLabel}
                      onChange={(e) => setExamRows((rows) => rows.map((r, j) => j === i ? { ...r, paperLabel: e.target.value } : r))} />
                    <input type="date" className="flex-1 sm:col-span-3 border border-[var(--color-border)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                      value={row.date}
                      onChange={(e) => setExamRows((rows) => rows.map((r, j) => j === i ? { ...r, date: e.target.value } : r))} />
                    <button onClick={() => setExamRows((rows) => rows.filter((_, j) => j !== i))}
                      className="sm:col-span-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] text-lg leading-none px-1">×</button>
                  </div>
                  <div className="flex gap-2 sm:contents">
                    <input type="time" className="flex-1 sm:col-span-3 border border-[var(--color-border)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                      value={row.time}
                      onChange={(e) => setExamRows((rows) => rows.map((r, j) => j === i ? { ...r, time: e.target.value } : r))} />
                    <input type="number" min="1" max="300" placeholder="mins" className="w-24 sm:col-span-2 border border-[var(--color-border)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent placeholder:text-[var(--color-text-muted)]"
                      value={row.durationMins}
                      onChange={(e) => setExamRows((rows) => rows.map((r, j) => j === i ? { ...r, durationMins: Number(e.target.value) } : r))} />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setExamRows((r) => [...r, { ...EMPTY_EXAM_ROW }])}
              className="mt-3 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">+ Add row</button>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(0)} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">← Back</button>
              <button onClick={() => { setStep(2); setTemplateSubStep('a'); }}
                className="bg-[var(--color-accent)] text-white px-6 py-2 rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Week templates ── */}
        {step === 2 && (
          <div>
            {/* Week A / Week B sub-tab switcher */}
            <div className="flex gap-1 mb-4 border-b border-[var(--color-border)]">
              {(['a', 'b']).map((w) => (
                <button
                  key={w}
                  onClick={() => setTemplateSubStep(w)}
                  className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                    templateSubStep === w
                      ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  Week {w.toUpperCase()}
                </button>
              ))}
            </div>

            {templateSubStep === 'a' && (
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">Set your study time blocks for <strong>Week A</strong> — your busier week.</p>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">Click and drag on the grid to add blocks, or use the list below.</p>
                <WeekGridEditor value={weekABlocks} onChange={setWeekABlocks} />
                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep(1)} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">← Back</button>
                  <button onClick={() => setTemplateSubStep('b')}
                    className="bg-[var(--color-accent)] text-white px-6 py-2 rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors">
                    Next: Week B →
                  </button>
                </div>
              </div>
            )}

            {templateSubStep === 'b' && (
              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">Set your study time blocks for <strong>Week B</strong> — your lighter week.</p>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">You can always edit these later in Templates.</p>
                <WeekGridEditor value={weekBBlocks} onChange={setWeekBBlocks} />
                <div className="flex justify-between mt-6">
                  <button onClick={() => setTemplateSubStep('a')} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">← Week A</button>
                  <button
                    onClick={handleFinish}
                    disabled={saving}
                    className="bg-[var(--color-accent)] text-white px-6 py-2 rounded-[var(--radius-md)] text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Setting up…' : 'Finish & Go to Dashboard'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
