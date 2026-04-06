import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, addMonths, subMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { getTermCalendar, setWeekType, clearWeekType } from '../firebase/db';
import WeekTypeBadge from '../components/WeekTypeBadge';
import { useTutorial } from '../contexts/TutorialContext';
import { useAsyncData } from '../hooks/useAsyncData';

const WEEK_TYPES = [
  { value: 'week-a',  label: 'Week A',  templateId: 'week-a',  color: 'bg-sky-100 hover:bg-sky-200 border-sky-300' },
  { value: 'week-b',  label: 'Week B',  templateId: 'week-b',  color: 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300' },
  { value: 'holiday', label: 'Holiday', templateId: 'holiday', color: 'bg-amber-100 hover:bg-amber-200 border-amber-300' },
  { value: null,      label: 'Clear',   templateId: null,      color: 'bg-gray-100 hover:bg-gray-200 border-gray-300' },
];

const TYPE_CELL_COLORS = {
  'week-a':  'bg-sky-200 text-sky-800 border-sky-300',
  'week-b':  'bg-emerald-200 text-emerald-800 border-emerald-300',
  'holiday': 'bg-amber-200 text-amber-800 border-amber-300',
};

export default function TermSchedulePage() {
  const { currentUser } = useAuth();
  const { active, step, notifyActionDone } = useTutorial();
  const [calendar, setCalendar] = useState({});
  const [viewDate, setViewDate] = useState(new Date());
  const [selected, setSelected] = useState('week-a');

  const { loading, error, data } = useAsyncData(
    () => getTermCalendar(currentUser.uid),
    [currentUser.uid]
  );

  useEffect(() => {
    if (data) setCalendar(data);
  }, [data]);

  useEffect(() => {
    if (active && step?.key === 'TERM_SCHEDULE_PAINT' && Object.keys(calendar).length > 0) {
      notifyActionDone();
    }
  }, [active, step, calendar, notifyActionDone]);

  async function handleWeekClick(mondayDate) {
    const key = format(startOfWeek(mondayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (selected === null) {
      await clearWeekType(currentUser.uid, key);
      setCalendar((c) => { const n = { ...c }; delete n[key]; return n; });
    } else {
      const templateId = WEEK_TYPES.find((t) => t.value === selected)?.templateId || selected;
      await setWeekType(currentUser.uid, key, selected, templateId);
      setCalendar((c) => ({ ...c, [key]: { weekStart: key, weekType: selected, templateId } }));
    }
  }

  const months = [-1, 0, 1].map((offset) => addMonths(viewDate, offset));

  function renderMonth(monthDate) {
    const weeks = eachWeekOfInterval(
      { start: startOfMonth(monthDate), end: endOfMonth(monthDate) },
      { weekStartsOn: 1 }
    );
    return (
      <div key={format(monthDate, 'yyyy-MM')} className="bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 text-center">{format(monthDate, 'MMMM yyyy')}</h3>
        <div className="space-y-1">
          {weeks.map((weekMon) => {
            const key = format(weekMon, 'yyyy-MM-dd');
            const entry = calendar[key];
            const cellColor = entry ? TYPE_CELL_COLORS[entry.weekType] : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface)] border-[var(--color-border)]';
            return (
              <button key={key} onClick={() => handleWeekClick(weekMon)}
                className={'w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium border transition-colors ' + cellColor}>
                <span className="text-[var(--color-text-muted)]">w/c {format(weekMon, 'd MMM')}</span>
                {entry && <span className="ml-2 font-semibold">{WEEK_TYPES.find((t) => t.value === entry.weekType)?.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Term Schedule</h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setViewDate((d) => subMonths(d, 3))}
            className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">
            Prev
          </button>
          <button onClick={() => setViewDate(new Date())}
            className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">
            Today
          </button>
          <button onClick={() => setViewDate((d) => addMonths(d, 3))}
            className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors">
            Next
          </button>
        </div>
      </div>

      <div data-tutorial-id="term-schedule-paint-controls" className="flex flex-wrap gap-2 mb-5">
        <span className="text-sm text-[var(--color-text-muted)] self-center">Paint as:</span>
        {WEEK_TYPES.map((t) => (
          <button key={String(t.value)} onClick={() => setSelected(t.value)}
            className={'px-3 py-1.5 rounded-[var(--radius-md)] border text-sm font-medium transition-all ' + t.color +
              (selected === t.value ? ' ring-2 ring-offset-1 ring-[var(--color-accent)]' : '')}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">{error}</div>}

      {loading ? (
        <p className="text-[var(--color-text-muted)] text-sm">Loading…</p>
      ) : (
        <div data-tutorial-id="term-schedule-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {months.map(renderMonth)}
        </div>
      )}

      <div className="mt-4 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 flex flex-wrap gap-5">
        {['week-a', 'week-b', 'holiday'].map((type) => {
          const count = Object.values(calendar).filter((e) => e.weekType === type).length;
          return (
            <div key={type} className="flex items-center gap-2 text-sm">
              <WeekTypeBadge weekType={type} />
              <span className="text-[var(--color-text-secondary)]">{count} week{count !== 1 ? 's' : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
