import { useState, useEffect } from 'react';
import { deleteUser } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects } from '../contexts/SubjectsContext';
import {
  getUserSettings, updateUserSettings,
  getPaperDurations, setPaperDuration,
  exportAllUserData,
  getCustomPapers, saveCustomPaper, deleteCustomPaper,
  getExamTimetable, addExamEntry, updateExamEntry, deleteExamEntry,
  updateDisplayName,
} from '../firebase/db';
import { BUILT_IN_FAMILIES, BUILT_IN_FAMILIES_MAP, recomputePaths } from '../lib/builtInFamilies';
import { getDefaultDurationForPath } from '../lib/generateSchedule';
import { ALL_SUBJECTS } from '../lib/allSubjects';
import Modal from '../components/Modal';
import { inputCls as baseInputCls } from '../lib/styles';
import { DEFAULT_PAPER_DURATION_MINS } from '../lib/constants';
import { useAsyncData } from '../hooks/useAsyncData';

const TABS = ['General', 'Papers', 'Subjects', 'Exams', 'Account'];

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const EMPTY_FAMILY = { familyName: '', subject: 'maths', yearStart: 2017, yearEnd: 2024, duration: 90 };

/**
 * Build the merged list of families to display, per subject.
 * - Built-in families: use overrides from Firestore if present; skip if deleted.
 * - Pure custom families: append after built-ins for the same subject.
 * Returns array of display objects: { id, name, yearStart, yearEnd, yearLabel, paperPaths, isBuiltIn, hasOverride }
 */
function buildDisplayFamilies(firestoreMap) {
  const builtInIds = new Set(BUILT_IN_FAMILIES.map((f) => f.id));
  const result = [];

  for (const fam of BUILT_IN_FAMILIES) {
    const override = firestoreMap[fam.id];
    if (override?.deleted) continue; // user hid this family

    const name      = override?.familyName ?? fam.name;
    const subject   = override?.subject    ?? fam.subject;
    const yearStart = override?.yearStart  ?? fam.yearStart;
    const yearEnd   = override?.yearEnd    ?? fam.yearEnd;
    const yearLabel = (yearStart !== null && yearEnd !== null) ? `${yearStart}–${yearEnd}` : null;

    // Recompute paper paths using built-in's pathFn with possibly-new year range
    const paperPaths = recomputePaths(fam, yearStart, yearEnd);

    result.push({ id: fam.id, name, subject, yearStart, yearEnd, yearLabel, paperPaths, isBuiltIn: true, hasOverride: !!override });
  }

  // Pure custom (not overriding a built-in)
  for (const [id, fam] of Object.entries(firestoreMap)) {
    if (builtInIds.has(id) || fam.deleted) continue;
    const paperPaths = [];
    for (let y = fam.yearStart; y <= fam.yearEnd; y++) paperPaths.push(`custom-${id}-${y}`);
    result.push({
      id, name: fam.familyName, subject: fam.subject,
      yearStart: fam.yearStart, yearEnd: fam.yearEnd,
      yearLabel: `${fam.yearStart}–${fam.yearEnd}`,
      paperPaths, isBuiltIn: false, hasOverride: false,
    });
  }

  return result;
}

