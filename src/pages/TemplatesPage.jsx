import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubjects } from '../contexts/SubjectsContext';
import { getWeekTemplates, saveWeekTemplate, deleteWeekTemplate } from '../firebase/db';
import { useAsyncData } from '../hooks/useAsyncData';
import Modal from '../components/Modal';
import WeekGridEditor from '../components/WeekGridEditor';
import { inputCls as baseInputCls } from '../lib/styles';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function TemplatesPage() {
  const { currentUser } = useAuth();
  const { subjects } = useSubjects();

  const EMPTY_TEMPLATE = {
    templateName: '',
    subjects: subjects.map((s) => s.id),
    maxPapersPerSubject: 6,
    mostCommonPapersPerSubject: 2,
    maxTotalPapers: 16,
    breakDuration: 10,
    timeBlocks: [],
  };
  const [templates, setTemplates] = useState({});
  const [editing, setEditing] = useState(null); // { id, data }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { loading, data: loadedTemplates } = useAsyncData(
    () => getWeekTemplates(currentUser.uid),
    [currentUser.uid]
  );

  useEffect(() => {
    if (loadedTemplates) setTemplates(loadedTemplates);
  }, [loadedTemplates]);

  function openNew() {
    setEditing({ id: null, data: { ...EMPTY_TEMPLATE } });
    setError('');
  }

  function openEdit(id) {
    setEditing({ id, data: { ...templates[id] } });
    setError('');
  }

  async function handleSave() {
    if (!editing.data.templateName.trim()) { setError('Template name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const id = editing.id || editing.data.templateName.toLowerCase().replace(/\s+/g, '-');
      await saveWeekTemplate(currentUser.uid, id, editing.data);
      setTemplates((t) => ({ ...t, [id]: { id, ...editing.data } }));
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this template?')) return;
    try {
      await deleteWeekTemplate(currentUser.uid, id);
      setTemplates((t) => { const n = { ...t }; delete n[id]; return n; });
    } catch (e) {
      setError('Failed to delete: ' + e.message);
    }
  }

  const inputCls = baseInputCls;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Week Templates</h1>
        <button onClick={openNew}
          className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors flex-shrink-0 ml-4">
          + New Template
        </button>
      </div>

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm">Loading…</p>
      ) : Object.keys(templates).length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-sm">No templates yet. Create one to get started.</p>
      ) : (
        <div data-tutorial-id="templates-list" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(templates).map(([id, t], idx) => (
            <div key={id} {...(idx === 0 ? { 'data-tutorial-id': 'template-card-week-a' } : {})}
              className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 hover:border-[var(--color-border-strong)] transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t.templateName}</h3>
                <div className="flex gap-3 flex-shrink-0 ml-2">
                  <button onClick={() => openEdit(id)} className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">Edit</button>
                  <button onClick={() => handleDelete(id)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">Delete</button>
                </div>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] space-y-0.5">
                <p>Max/subject: <strong className="text-[var(--color-text-secondary)]">{t.maxPapersPerSubject}</strong> · Most common: <strong className="text-[var(--color-text-secondary)]">{t.mostCommonPapersPerSubject}</strong></p>
                <p>Max total: <strong className="text-[var(--color-text-secondary)]">{t.maxTotalPapers}</strong> · Break: <strong className="text-[var(--color-text-secondary)]">{t.breakDuration}min</strong></p>
                <p>{t.timeBlocks?.length || 0} time blocks</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Template' : 'New Template'} maxWidth="max-w-2xl">
        {editing && (
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{error}</div>}
            <Field label="Template Name">
              <input className={inputCls} value={editing.data.templateName}
                onChange={(e) => setEditing((s) => ({ ...s, data: { ...s.data, templateName: e.target.value } }))} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Max papers per subject">
                <input type="number" min="1" max="20" className={inputCls} value={editing.data.maxPapersPerSubject}
                  onChange={(e) => setEditing((s) => ({ ...s, data: { ...s.data, maxPapersPerSubject: Number(e.target.value) } }))} />
              </Field>
              <Field label="Most common per subject">
                <input type="number" min="1" max="20" className={inputCls} value={editing.data.mostCommonPapersPerSubject}
                  onChange={(e) => setEditing((s) => ({ ...s, data: { ...s.data, mostCommonPapersPerSubject: Number(e.target.value) } }))} />
              </Field>
              <Field label="Max total papers">
                <input type="number" min="1" max="50" className={inputCls} value={editing.data.maxTotalPapers}
                  onChange={(e) => setEditing((s) => ({ ...s, data: { ...s.data, maxTotalPapers: Number(e.target.value) } }))} />
              </Field>
              <Field label="Break duration (min)">
                <input type="number" min="0" max="60" className={inputCls} value={editing.data.breakDuration}
                  onChange={(e) => setEditing((s) => ({ ...s, data: { ...s.data, breakDuration: Number(e.target.value) } }))} />
              </Field>
            </div>
            <Field label="Subjects">
              <div className="flex flex-wrap gap-2 mt-1">
                {subjects.map((s) => {
                  const checked = (editing.data.subjects || []).includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => {
                        setEditing((prev) => {
                          const cur = prev.data.subjects || [];
                          const next = checked ? cur.filter((x) => x !== s.id) : [...cur, s.id];
                          return { ...prev, data: { ...prev.data, subjects: next } };
                        });
                      }} />
                      {s.label}
                    </label>
                  );
                })}
              </div>
            </Field>
            <Field label="Time Blocks">
              <WeekGridEditor value={editing.data.timeBlocks || []}
                onChange={(blocks) => setEditing((s) => ({ ...s, data: { ...s.data, timeBlocks: blocks } }))} />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
