import SubjectBadge from './SubjectBadge';

export default function UpcomingPapers({ upcoming, onComplete, onStart }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm">
      <h2 className="font-semibold text-[var(--color-text-secondary)] mb-3">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">All scheduled papers done.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((p) => (
            <div key={p._idx} className="flex items-center justify-between py-3 px-3 bg-[var(--color-surface)] rounded-xl">
              <div className="flex items-center gap-3">
                <SubjectBadge subject={p.subject} />
                <div>
                  <p className="text-sm text-[var(--color-text-primary)] font-semibold">{p.displayName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{p.scheduledDay} · {p.scheduledStart}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onStart && (
                  <button
                    onClick={() => onStart(p)}
                    className="text-xs bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Start
                  </button>
                )}
                <button
                  onClick={() => onComplete(p)}
                  className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold px-2.5 py-1 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