export default function SettingsPage() {
  const { currentUser, profile, logout, refreshProfile } = useAuth();
  const { subjects, subjectMeta, addSubject, removeSubject } = useSubjects();
  const [tab, setTab] = useState('General');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [settings, setSettings] = useState({
    defaultPaperDuration: 90, breakDuration: 10, calendarStartHour: 6, calendarEndHour: 23,
  });
  const [durations, setDurations] = useState({ _default: 90 });
  const [firestoreFamilies, setFirestoreFamilies] = useState({}); // raw Firestore map
  const [examEntries, setExamEntries] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [examModal, setExamModal] = useState(null); // null | { id?, data }
  const [examSaving, setExamSaving] = useState(false);

  // Modal: null | { id, data, isBuiltIn }
  const [familyModal, setFamilyModal] = useState(null);
  const [familySaving, setFamilySaving] = useState(false);

  const { loading, error: loadError } = useAsyncData(async () => {
    const [s, d, cp, exams] = await Promise.all([
      getUserSettings(currentUser.uid),
      getPaperDurations(currentUser.uid),
      getCustomPapers(currentUser.uid),
      getExamTimetable(currentUser.uid),
    ]);
    setSettings((prev) => ({ ...prev, ...s }));
    const parsed = {};
    for (const [k, v] of Object.entries(d)) parsed[k] = Number(v);
    setDurations(parsed);
    setFirestoreFamilies(cp);
    setExamEntries(exams);
  }, [currentUser.uid]);

  useEffect(() => {
    setDisplayNameInput(profile?.displayName || currentUser.email.split('@')[0]);
  }, [profile, currentUser.email]);

  async function saveDisplayName() {
    const name = displayNameInput.trim() || currentUser.email.split('@')[0];
    setDisplayNameSaving(true);
    try {
      await updateDisplayName(currentUser.uid, name);
      await refreshProfile();
      setDisplayNameSaved(true);
      setTimeout(() => setDisplayNameSaved(false), 2000);
    } catch (e) {
      setError('Failed to save display name: ' + e.message);
    } finally {
      setDisplayNameSaving(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setError('');
    try {
      await updateUserSettings(currentUser.uid, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveFamilyDuration(paperPaths, value) {
    const mins = Number(value);
    if (isNaN(mins) || mins < 1) return;
    setDurations((d) => { const next = { ...d }; for (const pp of paperPaths) next[pp] = mins; return next; });
    await Promise.all(paperPaths.map((pp) => setPaperDuration(currentUser.uid, pp, mins)));
  }

  function familyDuration(paperPaths) {
    for (const pp of paperPaths) {
      if (durations[pp] !== undefined) return durations[pp];
    }
    return '';
  }

  async function resetAllDurations() {
    if (!window.confirm('Reset all custom durations to the default?')) return;
    try {
      await setPaperDuration(currentUser.uid, '_default', DEFAULT_PAPER_DURATION_MINS);
      setDurations({ _default: DEFAULT_PAPER_DURATION_MINS });
    } catch (e) {
      setError('Failed to reset: ' + e.message);
    }
  }

  async function handleLogout() {
    try { await logout(); } catch (e) { setError('Logout failed: ' + e.message); }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Are you sure you want to permanently delete your account? All your data will be lost. This cannot be undone.')) return;
    try {
      await deleteUser(currentUser);
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        setError('For security, please log out and log back in before deleting your account.');
      } else {
        setError('Failed to delete account: ' + e.message);
      }
    }
  }

  async function handleExport() {
    try {
      const data = await exportAllUserData(currentUser.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alevel-planner-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Export failed: ' + e.message);
    }
  }

  // ── Family CRUD ─────────────────────────────────────────────────────────────

  function openNewFamily() {
    setFamilyModal({ id: null, isBuiltIn: false, data: { ...EMPTY_FAMILY } });
  }

  function openEditFamily(displayFam) {
    setFamilyModal({
      id: displayFam.id,
      isBuiltIn: displayFam.isBuiltIn,
      data: {
        familyName: displayFam.name,
        subject: displayFam.subject,
        yearStart: displayFam.yearStart ?? 2017,
        yearEnd: displayFam.yearEnd ?? 2024,
        duration: familyDuration(displayFam.paperPaths) || durations._default || 120,
      },
    });
  }

  async function handleSaveFamily() {
    const { id, isBuiltIn, data } = familyModal;
    if (!data.familyName.trim()) return;
    setFamilySaving(true);
    try {
      const familyId = id || slugify(data.familyName);
      const clean = {
        familyName: data.familyName.trim(),
        subject: data.subject,
        yearStart: Number(data.yearStart),
        yearEnd: Number(data.yearEnd),
        duration: Number(data.duration),
      };

      await saveCustomPaper(currentUser.uid, familyId, clean);

      // Compute the paper paths for this save (respects new year range)
      let paperPaths;
      if (isBuiltIn) {
        const builtInFam = BUILT_IN_FAMILIES_MAP.get(familyId);
        paperPaths = recomputePaths(builtInFam, clean.yearStart, clean.yearEnd);
      } else {
        paperPaths = [];
        for (let y = clean.yearStart; y <= clean.yearEnd; y++) paperPaths.push(`custom-${familyId}-${y}`);
      }

      // Seed durations for all years
      await Promise.all(paperPaths.map((pp) => setPaperDuration(currentUser.uid, pp, clean.duration)));
      setDurations((d) => { const next = { ...d }; for (const pp of paperPaths) next[pp] = clean.duration; return next; });
      setFirestoreFamilies((f) => ({ ...f, [familyId]: { id: familyId, ...clean } }));
      setFamilyModal(null);
    } catch (e) {
      setError('Failed to save: ' + e.message);
    } finally {
      setFamilySaving(false);
    }
  }

  async function handleDeleteFamily(displayFam) {
    const verb = displayFam.isBuiltIn ? 'Hide' : 'Delete';
    if (!window.confirm(`${verb} "${displayFam.name}"?`)) return;
    try {
      if (displayFam.isBuiltIn) {
        // Tombstone — keeps the Firestore doc but hides the family from display
        await saveCustomPaper(currentUser.uid, displayFam.id, { deleted: true });
        setFirestoreFamilies((f) => ({ ...f, [displayFam.id]: { deleted: true } }));
      } else {
        await deleteCustomPaper(currentUser.uid, displayFam.id, displayFam.yearStart, displayFam.yearEnd);
        setFirestoreFamilies((f) => { const n = { ...f }; delete n[displayFam.id]; return n; });
        setDurations((d) => {
          const next = { ...d };
          for (const pp of displayFam.paperPaths) delete next[pp];
          return next;
        });
      }
    } catch (e) {
      setError('Failed to delete: ' + e.message);
    }
  }

  // ── Derived display data ────────────────────────────────────────────────────

  const allFamilies = buildDisplayFamilies(firestoreFamilies);
  const familiesBySubject = subjects.map(({ id }) => ({
    subject: id,
    families: allFamilies.filter((f) => f.subject === id),
  }));

  // ── Exam CRUD ────────────────────────────────────────────────────────────────

  const EMPTY_EXAM = { subject: subjects[0]?.id || '', paperLabel: '', date: '', time: '09:00', durationMins: 120 };

  function openNewExam() { setExamModal({ id: null, data: { ...EMPTY_EXAM } }); }
  function openEditExam(entry) {
    setExamModal({ id: entry.id, data: { subject: entry.subject, paperLabel: entry.paperLabel, date: entry.date, time: entry.time, durationMins: entry.durationMins } });
  }

  async function handleSaveExam() {
    if (!examModal.data.paperLabel.trim() || !examModal.data.date) return;
    setExamSaving(true);
    try {
      const clean = { ...examModal.data, durationMins: Number(examModal.data.durationMins) };
      if (examModal.id) {
        await updateExamEntry(currentUser.uid, examModal.id, clean);
        setExamEntries((prev) => prev.map((e) => e.id === examModal.id ? { ...e, ...clean } : e));
      } else {
        const ref = await addExamEntry(currentUser.uid, clean);
        setExamEntries((prev) => [...prev, { id: ref.id, ...clean }].sort((a, b) => a.date.localeCompare(b.date)));
      }
      setExamModal(null);
    } catch (e) {
      setError('Failed to save exam entry: ' + e.message);
    } finally {
      setExamSaving(false);
    }
  }

  async function handleDeleteExam(id) {
    if (!window.confirm('Delete this exam entry?')) return;
    try {
      await deleteExamEntry(currentUser.uid, id);
      setExamEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError('Failed to delete: ' + e.message);
    }
  }

  const inputCls = baseInputCls;
  const miniInput = 'border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-center bg-white text-[var(--color-text-primary)]';

  function FamilyRow({ displayFam, subject }) {
    const dur = familyDuration(displayFam.paperPaths);
    const smartDefault = getDefaultDurationForPath(displayFam.paperPaths[0] ?? '', subject);
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border)] last:border-b-0">
        <div className="flex-1 min-w-0">
          <span className="text-sm text-[var(--color-text-primary)]">{displayFam.name}</span>
          {displayFam.yearLabel && (
            <span className="text-xs text-[var(--color-text-muted)] ml-2">{displayFam.yearLabel}</span>
          )}
          {displayFam.hasOverride && (
            <span className="text-xs text-[var(--color-accent)] ml-1.5">edited</span>
          )}
        </div>
        <input
          type="number" min="1" max="300"
          placeholder={String(smartDefault)}
          className={miniInput}
          defaultValue={dur}
          key={`${displayFam.id}-${dur}`}
          onBlur={(e) => { if (e.target.value) saveFamilyDuration(displayFam.paperPaths, e.target.value); }}
        />
        <span className="text-xs text-[var(--color-text-muted)] w-6">min</span>
        <div className="flex gap-2 flex-shrink-0 w-16 justify-end">
          <button onClick={() => openEditFamily(displayFam)} className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">Edit</button>
          <button onClick={() => handleDeleteFamily(displayFam)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">
            {displayFam.isBuiltIn ? 'Hide' : 'Delete'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">Settings</h1>

      <div className="flex gap-0 mb-6 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={'px-4 py-2 text-sm font-medium border-b-2 transition-colors ' +
              (tab === t
                ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]')}>
            {t}
          </button>
        ))}
      </div>

      {(error || loadError) && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{error || loadError}</div>}

      {loading ? <p className="text-gray-400 text-sm">Loading...</p> : (
        <>
          {/* ── General ── */}
          {tab === 'General' && (
            <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 space-y-4">
              {durations._default < 75 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-[var(--radius-md)] text-sm flex items-start justify-between gap-3">
                  <span>Default duration is <strong>{durations._default} min</strong>. Most A-level papers are 120–150 min.</span>
                  <button
                    onClick={async () => { await setPaperDuration(currentUser.uid, '_default', 120); setDurations((d) => ({ ...d, _default: 120 })); }}
                    className="shrink-0 underline font-medium cursor-pointer hover:text-amber-900 text-sm whitespace-nowrap"
                  >Set to 120 min</button>
                </div>
              )}
              <Field label="Default paper duration (minutes)">
                <input type="number" min="1" max="300" className={inputCls}
                  value={durations._default || 120}
                  onChange={(e) => { const n = Number(e.target.value); if (!isNaN(n) && n >= 1) setDurations((d) => ({ ...d, _default: n })); }}
                  onBlur={(e) => { if (e.target.value) setPaperDuration(currentUser.uid, '_default', Number(e.target.value)); }} />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">A-level papers are typically 120–150 min.</p>
              </Field>
              <Field label="Break duration between papers (minutes)">
                <input type="number" min="0" max="60" className={inputCls}
                  value={settings.breakDuration}
                  onChange={(e) => setSettings((s) => ({ ...s, breakDuration: Number(e.target.value) }))} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Calendar start hour">
                  <input type="number" min="0" max="12" className={inputCls}
                    value={settings.calendarStartHour}
                    onChange={(e) => setSettings((s) => ({ ...s, calendarStartHour: Number(e.target.value) }))} />
                </Field>
                <Field label="Calendar end hour">
                  <input type="number" min="12" max="24" className={inputCls}
                    value={settings.calendarEndHour}
                    onChange={(e) => setSettings((s) => ({ ...s, calendarEndHour: Number(e.target.value) }))} />
                </Field>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={saveSettings} disabled={saving}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {saved && <span className="text-emerald-600 text-sm">Saved</span>}
              </div>
            </div>
          )}

          {/* ── Papers ── */}
          {tab === 'Papers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-secondary)]">Set exam duration per paper family.</p>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <button onClick={resetAllDurations} className="text-xs text-[var(--color-danger)] hover:opacity-70">Reset all</button>
                  <button onClick={openNewFamily}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors">
                    + Add Family
                  </button>
                </div>
              </div>

              {familiesBySubject.map(({ subject, families }) => {
                if (families.length === 0) return null;
                return (
                  <div key={subject} className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
                    <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
                      <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                        {subjectMeta[subject]?.label || subject}
                      </h3>
                      <span className="text-xs text-[var(--color-text-muted)]">Duration</span>
                    </div>
                    <div className="px-4 py-1">
                      {families.map((f) => <FamilyRow key={f.id} displayFam={f} subject={subject} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Subjects ── */}
          {tab === 'Subjects' && (
            <div className="space-y-4">
              <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
                {subjects.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`} />
                    <span className="flex-1 text-sm text-[var(--color-text-primary)]">{s.label}</span>
                    <button onClick={() => removeSubject(s.id)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">Remove</button>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Add subject</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_SUBJECTS.filter((a) => !subjects.find((s) => s.id === a.id)).map((a) => (
                    <button key={a.id} onClick={() => addSubject(a)}
                      className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-subtle)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-text)] transition-colors">
                      + {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Exams ── */}
          {tab === 'Exams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-secondary)]">Exam dates appear on the calendar and count down on the dashboard.</p>
                <button onClick={openNewExam}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] flex-shrink-0 ml-4 transition-colors">
                  + Add Exam
                </button>
              </div>
              {examEntries.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No exam entries yet.</p>
              ) : (
                <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
                  {examEntries.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{e.paperLabel}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{subjectMeta[e.subject]?.label || e.subject} · {e.date} {e.time} · {e.durationMins}min</p>
                      </div>
                      <button onClick={() => openEditExam(e)} className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">Edit</button>
                      <button onClick={() => handleDeleteExam(e.id)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Account ── */}
          {tab === 'Account' && (
            <div className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">Signed in as <strong className="text-[var(--color-text-primary)]">{currentUser.email}</strong></p>
              <div className="space-y-2">
                <Field label="Display name">
                  <input className={inputCls} placeholder="How you appear on leaderboards"
                    value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} maxLength={40} />
                </Field>
                <div className="flex items-center gap-3">
                  <button onClick={saveDisplayName} disabled={displayNameSaving}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
                    {displayNameSaving ? 'Saving…' : 'Save name'}
                  </button>
                  {displayNameSaved && <span className="text-emerald-600 text-sm">Saved</span>}
                </div>
              </div>
              <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Export data</p>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Download all your data as a JSON file.</p>
                  <button onClick={handleExport}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">
                    Download backup
                  </button>
                </div>
                <div className="border-t border-[var(--color-border)] pt-3 space-y-3">
                  <button onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">
                    Log out
                  </button>
                  <div className="border-t border-[var(--color-border)] pt-3">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Danger zone</p>
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">Permanently delete your account and all data. This cannot be undone.</p>
                    <button onClick={handleDeleteAccount}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-red-50 transition-colors">
                      Delete account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Exam modal ── */}
      <Modal
        open={!!examModal}
        onClose={() => setExamModal(null)}
        title={examModal?.id ? 'Edit Exam Entry' : 'Add Exam Entry'}
        maxWidth="max-w-md"
      >
        {examModal && (
          <div className="space-y-4">
            <Field label="Paper / Exam label">
              <input className={inputCls} placeholder="e.g. Pure Mathematics Paper 1"
                value={examModal.data.paperLabel}
                onChange={(e) => setExamModal((m) => ({ ...m, data: { ...m.data, paperLabel: e.target.value } }))} />
            </Field>
            <Field label="Subject">
              <select className={inputCls} value={examModal.data.subject}
                onChange={(e) => setExamModal((m) => ({ ...m, data: { ...m.data, subject: e.target.value } }))}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date">
                <input type="date" className={inputCls} value={examModal.data.date}
                  onChange={(e) => setExamModal((m) => ({ ...m, data: { ...m.data, date: e.target.value } }))} />
              </Field>
              <Field label="Time">
                <input type="time" className={inputCls} value={examModal.data.time}
                  onChange={(e) => setExamModal((m) => ({ ...m, data: { ...m.data, time: e.target.value } }))} />
              </Field>
            </div>
            <Field label="Duration (minutes)">
              <input type="number" min="1" max="300" className={inputCls} value={examModal.data.durationMins}
                onChange={(e) => setExamModal((m) => ({ ...m, data: { ...m.data, durationMins: Number(e.target.value) } }))} />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setExamModal(null)} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">Cancel</button>
              <button onClick={handleSaveExam} disabled={examSaving || !examModal.data.paperLabel.trim() || !examModal.data.date}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
                {examSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Family modal ── */}
      <Modal
        open={!!familyModal}
        onClose={() => setFamilyModal(null)}
        title={familyModal?.id
          ? (familyModal.isBuiltIn ? 'Edit Paper Family' : 'Edit Custom Family')
          : 'Add Paper Family'}
        maxWidth="max-w-md"
      >
        {familyModal && (
          <div className="space-y-4">
            <Field label="Family name">
              <input className={inputCls} placeholder="e.g. OCR Pure"
                value={familyModal.data.familyName}
                onChange={(e) => setFamilyModal((m) => ({ ...m, data: { ...m.data, familyName: e.target.value } }))} />
            </Field>
            <Field label="Subject">
              <select className={inputCls} value={familyModal.data.subject}
                onChange={(e) => setFamilyModal((m) => ({ ...m, data: { ...m.data, subject: e.target.value } }))}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
            {(familyModal.data.yearStart !== null) && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Year start">
                  <input type="number" min="2000" max="2030" className={inputCls}
                    value={familyModal.data.yearStart}
                    onChange={(e) => setFamilyModal((m) => ({ ...m, data: { ...m.data, yearStart: Number(e.target.value) } }))} />
                </Field>
                <Field label="Year end">
                  <input type="number" min="2000" max="2030" className={inputCls}
                    value={familyModal.data.yearEnd}
                    onChange={(e) => setFamilyModal((m) => ({ ...m, data: { ...m.data, yearEnd: Number(e.target.value) } }))} />
                </Field>
              </div>
            )}
            <Field label="Duration per paper (minutes)">
              <input type="number" min="1" max="300" className={inputCls}
                value={familyModal.data.duration}
                onChange={(e) => setFamilyModal((m) => ({ ...m, data: { ...m.data, duration: Number(e.target.value) } }))} />
            </Field>
            {familyModal.isBuiltIn && (
              <p className="text-xs text-gray-400">
                Changing years only affects which papers get this duration override — paper generation always uses the full built-in year range.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setFamilyModal(null)} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">Cancel</button>
              <button onClick={handleSaveFamily}
                disabled={familySaving || !familyModal.data.familyName.trim()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
                {familySaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
