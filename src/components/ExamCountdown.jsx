import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useSubjects } from '../contexts/SubjectsContext';

export default function ExamCountdown({ exams }) {
  const { subjectMeta } = useSubjects();

  if (exams.length === 0) return null;

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm">
      <h2 className="font-semibold text-[var(--color-text-secondary)] mb-3">Upcoming Exams</h2>
      <div className="space-y-3">
        {exams.map((e) => {
          const days = differenceInCalendarDays(parseISO(e.date), new Date());
          const urgency = days <= 7 
            ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/20 text-[var(--color-danger-text)]' 
            : days <= 30 
              ? 'bg-[var(--color-warning-bg)] border-[var(--color-warning-text)]/20 text-[var(--color-warning-text)]' 
              : 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)]/20 text-[var(--color-accent-text)]';
          
          const highlightColor = days <= 7 
            ? 'text-[var(--color-danger)]' 
            : days <= 30 
              ? 'text-[var(--color-warning-text)]' 
              : 'text-[var(--color-accent)]';

          return (
            <div key={e.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${urgency}`}>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{e.paperLabel}</p>
                <p className="text-xs opacity-80">
                  {subjectMeta[e.subject]?.label || e.subject} · {e.date} at {e.time}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className={`text-xl font-extrabold ${highlightColor}`}>
                  {days === 0 ? 'Today!' : `${days}d`}
                </p>
                <p className="text-xs opacity-70">to go</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
