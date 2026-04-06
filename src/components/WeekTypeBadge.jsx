const WEEK_STYLES = {
  'week-a':  { label: 'Week A',  classes: 'bg-sky-100 text-sky-700' },
  'week-b':  { label: 'Week B',  classes: 'bg-emerald-100 text-emerald-700' },
  'holiday': { label: 'Holiday', classes: 'bg-amber-100 text-amber-700' },
};

export default function WeekTypeBadge({ weekType, className = '' }) {
  const style = WEEK_STYLES[weekType] || { label: weekType || '—', classes: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${style.classes} ${className}`}>
      {style.label}
    </span>
  );
}
