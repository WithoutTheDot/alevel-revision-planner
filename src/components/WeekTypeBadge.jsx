const WEEK_STYLES = {
  'week-a':  { label: 'Week A',  classes: 'bg-sky-100 text-sky-700' },
  'week-b':  { label: 'Week B',  classes: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]' },
  'holiday': { label: 'Holiday', classes: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]' },
};

export default function WeekTypeBadge({ weekType, className = '' }) {
  const style = WEEK_STYLES[weekType] || { label: weekType || '—', classes: 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${style.classes} ${className}`}>
      {style.label}
    </span>
  );
}
