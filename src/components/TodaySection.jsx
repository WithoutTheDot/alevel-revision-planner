import SubjectBadge from './SubjectBadge';
import PmtLinkButton from './PmtLinkButton';
import { getPmtLinks } from '../lib/pmtLinks';

/**
 * Shows papers scheduled for today on the dashboard.
 *
 * Props:
 *   todaysPapers  — [{ paper, index }] from getTodaysPapers()
 *   onComplete    — (index) => void — opens completion modal
 *   onStartTimer  — (paper, index) => void — opens timer modal
 *   dayName       — string e.g. 'Monday'
 */
export default function TodaySection({ todaysPapers, onComplete, onStartTimer, dayName }) {
  if (!todaysPapers || todaysPapers.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-2">
          Today — {dayName}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          No papers scheduled for today. Head to the Calendar to add one, or generate a new week.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">
        Today — {dayName}
      </h2>
      <div className="flex flex-col gap-2">
        {todaysPapers.map(({ paper, index }) => {
          const pmtLinks = getPmtLinks(paper.subject, paper.paperPath);
          return (
            <div
              key={index}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 bg-[var(--color-bg)] border-[var(--color-border)] ${paper.completed ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <SubjectBadge subject={paper.subject} />
                <span className="text-sm font-medium text-[var(--color-text)] truncate">
                  {paper.displayName}
                </span>
                {paper.completed && (
                  <span className="text-xs text-[var(--color-success)] font-semibold ml-1">Done</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pmtLinks?.qp && <PmtLinkButton href={pmtLinks.qp} label="Q" paper={paper} msHref={pmtLinks.ms} />}
                {pmtLinks?.ms && <PmtLinkButton href={pmtLinks.ms} label="MS" paper={paper} />}
                {!paper.completed && (
                  <>
                    <button
                      onClick={() => onStartTimer(paper, index)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90 transition-opacity"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => onComplete(index)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[var(--color-surface)] transition-colors"
                    >
                      Log
                    </button>
                  </>
                )}
                {paper.completed && (
                  <button
                    onClick={() => onComplete(index)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] font-medium hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
