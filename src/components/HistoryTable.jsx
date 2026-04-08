import SubjectBadge from './SubjectBadge';
import PbBadge from './PbBadge';
import { formatTime } from '../lib/timeUtils';

function calcPct(marks) {
  if (!marks) return null;
  const m = String(marks).match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (m) return Math.round(Number(m[1]) / Number(m[2]) * 100);
  return null;
}

export default function HistoryTable({
  filtered, pbSet, hasMore, loadingMore, onLoadMore,
  onEdit,
  onDelete,
}) {
  return (
    <div>
      {/* Mobile card list */}
      <ul className="sm:hidden divide-y bg-[var(--color-surface)] rounded-xl border overflow-hidden">
        {filtered.map((p) => {
          const pct = calcPct(p.marks);
          return (
            <li key={p.id} className="px-4 py-3 space-y-1">
              <div className="flex items-start justify-between">
                <p className="font-medium text-[var(--color-text-primary)] text-sm">{p.displayName}</p>
                <div className="flex items-center gap-2 ml-2">
                  <button onClick={() => onEdit?.(p)} className="text-[var(--color-text-muted)] hover:text-indigo-500" title="Edit">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M17.414 2.586a2 2 0 0 0-2.828 0L3 14.172V17h2.828L17.414 5.414a2 2 0 0 0 0-2.828z" /></svg>
                  </button>
                  <button onClick={() => onDelete(p)} className="text-[var(--color-text-muted)] hover:text-red-500" title="Delete">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SubjectBadge subject={p.subject} />
                {p.grade && <span className="font-semibold text-indigo-600 text-sm">{p.grade}</span>}
                {p.marks && <span className="text-xs text-[var(--color-text-muted)]">{p.marks}{pct !== null ? ` (${pct}%)` : ''}</span>}
                {p.actualDurationSeconds != null && (
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">{formatTime(p.actualDurationSeconds)}</span>
                )}
                {pbSet?.has(p.id) && <PbBadge seconds={p.actualDurationSeconds} />}
                <span className="text-xs text-[var(--color-text-muted)]">{p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '—'}</span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden sm:block bg-[var(--color-surface)] rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface)] border-b text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
              <th className="px-4 py-3">Paper</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3">Marks</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => {
              const pct = calcPct(p.marks);
              return (
                <tr key={p.id} className="hover:bg-[var(--color-surface)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-text-primary)]">{p.displayName}</p>
                    {p.comment && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 max-w-xs truncate" title={p.comment}>{p.comment}</p>
                    )}
                  </td>
                  <td className="px-4 py-3"><SubjectBadge subject={p.subject} /></td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{p.weekId}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {p.marks ?? '—'}
                    {pct !== null && <span className="text-xs text-[var(--color-text-muted)] ml-1">({pct}%)</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.grade ? (
                      <span className="font-semibold text-indigo-600">{p.grade}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {p.actualDurationSeconds != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs">{formatTime(p.actualDurationSeconds)}</span>
                        {pbSet?.has(p.id) && <PbBadge seconds={p.actualDurationSeconds} />}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit?.(p)} className="text-[var(--color-text-muted)] hover:text-indigo-500" title="Edit">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M17.414 2.586a2 2 0 0 0-2.828 0L3 14.172V17h2.828L17.414 5.414a2 2 0 0 0 0-2.828z" /></svg>
                      </button>
                      <button onClick={() => onDelete(p)} className="text-[var(--color-text-muted)] hover:text-red-500" title="Delete">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-5 py-2 rounded-lg border text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
